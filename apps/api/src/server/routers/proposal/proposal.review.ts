import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../../services/notification.service'
import { requireGoodStanding } from '../../../lib/dues-enforcement'
import {
  canReviewProposal,
  getEligibleReviewers,
  isReviewer,
  MAX_RESUBMISSIONS,
} from '../../../lib/proposal-review'
import { checkMultipleFields } from '../../../services/content-moderation.service'

export const proposalReviewRouter = router({
  /**
   * Submit a draft proposal for review.
   */
  submitForReview: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const proposal = await prisma.proposal.findUnique({
        where: { id: input.proposalId },
        include: {
          band: {
            select: {
              id: true,
              name: true,
              slug: true,
              requireProposalReview: true,
            },
          },
          createdBy: {
            select: { name: true },
          },
        },
      })

      if (!proposal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposal not found' })
      }

      // Verify author
      if (proposal.createdById !== input.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the author can submit for review',
        })
      }

      // Verify status - allow DRAFT, REJECTED, or WITHDRAWN
      if (!['DRAFT', 'REJECTED', 'WITHDRAWN'].includes(proposal.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only drafts, rejected, or withdrawn proposals can be submitted for review',
        })
      }

      // Check good standing
      await requireGoodStanding(proposal.bandId, input.userId)

      // Check resubmission limit
      if (proposal.submissionCount >= MAX_RESUBMISSIONS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Maximum resubmission limit (${MAX_RESUBMISSIONS}) reached`,
        })
      }

      // Get author's membership to determine reviewer eligibility
      const authorMembership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId: input.userId, bandId: proposal.bandId },
        },
      })

      if (!authorMembership || authorMembership.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active member of this band' })
      }

      // If band doesn't require review, go straight to OPEN
      if (!proposal.band.requireProposalReview) {
        const votingEndsAt = new Date()
        const band = await prisma.band.findUnique({
          where: { id: proposal.bandId },
          select: { votingPeriodDays: true },
        })
        votingEndsAt.setDate(votingEndsAt.getDate() + (band?.votingPeriodDays || 7))

        const updated = await prisma.proposal.update({
          where: { id: input.proposalId },
          data: {
            status: 'OPEN',
            submittedAt: new Date(),
            votingStartedAt: new Date(),
            votingEndsAt,
            submissionCount: { increment: 1 },
            // Clear previous review data (for resubmissions)
            reviewedById: null,
            reviewedAt: null,
            rejectionReason: null,
          },
        })

        // Notify band members that voting is open
        await notifyVotingOpen(proposal)

        return { proposal: updated, reviewRequired: false }
      }

      // Update status to PENDING_REVIEW
      const updated = await prisma.proposal.update({
        where: { id: input.proposalId },
        data: {
          status: 'PENDING_REVIEW',
          submittedAt: new Date(),
          submissionCount: { increment: 1 },
          // Clear previous review data
          reviewedById: null,
          reviewedAt: null,
          rejectionReason: null,
        },
      })

      // Notify eligible reviewers
      const eligibleReviewers = await getEligibleReviewers(
        proposal.bandId,
        input.userId,
        authorMembership.role
      )

      for (const reviewer of eligibleReviewers) {
        await notificationService.create({
          userId: reviewer.userId,
          type: 'PROPOSAL_VOTE_NEEDED', // Reuse existing type for now
          title: 'Proposal Needs Review',
          message: `${proposal.createdBy.name} submitted "${proposal.title}" for review in ${proposal.band.name}`,
          actionUrl: `/bands/${proposal.band.slug}/proposals/${proposal.id}`,
          priority: 'HIGH',
          relatedId: proposal.id,
          relatedType: 'PROPOSAL',
          bandId: proposal.bandId,
        })
      }

      return { proposal: updated, reviewRequired: true }
    }),

  /**
   * Approve a proposal (send to voting).
   */
  approveProposal: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const proposal = await prisma.proposal.findUnique({
        where: { id: input.proposalId },
        include: {
          band: {
            select: {
              id: true,
              name: true,
              slug: true,
              votingPeriodDays: true,
            },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
      })

      if (!proposal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposal not found' })
      }

      // Verify status
      if (proposal.status !== 'PENDING_REVIEW') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only proposals pending review can be approved',
        })
      }

      // Get reviewer's membership
      const reviewerMembership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId: input.userId, bandId: proposal.bandId },
        },
      })

      if (!reviewerMembership || reviewerMembership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not an active band member',
        })
      }

      // Get author's membership
      const authorMembership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId: proposal.createdById, bandId: proposal.bandId },
        },
      })

      if (!authorMembership) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Proposal author is no longer a member',
        })
      }

      // Check if reviewer can review this proposal
      if (
        !canReviewProposal(
          reviewerMembership.role,
          authorMembership.role,
          input.userId,
          proposal.createdById
        )
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to review this proposal',
        })
      }

      // Check good standing
      await requireGoodStanding(proposal.bandId, input.userId)

      // Calculate voting period end
      const votingEndsAt = new Date()
      votingEndsAt.setDate(votingEndsAt.getDate() + proposal.band.votingPeriodDays)

      // Record in history
      await prisma.proposalReviewHistory.create({
        data: {
          proposalId: input.proposalId,
          reviewerId: input.userId,
          action: 'APPROVED',
        },
      })

      // Update proposal
      const updated = await prisma.proposal.update({
        where: { id: input.proposalId },
        data: {
          status: 'OPEN',
          reviewedById: input.userId,
          reviewedAt: new Date(),
          votingStartedAt: new Date(),
          votingEndsAt,
        },
      })

      // Notify author
      await notificationService.create({
        userId: proposal.createdById,
        type: 'PROPOSAL_APPROVED',
        title: 'Proposal Approved',
        message: `Your proposal "${proposal.title}" has been approved and is now open for voting!`,
        actionUrl: `/bands/${proposal.band.slug}/proposals/${proposal.id}`,
        priority: 'HIGH',
        relatedId: proposal.id,
        relatedType: 'PROPOSAL',
        bandId: proposal.bandId,
      })

      // Notify band members that voting is open
      await notifyVotingOpen(proposal)

      // Log to audit
      await prisma.auditLog.create({
        data: {
          bandId: proposal.bandId,
          action: 'PROPOSAL_REVIEW_APPROVED',
          entityType: 'Proposal',
          entityId: proposal.id,
          entityName: proposal.title,
          actorId: input.userId,
          actorType: 'user',
        },
      })

      return { proposal: updated }
    }),

  /**
   * Reject a proposal.
   */
  rejectProposal: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
        userId: z.string(),
        reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
      })
    )
    .mutation(async ({ input }) => {
      const proposal = await prisma.proposal.findUnique({
        where: { id: input.proposalId },
        include: {
          band: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
      })

      if (!proposal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposal not found' })
      }

      // Verify status
      if (proposal.status !== 'PENDING_REVIEW') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only proposals pending review can be rejected',
        })
      }

      // Get reviewer's membership
      const reviewerMembership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId: input.userId, bandId: proposal.bandId },
        },
      })

      if (!reviewerMembership || reviewerMembership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not an active band member',
        })
      }

      // Get author's membership
      const authorMembership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId: proposal.createdById, bandId: proposal.bandId },
        },
      })

      if (!authorMembership) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Proposal author is no longer a member',
        })
      }

      // Check if reviewer can review this proposal
      if (
        !canReviewProposal(
          reviewerMembership.role,
          authorMembership.role,
          input.userId,
          proposal.createdById
        )
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to review this proposal',
        })
      }

      // Check good standing
      await requireGoodStanding(proposal.bandId, input.userId)

      // Record in history
      await prisma.proposalReviewHistory.create({
        data: {
          proposalId: input.proposalId,
          reviewerId: input.userId,
          action: 'REJECTED',
          reason: input.reason,
        },
      })

      // Update proposal
      const updated = await prisma.proposal.update({
        where: { id: input.proposalId },
        data: {
          status: 'REJECTED',
          reviewedById: input.userId,
          reviewedAt: new Date(),
          rejectionReason: input.reason,
        },
      })

      // Notify author
      await notificationService.create({
        userId: proposal.createdById,
        type: 'PROPOSAL_REJECTED',
        title: 'Proposal Needs Changes',
        message: `Your proposal "${proposal.title}" was not approved for voting. Check the feedback and consider resubmitting.`,
        actionUrl: `/bands/${proposal.band.slug}/proposals/${proposal.id}`,
        priority: 'HIGH',
        relatedId: proposal.id,
        relatedType: 'PROPOSAL',
        bandId: proposal.bandId,
      })

      // Log to audit
      await prisma.auditLog.create({
        data: {
          bandId: proposal.bandId,
          action: 'PROPOSAL_REVIEW_REJECTED',
          entityType: 'Proposal',
          entityId: proposal.id,
          entityName: proposal.title,
          actorId: input.userId,
          actorType: 'user',
          changes: { reason: input.reason },
        },
      })

      return { proposal: updated }
    }),

  /**
   * Withdraw a proposal from review.
   */
  withdraw: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const proposal = await prisma.proposal.findUnique({
        where: { id: input.proposalId },
        include: {
          band: {
            select: { slug: true },
          },
        },
      })

      if (!proposal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposal not found' })
      }

      // Verify author
      if (proposal.createdById !== input.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the author can withdraw a proposal',
        })
      }

      // Verify user is still an active member
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId: input.userId, bandId: proposal.bandId },
        },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member of this band to withdraw proposals',
        })
      }

      // Verify status
      if (proposal.status !== 'PENDING_REVIEW') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Can only withdraw proposals pending review',
        })
      }

      // Update status
      const updated = await prisma.proposal.update({
        where: { id: input.proposalId },
        data: {
          status: 'WITHDRAWN',
        },
      })

      return { proposal: updated }
    }),

  /**
   * Resubmit a rejected/withdrawn proposal.
   */
  resubmit: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
        userId: z.string(),
        title: z.string().min(5, 'Title must be at least 5 characters'),
        description: z.string().min(20, 'Description must be at least 20 characters'),
        problemStatement: z.string().optional(),
        expectedOutcome: z.string().optional(),
        risksAndConcerns: z.string().optional(),
        budgetRequested: z.number().optional(),
        budgetBreakdown: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const proposal = await prisma.proposal.findUnique({
        where: { id: input.proposalId },
        include: {
          band: {
            select: {
              id: true,
              name: true,
              slug: true,
              requireProposalReview: true,
              votingPeriodDays: true,
            },
          },
          createdBy: {
            select: { name: true },
          },
        },
      })

      if (!proposal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposal not found' })
      }

      // Verify author
      if (proposal.createdById !== input.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the author can resubmit a proposal',
        })
      }

      // Can only resubmit rejected, withdrawn, or draft proposals
      if (!['DRAFT', 'REJECTED', 'WITHDRAWN'].includes(proposal.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot resubmit this proposal',
        })
      }

      // Check resubmission limit
      if (proposal.submissionCount >= MAX_RESUBMISSIONS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Maximum resubmission limit (${MAX_RESUBMISSIONS}) reached`,
        })
      }

      // Check good standing
      await requireGoodStanding(proposal.bandId, input.userId)

      // Check content moderation
      const moderationResult = await checkMultipleFields({
        title: input.title,
        description: input.description,
        problemStatement: input.problemStatement,
        expectedOutcome: input.expectedOutcome,
        risksAndConcerns: input.risksAndConcerns,
      })

      if (!moderationResult.allowed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Your content contains prohibited terms and cannot be posted.',
        })
      }

      // Get author's membership
      const authorMembership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId: input.userId, bandId: proposal.bandId },
        },
      })

      if (!authorMembership || authorMembership.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active member of this band' })
      }

      // Determine new status based on band settings
      let newStatus: 'PENDING_REVIEW' | 'OPEN' = 'PENDING_REVIEW'
      let votingEndsAt: Date | null = null
      let votingStartedAt: Date | null = null

      if (!proposal.band.requireProposalReview) {
        newStatus = 'OPEN'
        votingStartedAt = new Date()
        votingEndsAt = new Date()
        votingEndsAt.setDate(votingEndsAt.getDate() + proposal.band.votingPeriodDays)
      }

      // Update proposal
      const updated = await prisma.proposal.update({
        where: { id: input.proposalId },
        data: {
          title: input.title,
          description: input.description,
          problemStatement: input.problemStatement,
          expectedOutcome: input.expectedOutcome,
          risksAndConcerns: input.risksAndConcerns,
          budgetRequested: input.budgetRequested,
          budgetBreakdown: input.budgetBreakdown,
          status: newStatus,
          submittedAt: new Date(),
          submissionCount: { increment: 1 },
          votingStartedAt,
          votingEndsAt,
          // Clear previous review data
          reviewedById: null,
          reviewedAt: null,
          rejectionReason: null,
        },
      })

      // If going to review, notify reviewers
      if (newStatus === 'PENDING_REVIEW') {
        const eligibleReviewers = await getEligibleReviewers(
          proposal.bandId,
          input.userId,
          authorMembership.role
        )

        const isResubmission = proposal.submissionCount > 0

        for (const reviewer of eligibleReviewers) {
          await notificationService.create({
            userId: reviewer.userId,
            type: 'PROPOSAL_VOTE_NEEDED',
            title: isResubmission ? 'Proposal Resubmitted for Review' : 'Proposal Needs Review',
            message: `${proposal.createdBy.name} ${isResubmission ? 'resubmitted' : 'submitted'} "${input.title}" for review in ${proposal.band.name}`,
            actionUrl: `/bands/${proposal.band.slug}/proposals/${proposal.id}`,
            priority: 'HIGH',
            relatedId: proposal.id,
            relatedType: 'PROPOSAL',
            bandId: proposal.bandId,
          })
        }
      } else {
        // Notify band members that voting is open
        await notifyVotingOpen({ ...proposal, title: input.title })
      }

      return { proposal: updated, reviewRequired: newStatus === 'PENDING_REVIEW' }
    }),

  /**
   * Get proposals pending review (for reviewers).
   */
  getPendingReview: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Get user's membership
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId: input.userId, bandId: input.bandId },
        },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        return { proposals: [], canReview: false }
      }

      // Check if user can review any proposals
      if (!isReviewer(membership.role)) {
        return { proposals: [], canReview: false }
      }

      // Get all pending review proposals
      const proposals = await prisma.proposal.findMany({
        where: {
          bandId: input.bandId,
          status: 'PENDING_REVIEW',
        },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
          band: {
            select: { slug: true },
          },
        },
        orderBy: { submittedAt: 'asc' },
      })

      // Filter to only proposals this user can review
      const reviewableProposals = []
      for (const proposal of proposals) {
        // Get author's membership
        const authorMembership = await prisma.member.findUnique({
          where: {
            userId_bandId: { userId: proposal.createdById, bandId: input.bandId },
          },
        })

        if (
          authorMembership &&
          canReviewProposal(
            membership.role,
            authorMembership.role,
            input.userId,
            proposal.createdById
          )
        ) {
          reviewableProposals.push({
            ...proposal,
            authorRole: authorMembership.role,
          })
        }
      }

      return { proposals: reviewableProposals, canReview: true }
    }),

  /**
   * Get review history for a proposal.
   */
  getReviewHistory: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const history = await prisma.proposalReviewHistory.findMany({
        where: { proposalId: input.proposalId },
        include: {
          reviewer: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return { history }
    }),
})

/**
 * Helper to notify band members that voting is open.
 */
async function notifyVotingOpen(proposal: {
  id: string
  bandId: string
  title: string
  createdById: string
  band: { slug: string; name: string }
  createdBy: { name: string }
}) {
  // Roles that can vote
  const CAN_VOTE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']

  const votingMembers = await prisma.member.findMany({
    where: {
      bandId: proposal.bandId,
      status: 'ACTIVE',
      role: { in: CAN_VOTE as any },
      userId: { not: proposal.createdById },
    },
    select: { userId: true },
  })

  for (const member of votingMembers) {
    await notificationService.create({
      userId: member.userId,
      type: 'PROPOSAL_CREATED',
      title: 'New Proposal Open for Voting',
      message: `${proposal.createdBy.name} created "${proposal.title}" in ${proposal.band.name}`,
      actionUrl: `/bands/${proposal.band.slug}/proposals/${proposal.id}`,
      priority: 'MEDIUM',
      relatedId: proposal.id,
      relatedType: 'PROPOSAL',
      bandId: proposal.bandId,
    })
  }
}
