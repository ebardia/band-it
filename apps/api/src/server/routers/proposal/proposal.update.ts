import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../../services/notification.service'
import { requireGoodStanding } from '../../../lib/dues-enforcement'

export const proposalUpdateRouter = router({
  /**
   * Edit a proposal
   * - DRAFT: just update, no logging
   * - PENDING_REVIEW: update, notify reviewer, log edit
   * - OPEN: reset votes, change status based on band settings, require reason, notify voters
   * - REJECTED/WITHDRAWN: update, log edit
   * - APPROVED/CLOSED: blocked
   */
  edit: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
        userId: z.string(),
        // All editable fields (all optional - only update what's provided)
        title: z.string().min(5).optional(),
        description: z.string().min(20).optional(),
        type: z.enum(['GENERAL', 'BUDGET', 'PROJECT', 'POLICY', 'MEMBERSHIP', 'DISSOLUTION']).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        executionType: z.enum(['GOVERNANCE', 'PROJECT', 'ACTION', 'RESOLUTION']).optional(),
        executionSubtype: z.string().optional().nullable(),
        effects: z.any().optional().nullable(),
        problemStatement: z.string().optional().nullable(),
        expectedOutcome: z.string().optional().nullable(),
        risksAndConcerns: z.string().optional().nullable(),
        budgetRequested: z.number().optional().nullable(),
        budgetBreakdown: z.string().optional().nullable(),
        fundingSource: z.string().optional().nullable(),
        proposedStartDate: z.string().optional().nullable(),
        proposedEndDate: z.string().optional().nullable(),
        milestones: z.string().optional().nullable(),
        externalLinks: z.array(z.string()).optional(),
        // Edit reason (required when editing during voting)
        editReason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { proposalId, userId, editReason, ...updateFields } = input

      // Get proposal with band info and votes
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: {
          band: {
            select: {
              id: true,
              name: true,
              slug: true,
              requireProposalReview: true,
              votingPeriodDays: true,
              members: {
                where: { status: 'ACTIVE' },
                select: { userId: true, role: true },
              },
            },
          },
          votes: {
            select: { userId: true },
          },
        },
      })

      if (!proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found',
        })
      }

      // Check that user is still an active member of the band
      const isActiveMember = proposal.band.members.some(m => m.userId === userId)
      if (!isActiveMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member of this band to edit proposals',
        })
      }

      // Only author can edit
      if (proposal.createdById !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the proposal author can edit it',
        })
      }

      // Block editing of completed proposals
      if (['APPROVED', 'CLOSED'].includes(proposal.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot edit proposals that have completed voting',
        })
      }

      // Check dues standing (except for DRAFT)
      if (proposal.status !== 'DRAFT') {
        await requireGoodStanding(proposal.bandId, userId)
      }

      // Require edit reason when editing during voting
      if (proposal.status === 'OPEN' && (!editReason || editReason.trim().length < 10)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Edit reason is required (minimum 10 characters) when editing during voting',
        })
      }

      // Build update data (only include fields that were provided)
      const updateData: any = {}
      const changedFields: Record<string, { old: any; new: any }> = {}

      const fieldsToCheck = [
        'title', 'description', 'type', 'priority', 'executionType', 'executionSubtype',
        'effects', 'problemStatement', 'expectedOutcome', 'risksAndConcerns',
        'budgetRequested', 'budgetBreakdown', 'fundingSource',
        'proposedStartDate', 'proposedEndDate', 'milestones', 'externalLinks'
      ]

      for (const field of fieldsToCheck) {
        if (updateFields[field as keyof typeof updateFields] !== undefined) {
          const oldValue = (proposal as any)[field]
          let newValue = updateFields[field as keyof typeof updateFields]

          // Handle date conversions
          if ((field === 'proposedStartDate' || field === 'proposedEndDate') && newValue) {
            newValue = new Date(newValue as string)
          }

          // Only record if actually changed
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            updateData[field] = newValue
            changedFields[field] = { old: oldValue, new: newValue }
          }
        }
      }

      // If nothing changed, return early
      if (Object.keys(updateData).length === 0) {
        return {
          success: true,
          message: 'No changes detected',
          proposal,
          votesReset: 0,
        }
      }

      const statusAtEdit = proposal.status
      let newStatus = proposal.status
      let votesReset = 0
      let votingStartedAt = proposal.votingStartedAt
      let votingEndsAt = proposal.votingEndsAt

      // Handle status-specific logic
      if (proposal.status === 'OPEN') {
        // Reset votes
        votesReset = proposal.votes.length

        // Determine new status based on band settings
        if (proposal.band.requireProposalReview) {
          newStatus = 'PENDING_REVIEW'
          votingStartedAt = null
          votingEndsAt = null
        } else {
          // Stay OPEN but reset voting period
          newStatus = 'OPEN'
          votingStartedAt = new Date()
          votingEndsAt = new Date()
          votingEndsAt.setDate(votingEndsAt.getDate() + proposal.band.votingPeriodDays)
        }

        updateData.status = newStatus
        updateData.votingStartedAt = votingStartedAt
        updateData.votingEndsAt = votingEndsAt
      }

      // Update edit tracking fields (skip for DRAFT)
      if (proposal.status !== 'DRAFT') {
        updateData.editCount = { increment: 1 }
        updateData.lastEditedAt = new Date()
        updateData.lastEditedById = userId
      }

      // Perform the update in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Delete votes if editing during OPEN
        if (statusAtEdit === 'OPEN' && votesReset > 0) {
          await tx.vote.deleteMany({
            where: { proposalId },
          })
        }

        // Update proposal
        const updated = await tx.proposal.update({
          where: { id: proposalId },
          data: updateData,
          include: {
            createdBy: { select: { id: true, name: true } },
            band: { select: { id: true, name: true, slug: true } },
          },
        })

        // Create edit history record (skip for DRAFT)
        if (statusAtEdit !== 'DRAFT') {
          await tx.proposalEditHistory.create({
            data: {
              proposalId,
              editorId: userId,
              statusAtEdit,
              reason: editReason?.trim() || null,
              changes: changedFields,
              votesReset,
            },
          })
        }

        return updated
      })

      // Send notifications
      if (statusAtEdit !== 'DRAFT') {
        // Notify voters if votes were reset
        if (votesReset > 0) {
          for (const vote of proposal.votes) {
            if (vote.userId !== userId) {
              await notificationService.create({
                userId: vote.userId,
                type: 'PROPOSAL_VOTES_RESET',
                actionUrl: `/bands/${proposal.band.slug}/proposals/${proposalId}`,
                priority: 'HIGH',
                metadata: {
                  proposalId,
                  proposalTitle: result.title,
                  bandName: proposal.band.name,
                  editReason,
                },
                relatedId: proposalId,
                relatedType: 'PROPOSAL',
              })
            }
          }
        }

        // Notify reviewer(s) if in PENDING_REVIEW
        if (statusAtEdit === 'PENDING_REVIEW') {
          const reviewers = proposal.band.members.filter(m =>
            ['FOUNDER', 'GOVERNOR', 'MODERATOR'].includes(m.role) && m.userId !== userId
          )
          for (const reviewer of reviewers) {
            await notificationService.create({
              userId: reviewer.userId,
              type: 'PROPOSAL_EDITED',
              actionUrl: `/bands/${proposal.band.slug}/proposals/${proposalId}`,
              priority: 'MEDIUM',
              metadata: {
                proposalId,
                proposalTitle: result.title,
                bandName: proposal.band.name,
                statusAtEdit,
              },
              relatedId: proposalId,
              relatedType: 'PROPOSAL',
            })
          }
        }

        // Notify reviewers if sent back from voting to review
        if (statusAtEdit === 'OPEN' && newStatus === 'PENDING_REVIEW') {
          const reviewers = proposal.band.members.filter(m =>
            ['FOUNDER', 'GOVERNOR', 'MODERATOR'].includes(m.role) && m.userId !== userId
          )
          for (const reviewer of reviewers) {
            // Don't double-notify if they were already notified as voters
            if (!proposal.votes.some(v => v.userId === reviewer.userId)) {
              await notificationService.create({
                userId: reviewer.userId,
                type: 'PROPOSAL_EDITED',
                actionUrl: `/bands/${proposal.band.slug}/proposals/${proposalId}`,
                priority: 'MEDIUM',
                metadata: {
                  proposalId,
                  proposalTitle: result.title,
                  bandName: proposal.band.name,
                  sentBackToReview: true,
                },
                relatedId: proposalId,
                relatedType: 'PROPOSAL',
              })
            }
          }
        }
      }

      // Log to audit
      await prisma.auditLog.create({
        data: {
          bandId: proposal.bandId,
          action: 'edited',
          entityType: 'Proposal',
          entityId: proposalId,
          entityName: result.title,
          actorId: userId,
          actorType: 'user',
          changes: {
            statusAtEdit,
            newStatus,
            votesReset,
            changedFields: Object.keys(changedFields),
            editReason,
          },
        },
      })

      return {
        success: true,
        message: votesReset > 0
          ? `Proposal updated. ${votesReset} vote(s) have been reset.`
          : 'Proposal updated successfully',
        proposal: result,
        votesReset,
        newStatus,
      }
    }),

  /**
   * Get edit history for a proposal
   */
  getEditHistory: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Check that user is a member of the band
      const proposal = await prisma.proposal.findUnique({
        where: { id: input.proposalId },
        select: {
          bandId: true,
          band: {
            select: {
              members: {
                where: { userId: input.userId, status: 'ACTIVE' },
              },
            },
          },
        },
      })

      if (!proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found',
        })
      }

      if (proposal.band.members.length === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be a member of this band to view edit history',
        })
      }

      const editHistory = await prisma.proposalEditHistory.findMany({
        where: { proposalId: input.proposalId },
        include: {
          editor: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return { editHistory }
    }),
})
