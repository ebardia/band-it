import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { notificationService } from '../../services/notification.service'

export const notificationRouter = router({
  /**
   * Get notifications for user
   */
  getMyNotifications: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        unreadOnly: z.boolean().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const notifications = await notificationService.getForUser(input.userId, {
        unreadOnly: input.unreadOnly,
        limit: input.limit,
      })

      return {
        success: true,
        notifications,
      }
    }),

  /**
   * Get unread count
   */
  getUnreadCount: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const count = await notificationService.getUnreadCount(input.userId)

      return {
        success: true,
        count,
      }
    }),

  /**
   * Mark notification as read
   */
  markAsRead: publicProcedure
    .input(
      z.object({
        notificationId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await notificationService.markAsRead(input.notificationId, input.userId)

      return {
        success: true,
        message: 'Notification marked as read',
      }
    }),

  /**
   * Mark all as read
   */
  markAllAsRead: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await notificationService.markAllAsRead(input.userId)

      return {
        success: true,
        message: 'All notifications marked as read',
      }
    }),

  /**
   * Archive notification
   */
  archive: publicProcedure
    .input(
      z.object({
        notificationId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await notificationService.archive(input.notificationId, input.userId)

      return {
        success: true,
        message: 'Notification archived',
      }
    }),
})