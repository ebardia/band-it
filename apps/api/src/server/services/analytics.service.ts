import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'

export type AnalyticsEventType =
  | 'user_registered'
  | 'user_signed_in'
  | 'band_created'
  | 'proposal_created'
  | 'task_completed'

interface TrackEventOptions {
  userId?: string
  sessionId?: string
  metadata?: Prisma.InputJsonValue
}

/**
 * Analytics tracking service
 * Provides server-side event tracking for key user actions
 */
export const analyticsService = {
  /**
   * Track an analytics event and increment the daily stat counter
   * Fails silently to not break user flows
   */
  async trackEvent(
    eventType: AnalyticsEventType,
    options: TrackEventOptions = {}
  ): Promise<void> {
    try {
      // Write the event
      await prisma.analyticsEvent.create({
        data: {
          eventType,
          userId: options.userId,
          sessionId: options.sessionId,
          metadata: options.metadata,
        },
      })

      // Increment the daily stat
      await this.incrementDailyStat(eventType)
    } catch (error) {
      // Fail silently - analytics should never break user flows
      console.error(`[Analytics] Failed to track event ${eventType}:`, error)
    }
  },

  /**
   * Increment the daily stat counter for an event type
   * Uses upsert to create or update the daily stats row
   */
  async incrementDailyStat(eventType: AnalyticsEventType): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Map event types to daily stat fields
    const fieldMap: Record<AnalyticsEventType, string> = {
      user_registered: 'registrations',
      user_signed_in: 'signIns',
      band_created: 'bandsCreated',
      proposal_created: 'proposalsCreated',
      task_completed: 'tasksCompleted',
    }

    const field = fieldMap[eventType]
    if (!field) return

    try {
      await prisma.dailyStats.upsert({
        where: { date: today },
        create: {
          date: today,
          [field]: 1,
        },
        update: {
          [field]: { increment: 1 },
        },
      })
    } catch (error) {
      console.error(`[Analytics] Failed to increment daily stat for ${eventType}:`, error)
    }
  },

  /**
   * Get the overview stats for the analytics dashboard
   */
  async getOverview() {
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const previousThirtyDaysStart = new Date()
    previousThirtyDaysStart.setDate(previousThirtyDaysStart.getDate() - 60)

    // Get totals
    const [totalUsers, totalBands, totalProposals, totalTasks] = await Promise.all([
      prisma.user.count(),
      prisma.band.count(),
      prisma.proposal.count(),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
    ])

    // Get recent counts (last 30 days)
    const [recentRegistrations, recentBands, recentProposals, recentTasks] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.band.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.proposal.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.task.count({ where: { completedAt: { gte: thirtyDaysAgo } } }),
    ])

    // Get previous 30 days counts (for % change)
    const [prevRegistrations, prevBands, prevProposals, prevTasks] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { gte: previousThirtyDaysStart, lt: thirtyDaysAgo } },
      }),
      prisma.band.count({
        where: { createdAt: { gte: previousThirtyDaysStart, lt: thirtyDaysAgo } },
      }),
      prisma.proposal.count({
        where: { createdAt: { gte: previousThirtyDaysStart, lt: thirtyDaysAgo } },
      }),
      prisma.task.count({
        where: { completedAt: { gte: previousThirtyDaysStart, lt: thirtyDaysAgo } },
      }),
    ])

    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    return {
      totals: {
        users: totalUsers,
        bands: totalBands,
        proposals: totalProposals,
        tasksCompleted: totalTasks,
      },
      recent: {
        registrations: recentRegistrations,
        bands: recentBands,
        proposals: recentProposals,
        tasksCompleted: recentTasks,
      },
      changes: {
        registrations: calculateChange(recentRegistrations, prevRegistrations),
        bands: calculateChange(recentBands, prevBands),
        proposals: calculateChange(recentProposals, prevProposals),
        tasksCompleted: calculateChange(recentTasks, prevTasks),
      },
    }
  },

  /**
   * Get daily trends for the last N days
   */
  async getDailyTrends(days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const stats = await prisma.dailyStats.findMany({
      where: { date: { gte: startDate } },
      orderBy: { date: 'asc' },
    })

    // Fill in missing days with zeros
    const result: Array<{
      date: string
      registrations: number
      signIns: number
      bandsCreated: number
      proposalsCreated: number
      tasksCompleted: number
    }> = []

    const current = new Date(startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0]
      const stat = stats.find(
        (s) => s.date.toISOString().split('T')[0] === dateStr
      )

      result.push({
        date: dateStr,
        registrations: stat?.registrations ?? 0,
        signIns: stat?.signIns ?? 0,
        bandsCreated: stat?.bandsCreated ?? 0,
        proposalsCreated: stat?.proposalsCreated ?? 0,
        tasksCompleted: stat?.tasksCompleted ?? 0,
      })

      current.setDate(current.getDate() + 1)
    }

    return result
  },

  /**
   * Get recent events for activity feed
   */
  async getRecentEvents(limit: number = 50) {
    const events = await prisma.analyticsEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      userId: event.userId,
      metadata: event.metadata,
      createdAt: event.createdAt,
    }))
  },
}
