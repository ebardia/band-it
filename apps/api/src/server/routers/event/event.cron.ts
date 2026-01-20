import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { eventReminderService } from '../../services/event-reminder.service'
import { TRPCError } from '@trpc/server'

// Simple API key check for cron jobs
// In production, use a proper secret from environment variables
const CRON_SECRET = process.env.CRON_SECRET || 'development-cron-secret'

export const processEventReminders = publicProcedure
  .input(z.object({
    secret: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { secret } = input

    // Verify cron secret
    if (secret !== CRON_SECRET) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid cron secret'
      })
    }

    const result = await eventReminderService.processReminders()

    return {
      success: true,
      processed: result.processed,
      notificationsSent: result.notifications,
      timestamp: new Date().toISOString()
    }
  })

export const getPendingReminders = publicProcedure
  .input(z.object({
    secret: z.string(),
    windowMinutes: z.number().int().min(1).max(1440).optional().default(60),
  }))
  .query(async ({ input }) => {
    const { secret, windowMinutes } = input

    // Verify cron secret
    if (secret !== CRON_SECRET) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid cron secret'
      })
    }

    const pending = await eventReminderService.getPendingReminders(windowMinutes)

    return { pending, count: pending.length }
  })
