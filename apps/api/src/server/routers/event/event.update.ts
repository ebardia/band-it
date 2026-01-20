import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../../services/notification.service'

// Roles that can edit/delete any event
const CAN_MANAGE_EVENTS = ['FOUNDER', 'GOVERNOR']

export const updateEvent = publicProcedure
  .input(z.object({
    eventId: z.string(),
    userId: z.string(),

    // Updateable fields
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional().nullable(),
    eventType: z.enum(['ONLINE_MEETING', 'IN_PERSON_MEETING', 'SOCIAL', 'HYBRID']).optional(),

    // Timing
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    timezone: z.string().optional(),

    // Location
    location: z.string().optional().nullable(),
    address: z.string().optional().nullable(),

    // Online meeting
    meetingUrl: z.string().url().optional().nullable().or(z.literal('')),
    meetingId: z.string().optional().nullable(),
    meetingPassword: z.string().optional().nullable(),

    // Recurrence
    recurrenceRule: z.string().optional().nullable(),
    recurrenceEndDate: z.string().datetime().optional().nullable(),

    // Meeting notes (for after meeting)
    meetingNotes: z.string().optional().nullable(),

    // Reminders
    reminderHours: z.array(z.number().int().positive()).optional(),
  }))
  .mutation(async ({ input }) => {
    const { eventId, userId, ...updates } = input

    // Get event with band info
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              include: { user: true }
            }
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

    // Check permissions: creator or FOUNDER/GOVERNOR
    const member = event.band.members.find(m => m.userId === userId)
    if (!member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member'
      })
    }

    const isCreator = event.createdById === userId
    const canManage = CAN_MANAGE_EVENTS.includes(member.role)

    if (!isCreator && !canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only edit events you created'
      })
    }

    // Validate times if both provided
    if (updates.startTime && updates.endTime) {
      const start = new Date(updates.startTime)
      const end = new Date(updates.endTime)
      if (end <= start) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'End time must be after start time'
        })
      }
    }

    // Build update data
    const updateData: any = {}

    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.eventType !== undefined) updateData.eventType = updates.eventType
    if (updates.startTime !== undefined) updateData.startTime = new Date(updates.startTime)
    if (updates.endTime !== undefined) updateData.endTime = new Date(updates.endTime)
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone
    if (updates.location !== undefined) updateData.location = updates.location
    if (updates.address !== undefined) updateData.address = updates.address
    if (updates.meetingUrl !== undefined) updateData.meetingUrl = updates.meetingUrl || null
    if (updates.meetingId !== undefined) updateData.meetingId = updates.meetingId
    if (updates.meetingPassword !== undefined) updateData.meetingPassword = updates.meetingPassword
    if (updates.recurrenceRule !== undefined) updateData.recurrenceRule = updates.recurrenceRule
    if (updates.recurrenceEndDate !== undefined) {
      updateData.recurrenceEndDate = updates.recurrenceEndDate ? new Date(updates.recurrenceEndDate) : null
    }
    if (updates.meetingNotes !== undefined) updateData.meetingNotes = updates.meetingNotes
    if (updates.reminderHours !== undefined) updateData.reminderHours = updates.reminderHours

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        band: {
          select: { id: true, name: true, slug: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Notify RSVP'd users about the update (if significant changes)
    const significantChange = updates.startTime || updates.endTime || updates.location || updates.meetingUrl
    if (significantChange) {
      const rsvps = await prisma.eventRSVP.findMany({
        where: {
          eventId,
          status: { in: ['GOING', 'MAYBE'] }
        },
        select: { userId: true }
      })

      const notificationPromises = rsvps
        .filter(r => r.userId !== userId)
        .map(r => notificationService.create({
          userId: r.userId,
          type: 'EVENT_UPDATED',
          title: 'Event Updated',
          message: `"${updatedEvent.title}" has been updated`,
          relatedId: event.id,
          relatedType: 'event',
          actionUrl: `/bands/${event.band.slug}/events/${event.id}`,
        }))

      await Promise.all(notificationPromises)
    }

    return { event: updatedEvent }
  })

