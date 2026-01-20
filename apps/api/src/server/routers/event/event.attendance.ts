import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../../services/notification.service'

// Roles that can mark attendance for others
const CAN_MARK_ATTENDANCE = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

export const markAttendance = publicProcedure
  .input(z.object({
    eventId: z.string(),
    userId: z.string(), // User whose attendance is being marked
    markedById: z.string(), // User marking the attendance
    occurrenceDate: z.string().datetime().optional(), // For recurring events
    attended: z.boolean(),
    arrivedAt: z.string().datetime().optional(),
    leftAt: z.string().datetime().optional(),
    notes: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const { eventId, userId, markedById, occurrenceDate, attended, arrivedAt, leftAt, notes } = input

    // Get event with band info
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        band: {
          include: {
            members: { where: { status: 'ACTIVE' } }
          }
        }
      }
    })

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found'
      })
    }

    // Check marker is a band member
    const markerMember = event.band.members.find(m => m.userId === markedById)
    if (!markerMember) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member to mark attendance'
      })
    }

    // If marking someone else's attendance, need elevated permissions
    if (userId !== markedById && !CAN_MARK_ATTENDANCE.includes(markerMember.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to mark attendance for others'
      })
    }

    // Verify target user is a band member
    const targetMember = event.band.members.find(m => m.userId === userId)
    if (!targetMember) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'User must be a band member'
      })
    }

    // For recurring events, occurrenceDate is required
    const occDate = occurrenceDate ? new Date(occurrenceDate) : null
    if (event.recurrenceRule && !occDate) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Occurrence date is required for recurring events'
      })
    }

    // Check if attendance already exists
    const existingAttendance = await prisma.eventAttendance.findFirst({
      where: {
        eventId,
        userId,
        occurrenceDate: occDate,
      }
    })

    let attendance
    if (existingAttendance) {
      // Update existing
      attendance = await prisma.eventAttendance.update({
        where: { id: existingAttendance.id },
        data: {
          attended,
          arrivedAt: arrivedAt ? new Date(arrivedAt) : null,
          leftAt: leftAt ? new Date(leftAt) : null,
          notes,
          markedById,
        },
        include: {
          user: { select: { id: true, name: true } },
          markedBy: { select: { id: true, name: true } },
          event: { select: { id: true, title: true } }
        }
      })
    } else {
      // Create new
      attendance = await prisma.eventAttendance.create({
        data: {
          eventId,
          userId,
          occurrenceDate: occDate,
          attended,
          arrivedAt: arrivedAt ? new Date(arrivedAt) : null,
          leftAt: leftAt ? new Date(leftAt) : null,
          notes,
          markedById,
        },
        include: {
          user: { select: { id: true, name: true } },
          markedBy: { select: { id: true, name: true } },
          event: { select: { id: true, title: true } }
        }
      })

      // Notify user if someone else marked their attendance
      if (userId !== markedById) {
        await notificationService.create({
          userId,
          type: 'EVENT_ATTENDANCE_MARKED',
          title: 'Attendance Marked',
          message: `Your attendance for "${event.title}" was marked by ${attendance.markedBy.name}`,
          relatedId: event.id,
          relatedType: 'event',
          actionUrl: `/bands/${event.band.slug}/events/${event.id}`,
        })
      }
    }

    return { attendance }
  })

export const getAttendance = publicProcedure
  .input(z.object({
    eventId: z.string(),
    occurrenceDate: z.string().datetime().optional(),
  }))
  .query(async ({ input }) => {
    const { eventId, occurrenceDate } = input

    const occDate = occurrenceDate ? new Date(occurrenceDate) : null

    const attendance = await prisma.eventAttendance.findMany({
      where: {
        eventId,
        ...(occDate && { occurrenceDate: occDate }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        markedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Summary
    const summary = {
      total: attendance.length,
      attended: attendance.filter(a => a.attended).length,
      absent: attendance.filter(a => !a.attended).length,
    }

    return { attendance, summary }
  })

export const bulkMarkAttendance = publicProcedure
  .input(z.object({
    eventId: z.string(),
    markedById: z.string(),
    occurrenceDate: z.string().datetime().optional(),
    attendees: z.array(z.object({
      userId: z.string(),
      attended: z.boolean(),
      notes: z.string().optional(),
    })),
  }))
  .mutation(async ({ input }) => {
    const { eventId, markedById, occurrenceDate, attendees } = input

    // Get event with band info
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        band: {
          include: {
            members: { where: { status: 'ACTIVE' } }
          }
        }
      }
    })

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found'
      })
    }

    // Check marker permissions
    const markerMember = event.band.members.find(m => m.userId === markedById)
    if (!markerMember || !CAN_MARK_ATTENDANCE.includes(markerMember.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to mark bulk attendance'
      })
    }

    const occDate = occurrenceDate ? new Date(occurrenceDate) : null

    // Process each attendee
    const results = await Promise.all(
      attendees.map(async ({ userId, attended, notes }) => {
        // Verify user is a member
        const isMember = event.band.members.some(m => m.userId === userId)
        if (!isMember) return null

        // Upsert attendance
        const existingAttendance = await prisma.eventAttendance.findFirst({
          where: { eventId, userId, occurrenceDate: occDate }
        })

        if (existingAttendance) {
          return prisma.eventAttendance.update({
            where: { id: existingAttendance.id },
            data: { attended, notes, markedById }
          })
        }

        return prisma.eventAttendance.create({
          data: {
            eventId,
            userId,
            occurrenceDate: occDate,
            attended,
            notes,
            markedById,
          }
        })
      })
    )

    const validResults = results.filter(Boolean)

    return { count: validResults.length }
  })

export const getMemberAttendanceHistory = publicProcedure
  .input(z.object({
    userId: z.string(),
    bandId: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional().default(50),
  }))
  .query(async ({ input }) => {
    const { userId, bandId, limit } = input

    const attendance = await prisma.eventAttendance.findMany({
      where: {
        userId,
        ...(bandId && { event: { bandId } }),
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            band: { select: { id: true, name: true, slug: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Calculate stats
    const stats = {
      total: attendance.length,
      attended: attendance.filter(a => a.attended).length,
      absent: attendance.filter(a => !a.attended).length,
      attendanceRate: attendance.length > 0
        ? Math.round((attendance.filter(a => a.attended).length / attendance.length) * 100)
        : 0,
    }

    return { attendance, stats }
  })
