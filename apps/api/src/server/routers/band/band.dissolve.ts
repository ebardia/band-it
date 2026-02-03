import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import {
  checkDissolutionEligibility,
  hasActiveDissolutionProposal,
  executeDissolution,
} from '../../../lib/band-dissolution'
import { MIN_MEMBERS_TO_ACTIVATE } from '@band-it/shared'

/**
 * Check and set activatedAt when band reaches minimum active members
 * This should be called after any member becomes ACTIVE
 */
export async function checkAndSetBandActivation(bandId: string): Promise<boolean> {
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: { activatedAt: true, status: true },
  })

  // Already fully activated (both activatedAt and status), nothing to do
  if (band?.activatedAt && band?.status === 'ACTIVE') {
    return false
  }

  // Count active members
  const activeCount = await prisma.member.count({
    where: {
      bandId,
      status: 'ACTIVE',
    },
  })

  // Activate if reached minimum members
  if (activeCount >= MIN_MEMBERS_TO_ACTIVATE) {
    await prisma.band.update({
      where: { id: bandId },
      data: {
        activatedAt: band?.activatedAt || new Date(),
        status: 'ACTIVE',
      },
    })
    return true
  }

  return false
}

export const bandDissolveRouter = router({
  /**
   * Check if band can be dissolved and by what method
   */
  canDissolve: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const eligibility = await checkDissolutionEligibility(input.bandId, input.userId)

      // Also check for active dissolution proposal
      let hasActiveProposal = false
      if (eligibility.method === 'PROPOSAL') {
        hasActiveProposal = await hasActiveDissolutionProposal(input.bandId)
      }

      return {
        ...eligibility,
        hasActiveProposal,
      }
    }),

  /**
   * Direct dissolution by founder when band has fewer than minimum members
   */
  dissolve: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
      })
    )
    .mutation(async ({ input }) => {
      // Check eligibility
      const eligibility = await checkDissolutionEligibility(input.bandId, input.userId)

      if (!eligibility.canDissolve) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: eligibility.reason || 'Cannot dissolve band',
        })
      }

      if (eligibility.method !== 'DIRECT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `This band has ${MIN_MEMBERS_TO_ACTIVATE} or more members. You must create a dissolution proposal instead.`,
        })
      }

      // Execute dissolution
      const result = await executeDissolution(
        input.bandId,
        input.userId,
        input.reason,
        'DIRECT'
      )

      return {
        success: true,
        message: 'Band has been dissolved',
        stripeErrors: result.stripeErrors,
        deletedContent: result.deletedContent,
      }
    }),

  /**
   * Create a dissolution proposal (for bands with minimum or more members)
   */
  createDissolutionProposal: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        reason: z.string().min(10, 'Reason must be at least 10 characters').max(2000),
      })
    )
    .mutation(async ({ input }) => {
      // Check eligibility
      const eligibility = await checkDissolutionEligibility(input.bandId, input.userId)

      if (!eligibility.canDissolve) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: eligibility.reason || 'Cannot create dissolution proposal',
        })
      }

      if (eligibility.method !== 'PROPOSAL') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Bands with fewer than ${MIN_MEMBERS_TO_ACTIVATE} members can be dissolved directly by the founder.`,
        })
      }

      // Check for existing dissolution proposal
      const hasActive = await hasActiveDissolutionProposal(input.bandId)
      if (hasActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A dissolution proposal is already in progress.',
        })
      }

      // Get band settings
      const band = await prisma.band.findUnique({
        where: { id: input.bandId },
        select: {
          requireProposalReview: true,
          votingPeriodDays: true,
        },
      })

      if (!band) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Band not found',
        })
      }

      // Create the proposal
      // Status depends on whether the band requires proposal review
      const initialStatus = band.requireProposalReview ? 'PENDING_REVIEW' : 'OPEN'
      const now = new Date()

      const proposal = await prisma.proposal.create({
        data: {
          bandId: input.bandId,
          createdById: input.userId,
          type: 'DISSOLUTION',
          title: 'Proposal to Dissolve Band',
          description: input.reason,
          status: initialStatus,
          submittedAt: now,
          submissionCount: 1,
          // For OPEN status, set voting period
          ...(initialStatus === 'OPEN' && {
            votingStartedAt: now,
            votingEndsAt: new Date(now.getTime() + band.votingPeriodDays * 24 * 60 * 60 * 1000),
          }),
        },
      })

      return {
        success: true,
        proposalId: proposal.id,
        status: initialStatus,
        message: initialStatus === 'PENDING_REVIEW'
          ? 'Dissolution proposal submitted for review'
          : 'Dissolution proposal created and voting has begun',
      }
    }),

  /**
   * Get archived/dissolved bands (admin only)
   */
  getArchivedBands: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { isAdmin: true },
      })

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        })
      }

      const bands = await prisma.band.findMany({
        where: {
          dissolvedAt: { not: null },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          dissolvedAt: true,
          dissolutionMethod: true,
          dissolutionReason: true,
          dissolvedBy: {
            select: { id: true, name: true },
          },
          _count: {
            select: { members: true },
          },
        },
        orderBy: { dissolvedAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      })

      let nextCursor: string | undefined
      if (bands.length > input.limit) {
        const nextItem = bands.pop()
        nextCursor = nextItem?.id
      }

      return {
        bands,
        nextCursor,
      }
    }),

  /**
   * Get archived band details (admin only)
   */
  getArchivedBandDetails: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        bandId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { isAdmin: true },
      })

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        })
      }

      const band = await prisma.band.findUnique({
        where: { id: input.bandId },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          dissolvedBy: {
            select: { id: true, name: true, email: true },
          },
          auditLogs: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      })

      if (!band) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Band not found',
        })
      }

      if (!band.dissolvedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This band is not dissolved',
        })
      }

      return { band }
    }),
})
