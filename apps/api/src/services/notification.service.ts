import { prisma } from '../lib/prisma'
import { NotificationType, NotificationPriority } from '@prisma/client'
import { isInGoodStanding } from '../lib/dues-enforcement'

// Band activity notification types that should be suppressed for unpaid members
const BAND_ACTIVITY_TYPES: NotificationType[] = [
  'PROPOSAL_CREATED',
  'PROPOSAL_VOTE_NEEDED',
  'PROPOSAL_APPROVED',
  'PROPOSAL_REJECTED',
  'PROPOSAL_CLOSED',
  'PROJECT_CREATED',
  'PROJECT_STATUS_CHANGED',
  'TASK_CREATED',
  'TASK_ASSIGNED',
  'TASK_STATUS_CHANGED',
  'TASK_COMPLETED',
  'TASK_VERIFICATION_NEEDED',
  'TASK_VERIFIED',
  'TASK_REJECTED',
  'EVENT_CREATED',
  'EVENT_UPDATED',
  'EVENT_CANCELLED',
  'EVENT_REMINDER',
  'EVENT_RSVP_RECEIVED',
  'EVENT_ATTENDANCE_MARKED',
  'BAND_DETAILS_UPDATED',
]

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title?: string
  message?: string
  actionUrl?: string
  priority?: NotificationPriority
  metadata?: any
  relatedId?: string
  relatedType?: string
  bandId?: string // When provided, suppresses band activity notifications for unpaid members
}

export const notificationService = {
  /**
   * Create a notification for a user
   */
  async create(params: CreateNotificationParams) {
    // Check user preferences
    const preference = await prisma.notificationPreference.findUnique({
      where: {
        userId_type: {
          userId: params.userId,
          type: params.type,
        },
      },
    })

    // If user has disabled this notification type in-app, don't create it
    if (preference && !preference.inApp) {
      return null
    }

    // Suppress band activity notifications for members not in good standing
    if (params.bandId && BAND_ACTIVITY_TYPES.includes(params.type)) {
      const goodStanding = await isInGoodStanding(params.bandId, params.userId)
      if (!goodStanding) {
        return null
      }
    }

    // Get template if title/message not provided
    let title = params.title
    let message = params.message

    if (!title || !message) {
      const template = await prisma.notificationTemplate.findUnique({
        where: { type: params.type },
      })

      if (template) {
        title = title || template.title
        message = message || template.message

        // Replace variables in template
        if (params.metadata) {
          Object.keys(params.metadata).forEach((key) => {
            const value = params.metadata[key]
            title = title?.replace(`{${key}}`, value)
            message = message?.replace(`{${key}}`, value)
          })
        }
      }
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: title || 'Notification',
        message,
        actionUrl: params.actionUrl,
        priority: params.priority || NotificationPriority.MEDIUM,
        metadata: params.metadata,
        relatedId: params.relatedId,
        relatedType: params.relatedType,
      },
    })

    // TODO: Emit WebSocket event here
    // io.to(`user-${params.userId}`).emit('notification', notification)

    return notification
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return notification
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    const notifications = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return notifications
  },

  /**
   * Archive notification
   */
  async archive(notificationId: string, userId: string) {
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    })

    return notification
  },

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
        isArchived: false,
      },
    })

    return count
  },

  /**
   * Get notifications for user
   */
  async getForUser(userId: string, options?: {
    unreadOnly?: boolean
    limit?: number
    type?: NotificationType
  }) {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        isRead: options?.unreadOnly ? false : undefined,
        isArchived: false,
        type: options?.type,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit,
    })

    return notifications
  },
}