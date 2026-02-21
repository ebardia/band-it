import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../../services/notification.service'

// Schema for recording links
const recordingLinkSchema = z.object({
  url: z.string().url(),
  label: z.string().max(100).optional(),
})

/**
 * Update meeting notes and/or recording links
 * Any band member can add/edit notes
 * Notifications are sent before/after the meeting, but not during
 */
export const updateEventNotes = publicProcedure
  .input(z.object({
    eventId: z.string(),
    userId: z.string(),
    meetingNotes: z.string().optional().nullable(),
    recordingLinks: z.array(recordingLinkSchema).optional().nullable(),
  }))
  .mutation(async ({ input }) => {
    const { eventId, userId, meetingNotes, recordingLinks } = input

    // Get event with band members
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              select: { userId: true }
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

    // Check user is a band member
    const isMember = event.band.members.some(m => m.userId === userId)
    if (!isMember) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member to add notes'
      })
    }

    // Build update data
    const updateData: any = {}
    if (meetingNotes !== undefined) {
      updateData.meetingNotes = meetingNotes
    }
    if (recordingLinks !== undefined) {
      updateData.recordingLinks = recordingLinks
    }

    // Check if we're actually updating anything
    if (Object.keys(updateData).length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No updates provided'
      })
    }

    // Update the event
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        band: {
          select: { id: true, name: true, slug: true }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      }
    })

    // Determine if we should send notifications
    // Skip if current time is during the meeting (between start and end)
    const now = new Date()
    const isDuringMeeting = now >= event.startTime && now <= event.endTime

    if (!isDuringMeeting) {
      // Determine notification type based on timing
      const isBeforeMeeting = now < event.startTime
      const notificationTitle = isBeforeMeeting ? 'Meeting Agenda Added' : 'Meeting Notes Posted'

      let message = ''
      const linksCount = recordingLinks?.length ?? 0
      if (meetingNotes !== undefined && linksCount > 0) {
        message = `Notes and recording${linksCount > 1 ? 's' : ''} have been added to "${event.title}"`
      } else if (linksCount > 0) {
        message = `Recording${linksCount > 1 ? 's' : ''} added to "${event.title}"`
      } else {
        message = isBeforeMeeting
          ? `Agenda has been added to "${event.title}"`
          : `Notes have been posted for "${event.title}"`
      }

      // Notify all band members except the one making the update
      const notificationPromises = event.band.members
        .filter(m => m.userId !== userId)
        .map(m => notificationService.create({
          userId: m.userId,
          type: 'EVENT_UPDATED',
          title: notificationTitle,
          message,
          relatedId: event.id,
          relatedType: 'event',
          actionUrl: `/bands/${updatedEvent.band.slug}/calendar/${event.id}`,
          priority: isBeforeMeeting ? 'MEDIUM' : 'LOW',
        }))

      await Promise.all(notificationPromises)
    }

    return { event: updatedEvent }
  })
