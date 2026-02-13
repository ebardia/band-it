import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'

export const getEventsByBand = publicProcedure
  .input(z.object({
    bandId: z.string(),
    // Filter options
    eventType: z.enum(['ONLINE_MEETING', 'IN_PERSON_MEETING', 'SOCIAL', 'HYBRID']).optional(),
    startAfter: z.string().datetime().optional(),
    startBefore: z.string().datetime().optional(),
    includeCancelled: z.boolean().optional().default(false),
    // Pagination
    limit: z.number().int().min(1).max(100).optional().default(50),
    cursor: z.string().optional(),
  }))
  .query(async ({ input }) => {
    const { bandId, eventType, startAfter, startBefore, includeCancelled, limit, cursor } = input

    const events = await prisma.event.findMany({
      where: {
        bandId,
        parentEventId: null, // Only get main events, not exceptions
        ...(eventType && { eventType }),
        ...(startAfter && { startTime: { gte: new Date(startAfter) } }),
        ...(startBefore && { startTime: { lte: new Date(startBefore) } }),
        ...(!includeCancelled && { isCancelled: false }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: {
            rsvps: true,
            attendance: true,
            files: true,
          }
        }
      },
      orderBy: { startTime: 'asc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    })

    let nextCursor: string | undefined
    if (events.length > limit) {
      const nextItem = events.pop()
      nextCursor = nextItem?.id
    }

    return { events, nextCursor }
  })

export const getUpcomingEvents = publicProcedure
  .input(z.object({
    bandId: z.string(),
    limit: z.number().int().min(1).max(20).optional().default(10),
  }))
  .query(async ({ input }) => {
    const { bandId, limit } = input

    const events = await prisma.event.findMany({
      where: {
        bandId,
        parentEventId: null,
        isCancelled: false,
        startTime: { gte: new Date() },
      },
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        _count: {
          select: { rsvps: true }
        }
      },
      orderBy: { startTime: 'asc' },
      take: limit,
    })

    return { events }
  })

export const getEventById = publicProcedure
  .input(z.object({
    eventId: z.string(),
    userId: z.string().optional(), // To get user's RSVP status
  }))
  .query(async ({ input }) => {
    const { eventId, userId } = input

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        band: {
          select: { id: true, name: true, slug: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        exceptions: {
          orderBy: { exceptionDate: 'asc' }
        },
        rsvps: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        attendance: {
          include: {
            user: {
              select: { id: true, name: true }
            },
            markedBy: {
              select: { id: true, name: true }
            }
          },
          orderBy: { occurrenceDate: 'desc' }
        },
        files: {
          include: {
            uploadedBy: {
              select: { id: true, name: true, deletedAt: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found'
      })
    }

    // Get user's RSVP if userId provided
    let userRSVP = null
    if (userId) {
      userRSVP = event.rsvps.find(r => r.userId === userId) || null
    }

    // Count RSVPs by status
    const rsvpCounts = {
      going: event.rsvps.filter(r => r.status === 'GOING').length,
      notGoing: event.rsvps.filter(r => r.status === 'NOT_GOING').length,
      maybe: event.rsvps.filter(r => r.status === 'MAYBE').length,
    }

    return { event, userRSVP, rsvpCounts }
  })

export const getMyEvents = publicProcedure
  .input(z.object({
    userId: z.string(),
    // Get events where user is GOING
    onlyGoing: z.boolean().optional().default(false),
    // Filter by time
    startAfter: z.string().datetime().optional(),
    startBefore: z.string().datetime().optional(),
    limit: z.number().int().min(1).max(100).optional().default(50),
  }))
  .query(async ({ input }) => {
    const { userId, onlyGoing, startAfter, startBefore, limit } = input

    // Get user's band memberships
    const memberships = await prisma.member.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { bandId: true }
    })

    const bandIds = memberships.map(m => m.bandId)

    if (bandIds.length === 0) {
      return { events: [] }
    }

    // Build base query
    const baseWhere = {
      bandId: { in: bandIds },
      parentEventId: null,
      isCancelled: false,
      ...(startAfter && { startTime: { gte: new Date(startAfter) } }),
      ...(startBefore && { startTime: { lte: new Date(startBefore) } }),
    }

    if (onlyGoing) {
      // Get events where user RSVP'd as GOING
      const events = await prisma.event.findMany({
        where: {
          ...baseWhere,
          rsvps: {
            some: {
              userId,
              status: 'GOING'
            }
          }
        },
        include: {
          band: {
            select: { id: true, name: true, slug: true }
          },
          rsvps: {
            where: { userId },
            take: 1
          }
        },
        orderBy: { startTime: 'asc' },
        take: limit,
      })

      return { events }
    }

    // Get all events from user's bands
    const events = await prisma.event.findMany({
      where: baseWhere,
      include: {
        band: {
          select: { id: true, name: true, slug: true }
        },
        rsvps: {
          where: { userId },
          take: 1
        }
      },
      orderBy: { startTime: 'asc' },
      take: limit,
    })

    return { events }
  })
