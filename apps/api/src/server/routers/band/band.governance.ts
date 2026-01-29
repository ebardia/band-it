import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'

// Roles that can update governance settings
const CAN_UPDATE_GOVERNANCE = ['FOUNDER', 'GOVERNOR']

export const bandGovernanceRouter = router({
  /**
   * Get governance settings for a band
   */
  getGovernanceSettings: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Check membership
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member to view governance settings',
        })
      }

      const band = await prisma.band.findUnique({
        where: { id: input.bandId },
        select: {
          id: true,
          votingMethod: true,
          votingPeriodDays: true,
          quorumPercentage: true,
          requireProposalReview: true,
        },
      })

      if (!band) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Band not found',
        })
      }

      return {
        settings: band,
        canEdit: CAN_UPDATE_GOVERNANCE.includes(membership.role),
      }
    }),

  /**
   * Update governance settings for a band
   */
  updateGovernanceSettings: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        votingMethod: z.enum(['SIMPLE_MAJORITY', 'SUPERMAJORITY_66', 'SUPERMAJORITY_75', 'UNANIMOUS']).optional(),
        votingPeriodDays: z.number().int().min(1).max(30).optional(),
        quorumPercentage: z.number().int().min(0).max(100).optional(),
        requireProposalReview: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check membership and role
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member to update governance settings',
        })
      }

      if (!CAN_UPDATE_GOVERNANCE.includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only founders and governors can update governance settings',
        })
      }

      // Build update data
      const updateData: any = {}
      if (input.votingMethod !== undefined) updateData.votingMethod = input.votingMethod
      if (input.votingPeriodDays !== undefined) updateData.votingPeriodDays = input.votingPeriodDays
      if (input.quorumPercentage !== undefined) updateData.quorumPercentage = input.quorumPercentage
      if (input.requireProposalReview !== undefined) updateData.requireProposalReview = input.requireProposalReview

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No settings to update',
        })
      }

      const band = await prisma.band.update({
        where: { id: input.bandId },
        data: updateData,
        select: {
          id: true,
          votingMethod: true,
          votingPeriodDays: true,
          quorumPercentage: true,
          requireProposalReview: true,
        },
      })

      // Log to audit
      await prisma.auditLog.create({
        data: {
          bandId: input.bandId,
          action: 'updated',
          entityType: 'GovernanceSettings',
          entityId: input.bandId,
          actorId: input.userId,
          actorType: 'user',
          changes: updateData,
        },
      })

      return { settings: band }
    }),
})
