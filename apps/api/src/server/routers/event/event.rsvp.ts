import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../../services/notification.service'

export const setRSVP = publicProcedure
  .input(z.object({
    eventId: z.string(),
    userId: z.string(),
    status: z.enum(['GOING', 'NOT_GOING', 'MAYBE']),
    note: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const { eventId, userId, status, note } = input

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

    if (event.isCancelled) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot RSVP to a cancelled event'
      })
    }

    // Check user is a band member
    const member = event.band.members.find(m => m.userId === userId)
    if (!member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member to RSVP'
      })
    }

    // Check if RSVP already exists
    const existingRSVP = await prisma.eventRSVP.findUnique({
      where: {
        eventId_userId: { eventId, userId }
      }
    })

    let rsvp
    if (existingRSVP) {
      // Update existing RSVP
      rsvp = await prisma.eventRSVP.update({
        where: { id: existingRSVP.id },
        data: { status, note },
        include: {
          user: { select: { id: true, name: true, email: true } },
          event: { select: { id: true, title: true } }
        }
      })
    } else {
      // Create new RSVP
      rsvp = await prisma.eventRSVP.create({
        data: {
          eventId,
          userId,
          status,
          note,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          event: { select: { id: true, title: true } }
        }
      })

      // Notify event creator about new RSVP
      if (event.createdById !== userId && status === 'GOING') {
        await notificationService.create({
          userId: event.createdById,
          type: 'EVENT_RSVP_RECEIVED',
          title: 'New RSVP',
          message: `${rsvp.user.name} is going to "${event.title}"`,
          relatedId: event.id,
          relatedType: 'event',
          actionUrl: `/bands/${event.band.slug}/events/${event.id}`,
        })
      }
    }

    return { rsvp }
  })

export const removeRSVP = publicProcedure
  .input(z.object({
    eventId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { eventId, userId } = input

    // Get event to verify it exists
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

    // Verify user is a member
    const member = event.band.members.find(m => m.userId === userId)
    if (!member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member'
      })
    }

    // Delete RSVP if exists
    await prisma.eventRSVP.deleteMany({
      where: { eventId, userId }
    })

    return { success: true }
  })

export const getRSVPs = publicProcedure
  .input(z.object({
    eventId: z.string(),
    status: z.enum(['GOING', 'NOT_GOING', 'MAYBE']).optional(),
  }))
  .query(async ({ input }) => {
    const { eventId, status } = input

    const rsvps = await prisma.eventRSVP.findMany({
      where: {
        eventId,
        ...(status && { status }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Group by status
    const grouped = {
      going: rsvps.filter(r => r.status === 'GOING'),
      notGoing: rsvps.filter(r => r.status === 'NOT_GOING'),
      maybe: rsvps.filter(r => r.status === 'MAYBE'),
    }

    return { rsvps, grouped }
  })
