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

      // Get current settings for audit log comparison
      const currentBand = await prisma.band.findUnique({
        where: { id: input.bandId },
        select: {
          name: true,
          votingMethod: true,
          votingPeriodDays: true,
          quorumPercentage: true,
          requireProposalReview: true,
        },
      })

      if (!currentBand) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Band not found',
        })
      }

      // Build update data and changes for audit
      const updateData: any = {}
      const changes: Record<string, { from: any; to: any }> = {}

      if (input.votingMethod !== undefined && input.votingMethod !== currentBand.votingMethod) {
        updateData.votingMethod = input.votingMethod
        changes.votingMethod = { from: currentBand.votingMethod, to: input.votingMethod }
      }
      if (input.votingPeriodDays !== undefined && input.votingPeriodDays !== currentBand.votingPeriodDays) {
        updateData.votingPeriodDays = input.votingPeriodDays
        changes.votingPeriodDays = { from: currentBand.votingPeriodDays, to: input.votingPeriodDays }
      }
      if (input.quorumPercentage !== undefined && input.quorumPercentage !== currentBand.quorumPercentage) {
        updateData.quorumPercentage = input.quorumPercentage
        changes.quorumPercentage = { from: currentBand.quorumPercentage, to: input.quorumPercentage }
      }
      if (input.requireProposalReview !== undefined && input.requireProposalReview !== currentBand.requireProposalReview) {
        updateData.requireProposalReview = input.requireProposalReview
        changes.requireProposalReview = { from: currentBand.requireProposalReview, to: input.requireProposalReview }
      }

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

      // Log to audit - use entityType 'Band' so formatter handles it correctly
      await prisma.auditLog.create({
        data: {
          bandId: input.bandId,
          action: 'updated',
          entityType: 'Band',
          entityId: input.bandId,
          entityName: currentBand.name,
          actorId: input.userId,
          actorType: 'user',
          changes,
        },
      })

      return { settings: band }
    }),
})