export const cancelEvent = publicProcedure
  .input(z.object({
    eventId: z.string(),
    userId: z.string(),
    cancellationNote: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const { eventId, userId, cancellationNote } = input

    // Get event with band info
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' }
            }
          }
        },
        rsvps: {
          where: { status: { in: ['GOING', 'MAYBE'] } },
          select: { userId: true }
        }
      }
    })

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found'
      })
    }

    // Check permissions
    const member = event.band.members.find(m => m.userId === userId)
    if (!member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member'
      })
    }

    const isCreator = event.createdById === userId
    const canManage = CAN_MANAGE_EVENTS.includes(member.role)

    if (!isCreator && !canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only cancel events you created'
      })
    }

    // Cancel the event
    const cancelledEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        isCancelled: true,
        cancelledAt: new Date(),
        cancellationNote,
      },
      include: {
        band: {
          select: { id: true, name: true, slug: true }
        }
      }
    })

    // Notify RSVP'd users
    const notificationPromises = event.rsvps
      .filter(r => r.userId !== userId)
      .map(r => notificationService.create({
        userId: r.userId,
        type: 'EVENT_CANCELLED',
        title: 'Event Cancelled',
        message: `"${event.title}" has been cancelled${cancellationNote ? `: ${cancellationNote}` : ''}`,
        relatedId: event.id,
        relatedType: 'event',
        actionUrl: `/bands/${event.band.slug}/events/${event.id}`,
        priority: 'HIGH',
      }))

    await Promise.all(notificationPromises)

    return { event: cancelledEvent }
  })

export const deleteEvent = publicProcedure
  .input(z.object({
    eventId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { eventId, userId } = input

    // Get event with band info
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' }
            }
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

    // Check permissions - only FOUNDER/GOVERNOR can permanently delete
    const member = event.band.members.find(m => m.userId === userId)
    if (!member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member'
      })
    }

    const isCreator = event.createdById === userId
    const canManage = CAN_MANAGE_EVENTS.includes(member.role)

    // Only allow delete if event is already cancelled or if user is creator/manager
    if (!event.isCancelled && !canManage) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Event must be cancelled before deletion. Use cancel instead.'
      })
    }

    if (!isCreator && !canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only founders, governors, or the creator can delete events'
      })
    }

    // Delete the event (cascade will handle related records)
    await prisma.event.delete({
      where: { id: eventId }
    })

    return { success: true }
  })

export const createEventException = publicProcedure
  .input(z.object({
    parentEventId: z.string(),
    exceptionDate: z.string().datetime(),
    userId: z.string(),

    // All overrideable fields
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    location: z.string().optional(),
    address: z.string().optional(),
    meetingUrl: z.string().url().optional().or(z.literal('')),
    meetingId: z.string().optional(),
    meetingPassword: z.string().optional(),
    isCancelled: z.boolean().optional().default(false),
    cancellationNote: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const { parentEventId, exceptionDate, userId, isCancelled, cancellationNote, ...overrides } = input

    // Get parent event
    const parentEvent = await prisma.event.findUnique({
      where: { id: parentEventId },
      include: {
        band: {
          include: {
            members: { where: { status: 'ACTIVE' } }
          }
        }
      }
    })

    if (!parentEvent) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Parent event not found'
      })
    }

    if (!parentEvent.recurrenceRule) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Can only create exceptions for recurring events'
      })
    }

    // Check permissions
    const member = parentEvent.band.members.find(m => m.userId === userId)
    if (!member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member'
      })
    }

    const isCreator = parentEvent.createdById === userId
    const canManage = CAN_MANAGE_EVENTS.includes(member.role)

    if (!isCreator && !canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only modify events you created'
      })
    }

    // Create the exception event
    const exception = await prisma.event.create({
      data: {
        bandId: parentEvent.bandId,
        createdById: userId,
        parentEventId: parentEvent.id,
        exceptionDate: new Date(exceptionDate),

        // Use parent values as defaults, override with provided values
        title: overrides.title || parentEvent.title,
        description: overrides.description ?? parentEvent.description,
        eventType: parentEvent.eventType,
        startTime: new Date(overrides.startTime),
        endTime: new Date(overrides.endTime),
        timezone: parentEvent.timezone,
        location: overrides.location ?? parentEvent.location,
        address: overrides.address ?? parentEvent.address,
        meetingUrl: overrides.meetingUrl ?? parentEvent.meetingUrl,
        meetingId: overrides.meetingId ?? parentEvent.meetingId,
        meetingPassword: overrides.meetingPassword ?? parentEvent.meetingPassword,

        isCancelled: isCancelled,
        cancellationNote: cancellationNote,
        cancelledAt: isCancelled ? new Date() : null,
      },
      include: {
        band: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true } }
      }
    })

    return { exception }
  })
