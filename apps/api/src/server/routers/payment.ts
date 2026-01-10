import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { stripeService } from '../services/stripe.service'
import { prisma } from '../../lib/prisma'

export const paymentRouter = router({
  /**
   * Create checkout session
   */
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          email: true,
          name: true,
        },
      })

      if (!user) {
        throw new Error('User not found')
      }

      const result = await stripeService.createSubscription(
        input.userId,
        user.email,
        user.name
      )

      return {
        success: true,
        sessionId: result.sessionId,
        url: result.url,
      }
    }),

  /**
   * Verify payment after checkout
   */
  verifyPayment: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await stripeService.verifyPayment(input.sessionId)

      return {
        success: result.success,
        userId: result.userId,
      }
    }),

  /**
   * Get subscription status
   */
  getSubscriptionStatus: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          subscriptionStatus: true,
          subscriptionStartedAt: true,
        },
      })

      return {
        status: user?.subscriptionStatus || 'INCOMPLETE',
        startedAt: user?.subscriptionStartedAt,
      }
    }),
})