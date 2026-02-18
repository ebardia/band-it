import { prisma } from '../../lib/prisma'
import { notificationService } from '../../services/notification.service'

/**
 * Event Reminder Service
 *
 * Sends reminder notifications to event attendees before events start.
 * Should be called by a cron job (e.g., every 15 minutes)
 */
export const eventReminderService = {
  /**
   * Process all pending event reminders
   *
   * Checks for events that:
   * 1. Have not been cancelled
   * 2. Have not had this reminder hour sent yet
   * 3. Are within the reminder window
   */
  async processReminders(): Promise<{ processed: number; notifications: number }> {
    const now = new Date()
    let processed = 0
    let notificationCount = 0

    // Get all non-cancelled events that haven't passed yet
    const events = await prisma.event.findMany({
      where: {
        isCancelled: false,
        parentEventId: null, // Only main events, not exceptions
        startTime: { gt: now },
      },
      include: {
        band: {
          select: { id: true, name: true, slug: true }
        },
        rsvps: {
          where: { status: { in: ['GOING', 'MAYBE'] } },
          select: { userId: true }
        }
      }
    })

    for (const event of events) {
      // Check each reminder hour
      for (const reminderHour of event.reminderHours) {
        const reminderTime = new Date(event.startTime.getTime() - (reminderHour * 60 * 60 * 1000))

        // If we're within 15 minutes of the reminder time (cron window)
        const timeDiff = reminderTime.getTime() - now.getTime()
        const isWithinWindow = timeDiff >= 0 && timeDiff <= 15 * 60 * 1000

        // Check if this reminder was already sent
        const alreadySent = event.lastReminderSentAt &&
          event.lastReminderSentAt >= new Date(reminderTime.getTime() - 5 * 60 * 1000)

        if (isWithinWindow && !alreadySent) {
          // Send reminders to all RSVP'd users
          const timeUntil = formatTimeUntil(event.startTime)

          const notificationPromises = event.rsvps.map(rsvp =>
            notificationService.create({
              userId: rsvp.userId,
              type: 'EVENT_REMINDER',
              title: 'Event Reminder',
              message: `"${event.title}" is starting in ${timeUntil}`,
              relatedId: event.id,
              relatedType: 'event',
              actionUrl: `/bands/${event.band.slug}/calendar/${event.id}`,
            })
          )

          await Promise.all(notificationPromises)
          notificationCount += notificationPromises.length

          // Update last reminder sent time
          await prisma.event.update({
            where: { id: event.id },
            data: { lastReminderSentAt: now }
          })

          processed++
        }
      }
    }

    return { processed, notifications: notificationCount }
  },

  /**
   * Get events that need reminders in the next check window
   * Useful for debugging/monitoring
   */
  async getPendingReminders(windowMinutes: number = 60): Promise<any[]> {
    const now = new Date()
    const windowEnd = new Date(now.getTime() + windowMinutes * 60 * 1000)

    const events = await prisma.event.findMany({
      where: {
        isCancelled: false,
        parentEventId: null,
        startTime: { gt: now },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        reminderHours: true,
        lastReminderSentAt: true,
        _count: { select: { rsvps: true } }
      }
    })

    const pending = []

    for (const event of events) {
      for (const reminderHour of event.reminderHours) {
        const reminderTime = new Date(event.startTime.getTime() - (reminderHour * 60 * 60 * 1000))

        if (reminderTime >= now && reminderTime <= windowEnd) {
          pending.push({
            eventId: event.id,
            title: event.title,
            startTime: event.startTime,
            reminderHour,
            reminderTime,
            rsvpCount: event._count.rsvps,
          })
        }
      }
    }

    return pending.sort((a, b) => a.reminderTime.getTime() - b.reminderTime.getTime())
  }
}

/**
 * Format time until event in human-readable format
 */
function formatTimeUntil(eventTime: Date): string {
  const now = new Date()
  const diff = eventTime.getTime() - now.getTime()

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''}`
  }

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }

  return `${minutes} minute${minutes > 1 ? 's' : ''}`
}
