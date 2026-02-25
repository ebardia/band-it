import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../../services/notification.service'
import { webhookService } from '../../../services/webhook.service'
import { requireGoodStanding } from '../../../lib/dues-enforcement'
import { emailService } from '../../services/email.service'

// Roles that can create events
const CAN_CREATE_EVENTS = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const createEvent = publicProcedure
  .input(z.object({
    bandId: z.string(),
    userId: z.string(),
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().optional(),
    eventType: z.enum(['ONLINE_MEETING', 'IN_PERSON_MEETING', 'SOCIAL', 'HYBRID']),

    // Timing
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    timezone: z.string().optional().default('America/New_York'),

    // Location (for in-person, social, hybrid)
    location: z.string().optional(),
    address: z.string().optional(),

    // Online meeting (for online, hybrid)
    meetingUrl: z.string().url().optional().or(z.literal('')),
    meetingId: z.string().optional(),
    meetingPassword: z.string().optional(),

    // Recurrence (RRULE format)
    recurrenceRule: z.string().optional(),
    recurrenceEndDate: z.string().datetime().optional(),

    // Reminders (hours before event)
    reminderHours: z.array(z.number().int().positive()).optional(),
  }))
  .mutation(async ({ input }) => {
    // Check dues standing
    await requireGoodStanding(input.bandId, input.userId)

    const {
      bandId, userId, title, description, eventType,
      startTime, endTime, timezone,
      location, address, meetingUrl, meetingId, meetingPassword,
      recurrenceRule, recurrenceEndDate, reminderHours
    } = input

    // Validate times
    const start = new Date(startTime)
    const end = new Date(endTime)
    if (end <= start) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'End time must be after start time'
      })
    }

    // Get band with members
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: { user: true }
        }
      }
    })

    if (!band) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Band not found'
      })
    }

    // Check user is a member with permission
    const member = band.members.find(m => m.userId === userId)
    if (!member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member to create events'
      })
    }

    if (!CAN_CREATE_EVENTS.includes(member.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to create events'
      })
    }

    // Validate event type requirements
    if (eventType === 'IN_PERSON_MEETING' || eventType === 'SOCIAL') {
      if (!location) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Location is required for in-person events'
        })
      }
    }

    if (eventType === 'ONLINE_MEETING') {
      if (!meetingUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Meeting URL is required for online events'
        })
      }
    }

    if (eventType === 'HYBRID') {
      if (!location || !meetingUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Both location and meeting URL are required for hybrid events'
        })
      }
    }

    // Create the event
    const event = await prisma.event.create({
      data: {
        bandId,
        createdById: userId,
        title,
        description,
        eventType,
        startTime: start,
        endTime: end,
        timezone,
        location,
        address,
        meetingUrl: meetingUrl || null,
        meetingId,
        meetingPassword,
        recurrenceRule,
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
        reminderHours: reminderHours || [24, 1],
      },
      include: {
        band: {
          select: { id: true, name: true, slug: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Notify band members about new event (in-app notifications)
    const notificationPromises = band.members
      .filter(m => m.userId !== userId) // Don't notify creator
      .map(m => notificationService.create({
        userId: m.userId,
        type: 'EVENT_CREATED',
        title: 'New Event Created',
        message: `"${title}" has been scheduled for ${start.toLocaleDateString()}`,
        relatedId: event.id,
        relatedType: 'event',
        actionUrl: `/bands/${band.slug}/calendar/${event.id}`,
      }))

    await Promise.all(notificationPromises)

    // Send email notifications to all band members (non-blocking)
    const emailPromises = band.members
      .filter(m => m.userId !== userId) // Don't email creator
      .map(m => emailService.sendEventCreatedEmail({
        email: m.user.email,
        memberName: m.user.name,
        eventTitle: title,
        eventType,
        startTime: start,
        endTime: end,
        location,
        meetingUrl: meetingUrl || null,
        description,
        bandName: band.name,
        bandSlug: band.slug,
        eventId: event.id,
        creatorName: event.createdBy.name,
      }).catch(err => console.error(`Failed to send event email to ${m.user.email}:`, err)))

    // Fire and forget - don't wait for emails
    Promise.all(emailPromises).catch(err =>
      console.error('Error sending event emails:', err)
    )

    // Send webhook to external website (non-blocking)
    webhookService.eventCreated(bandId, {
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: start,
      endTime: end,
      location,
    }).catch(err => console.error('Webhook error:', err))

    return { event }
  })
