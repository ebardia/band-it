import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { analyticsService } from '../services/analytics.service'

// Helper to check if user is admin
async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })

  if (!user?.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }

  return user
}

export const analyticsRouter = router({
  /**
   * Track a page view (public endpoint for client-side tracking)
   * Can be called by anonymous users
   */
  trackPageView: publicProcedure
    .input(
      z.object({
        page: z.string().min(1).max(100),
        userId: z.string().optional(),
        referrer: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await analyticsService.trackEvent('page_viewed', {
        userId: input.userId,
        metadata: {
          page: input.page,
          referrer: input.referrer,
        },
      })
      return { success: true }
    }),

  /**
   * Get overview metrics for the analytics dashboard
   * Returns: totals, recent counts (30 days), % change from previous period
   */
  getOverview: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.userId)
      return analyticsService.getOverview()
    }),

  /**
   * Get daily trends for charts
   * Returns: array of daily stats for the last N days
   */
  getDailyTrends: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        days: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.userId)
      return analyticsService.getDailyTrends(input.days)
    }),

  /**
   * Get recent events for activity feed
   * Returns: array of recent analytics events
   */
  getRecentEvents: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(10).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.userId)
      return analyticsService.getRecentEvents(input.limit)
    }),
})
