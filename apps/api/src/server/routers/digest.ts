import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { verifyUnsubscribeToken } from '../../lib/digest-token'

export const digestRouter = router({
  /**
   * Get digest preferences for current user
   */
  getPreferences: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          digestFrequency: true,
          digestWeeklyDay: true,
        },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      return {
        frequency: user.digestFrequency,
        weeklyDay: user.digestWeeklyDay,
      }
    }),

  /**
   * Update digest preferences
   */
  updatePreferences: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        frequency: z.enum(['DAILY', 'EVERY_OTHER_DAY', 'WEEKLY', 'NEVER']),
        weeklyDay: z.number().min(0).max(6).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, frequency, weeklyDay } = input

      // Validate weeklyDay is provided for WEEKLY frequency
      if (frequency === 'WEEKLY' && weeklyDay === undefined) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Weekly day is required for weekly frequency',
        })
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          digestFrequency: frequency,
          digestWeeklyDay: frequency === 'WEEKLY' ? weeklyDay : null,
        },
        select: {
          digestFrequency: true,
          digestWeeklyDay: true,
        },
      })

      return {
        success: true,
        frequency: user.digestFrequency,
        weeklyDay: user.digestWeeklyDay,
      }
    }),

  /**
   * Unsubscribe from digest emails using token
   * This is a public procedure - no auth required
   */
  unsubscribe: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const userId = verifyUnsubscribeToken(input.token)

      if (!userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired unsubscribe link',
        })
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          digestFrequency: 'NEVER',
        },
      })

      return {
        success: true,
        message: 'You have been unsubscribed from digest emails',
      }
    }),
})
