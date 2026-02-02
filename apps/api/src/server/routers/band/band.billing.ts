import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { bandBillingService } from '../../services/band-billing.service'
import { TRPCError } from '@trpc/server'
import { checkGoodStanding } from '../../../lib/dues-enforcement'
import { MIN_MEMBERS_TO_ACTIVATE } from '@band-it/shared'

export const bandBillingRouter = router({
  /**
   * Get billing info for a band
   */
  getBillingInfo: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Verify user is a member
      const member = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
        select: { status: true },
      })

      if (!member || member.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member to view billing info',
        })
      }

      const billingInfo = await bandBillingService.getBillingInfo(input.bandId)

      return {
        success: true,
        ...billingInfo,
      }
    }),

  /**
   * Create checkout session for initial payment
   * Only billing owner can do this
   */
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await bandBillingService.createCheckoutSession(
          input.bandId,
          input.userId
        )

        return {
          success: true,
          url: result.url,
          sessionId: result.sessionId,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error instanceof Error ? error.message : 'Failed to create checkout session',
        })
      }
    }),

  /**
   * Create portal session for managing payment methods
   * Only billing owner can do this
   */
  createPortalSession: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await bandBillingService.createPortalSession(
          input.bandId,
          input.userId
        )

        return {
          success: true,
          url: result.url,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error instanceof Error ? error.message : 'Failed to create portal session',
        })
      }
    }),

  /**
   * Claim billing ownership (self-service)
   * Any active member can claim if there's no current owner
   */
  claimBillingOwnership: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await bandBillingService.claimBillingOwnership(input.bandId, input.userId)

        return {
          success: true,
          message: 'You are now the billing owner',
        }
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Failed to claim billing ownership',
        })
      }
    }),

  /**
   * Transfer billing ownership to another member
   * Only current billing owner can do this
   */
  transferBillingOwnership: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(), // Current owner
        newOwnerId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await bandBillingService.transferBillingOwnership(
          input.bandId,
          input.userId,
          input.newOwnerId
        )

        // Get new owner name for response
        const newOwner = await prisma.user.findUnique({
          where: { id: input.newOwnerId },
          select: { name: true },
        })

        return {
          success: true,
          message: `Billing ownership transferred to ${newOwner?.name}`,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Failed to transfer billing ownership',
        })
      }
    }),

  /**
   * Check if band needs payment
   * Returns status and whether current user is billing owner
   */
  getPaymentStatus: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const band = await prisma.band.findUnique({
        where: { id: input.bandId },
        select: {
          status: true,
          billingStatus: true,
          billingOwnerId: true,
          gracePeriodEndsAt: true,
          billingOwner: {
            select: { id: true, name: true },
          },
          members: {
            where: { status: 'ACTIVE' },
            select: { id: true },
          },
        },
      })

      if (!band) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Band not found',
        })
      }

      const isBillingOwner = band.billingOwnerId === input.userId
      const memberCount = band.members.length
      const needsPayment = band.billingStatus === 'PENDING'
      const isPastDue = band.billingStatus === 'PAST_DUE'
      const isInactive = band.status === 'INACTIVE'
      const noBillingOwner = !band.billingOwnerId && memberCount >= MIN_MEMBERS_TO_ACTIVATE

      let gracePeriodDaysLeft = null
      if (band.gracePeriodEndsAt) {
        gracePeriodDaysLeft = Math.max(
          0,
          Math.ceil((band.gracePeriodEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        )
      }

      return {
        success: true,
        bandStatus: band.status,
        billingStatus: band.billingStatus,
        isBillingOwner,
        billingOwnerName: band.billingOwner?.name || null,
        memberCount,
        needsPayment,
        isPastDue,
        isInactive,
        noBillingOwner,
        gracePeriodDaysLeft,
        priceAmount: memberCount >= 21 ? 100 : 20,
      }
    }),

  /**
   * Get list of eligible billing owner candidates
   * (active members who can claim ownership)
   */
  getBillingOwnerCandidates: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Verify user is a member
      const member = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
        select: { status: true },
      })

      if (!member || member.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member',
        })
      }

      // Get all active members
      const activeMembers = await prisma.member.findMany({
        where: {
          bandId: input.bandId,
          status: 'ACTIVE',
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: {
          createdAt: 'asc', // Oldest members first
        },
      })

      // Get current billing owner
      const band = await prisma.band.findUnique({
        where: { id: input.bandId },
        select: { billingOwnerId: true },
      })

      return {
        success: true,
        candidates: activeMembers.map((m) => ({
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          isBillingOwner: m.user.id === band?.billingOwnerId,
        })),
      }
    }),

  /**
   * Get the current user's dues standing for a band
   */
  getMyStanding: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return checkGoodStanding(input.bandId, input.userId)
    }),
})
