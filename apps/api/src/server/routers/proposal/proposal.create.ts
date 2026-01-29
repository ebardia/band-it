import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { notificationService } from '../../../services/notification.service'
import { setAuditFlags, clearAuditFlags } from '../../../lib/auditContext'
import { checkMultipleFields, saveFlaggedContent } from '../../../services/content-moderation.service'
import { proposalEffectsService } from '../../../services/proposal-effects.service'
import { canCreateFinanceBucketGovernanceProposal } from '../../../services/effects/finance-bucket-governance.effects'
import { TRPCError } from '@trpc/server'
import { requireGoodStanding } from '../../../lib/dues-enforcement'
import { getEligibleReviewers } from '../../../lib/proposal-review'

// Roles that can create proposals
const CAN_CREATE_PROPOSAL = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

// Roles that can vote (needed for notifications)
const CAN_VOTE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']

export const proposalCreateRouter = router({
  /**
   * Create a new proposal
   */
  create: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        title: z.string().min(5, 'Title must be at least 5 characters'),
        description: z.string().min(20, 'Description must be at least 20 characters'),

        // Type & Priority (category)
        type: z.enum(['GENERAL', 'BUDGET', 'PROJECT', 'POLICY', 'MEMBERSHIP']).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),

        // Execution Type (behavior on approval)
        executionType: z.enum(['GOVERNANCE', 'PROJECT', 'ACTION', 'RESOLUTION']).optional(),
        executionSubtype: z.string().optional(),
        effects: z.array(z.object({
          type: z.string(),
          payload: z.record(z.unknown()),
          order: z.number().optional(),
        })).optional(),

        // Problem & Outcome
        problemStatement: z.string().optional(),
        expectedOutcome: z.string().optional(),
        risksAndConcerns: z.string().optional(),

        // Budget
        budgetRequested: z.number().optional(),
        budgetBreakdown: z.string().optional(),
        fundingSource: z.string().optional(),

        // Timeline
        proposedStartDate: z.string().optional(),
        proposedEndDate: z.string().optional(),
        milestones: z.string().optional(),

        // Links
        externalLinks: z.array(z.string()).optional(),
        // Integrity Guard flags
        proceedWithFlags: z.boolean().optional(),
        flagReasons: z.array(z.string()).optional(),
        flagDetails: z.any().optional(),

        // Draft mode - save without submitting
        saveAsDraft: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check dues standing
      await requireGoodStanding(input.bandId, input.userId)

      // ACTION proposals are temporarily disabled - not fully implemented yet
      if (input.executionType === 'ACTION') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Action proposals are not currently available',
        })
      }

      // Set integrity flags in audit context if user proceeded with warnings
      if (input.proceedWithFlags && input.flagReasons && input.flagReasons.length > 0) {
        setAuditFlags({
          flagged: true,
          flagReasons: input.flagReasons,
          flagDetails: input.flagDetails,
        })
      }

      // Check content against blocked terms
      const moderationResult = await checkMultipleFields({
        title: input.title,
        description: input.description,
        problemStatement: input.problemStatement,
        expectedOutcome: input.expectedOutcome,
        risksAndConcerns: input.risksAndConcerns,
      })

      // If blocked, throw error
      if (!moderationResult.allowed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Your content contains prohibited terms and cannot be posted. Please review and revise.',
        })
      }

      // Check if user is a member with permission to create proposals
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
        include: { band: true },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new Error('You are not an active member of this band')
      }

      // Check if user's role can create proposals
      const canCreate = membership.band.whoCanCreateProposals.includes(membership.role) || 
                        CAN_CREATE_PROPOSAL.includes(membership.role)
      
      if (!canCreate) {
        throw new Error('Your role does not have permission to create proposals')
      }

      // Check if band is active (has 3+ members)
      if (membership.band.status !== 'ACTIVE') {
        throw new Error('Band must be active (3+ members) before creating proposals')
      }

      // Determine execution type (default to PROJECT for backwards compatibility)
      const executionType = input.executionType || 'PROJECT'

      // Check subtype-specific authorization
      if (input.executionSubtype === 'FINANCE_BUCKET_GOVERNANCE_V1') {
        if (!canCreateFinanceBucketGovernanceProposal(membership.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Your role does not have permission to create finance bucket governance proposals. Required: Conductor, Moderator, Governor, or Founder.',
          })
        }
      }

      // Validate effects if provided (ACTION is disabled, so only check GOVERNANCE)
      let effectsValidatedAt: Date | null = null
      if (input.effects || executionType === 'GOVERNANCE') {
        const validationResult = await proposalEffectsService.validateEffects(
          input.effects,
          executionType,
          input.executionSubtype || null,
          { bandId: input.bandId }
        )

        if (!validationResult.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid effects: ${validationResult.errors.join('; ')}`,
          })
        }

        // Warn about any validation warnings (but don't fail)
        if (validationResult.warnings.length > 0) {
          console.warn(`Proposal effects validation warnings: ${validationResult.warnings.join('; ')}`)
        }

        effectsValidatedAt = new Date()
      }

      // Determine status and voting dates based on draft mode and review requirement
      let status: 'DRAFT' | 'PENDING_REVIEW' | 'OPEN' = 'OPEN'
      let votingEndsAt: Date | null = null
      let votingStartedAt: Date | null = null
      let submittedAt: Date | null = null

      if (input.saveAsDraft) {
        // Save as draft - no voting dates, no notifications
        status = 'DRAFT'
      } else if (membership.band.requireProposalReview) {
        // Band requires review - go to PENDING_REVIEW
        status = 'PENDING_REVIEW'
        submittedAt = new Date()
      } else {
        // No review required - go straight to OPEN
        status = 'OPEN'
        votingStartedAt = new Date()
        votingEndsAt = new Date()
        votingEndsAt.setDate(votingEndsAt.getDate() + membership.band.votingPeriodDays)
        submittedAt = new Date()
      }

      // Create proposal
      const proposal = await prisma.proposal.create({
        data: {
          bandId: input.bandId,
          createdById: input.userId,
          title: input.title,
          description: input.description,
          type: input.type || 'GENERAL',
          priority: input.priority || 'MEDIUM',
          // Execution type fields
          executionType,
          executionSubtype: input.executionSubtype,
          effects: input.effects as object | undefined,
          effectsValidatedAt,
          // Content fields
          problemStatement: input.problemStatement,
          expectedOutcome: input.expectedOutcome,
          risksAndConcerns: input.risksAndConcerns,
          budgetRequested: input.budgetRequested,
          budgetBreakdown: input.budgetBreakdown,
          fundingSource: input.fundingSource,
          proposedStartDate: input.proposedStartDate ? new Date(input.proposedStartDate) : null,
          proposedEndDate: input.proposedEndDate ? new Date(input.proposedEndDate) : null,
          milestones: input.milestones,
          externalLinks: input.externalLinks || [],
          // Status and review fields
          status,
          votingEndsAt,
          votingStartedAt,
          submittedAt,
          submissionCount: input.saveAsDraft ? 0 : 1,
        },
        include: {
          createdBy: {
            select: { name: true },
          },
          band: {
            select: { name: true, slug: true, requireProposalReview: true },
          },
        },
      })

      // If content was flagged (WARN), save for admin review
      if (moderationResult.flagged) {
        // Combine all matched terms from all fields
        const allMatchedTerms = Object.values(moderationResult.fieldResults)
          .flatMap(r => r.matchedTerms)
          .filter(t => t.severity === 'WARN')

        if (allMatchedTerms.length > 0) {
          // Combine all text for the flagged content snapshot
          const contentText = [
            input.title,
            input.description,
            input.problemStatement,
            input.expectedOutcome,
            input.risksAndConcerns,
          ].filter(Boolean).join('\n\n')

          await saveFlaggedContent(
            {
              allowed: true,
              flagged: true,
              matchedTerms: allMatchedTerms,
            },
            {
              contentType: 'PROPOSAL',
              contentId: proposal.id,
              authorId: input.userId,
              contentText,
            }
          )
        }
      }

      // Type assertion for included relations
      const proposalWithRelations = proposal as typeof proposal & {
        createdBy: { name: string }
        band: { name: string; slug: string; requireProposalReview: boolean }
      }

      // Handle notifications based on status
      if (status === 'DRAFT') {
        // No notifications for drafts
      } else if (status === 'PENDING_REVIEW') {
        // Notify eligible reviewers
        const eligibleReviewers = await getEligibleReviewers(
          input.bandId,
          input.userId,
          membership.role
        )

        for (const reviewer of eligibleReviewers) {
          await notificationService.create({
            userId: reviewer.userId,
            type: 'PROPOSAL_VOTE_NEEDED',
            title: 'Proposal Needs Review',
            message: `${proposalWithRelations.createdBy.name} submitted "${proposal.title}" for review in ${proposalWithRelations.band.name}`,
            actionUrl: `/bands/${proposalWithRelations.band.slug}/proposals/${proposal.id}`,
            priority: 'HIGH',
            relatedId: proposal.id,
            relatedType: 'PROPOSAL',
            bandId: input.bandId,
          })
        }
      } else {
        // Status is OPEN - notify all voting members
        const votingMembers = await prisma.member.findMany({
          where: {
            bandId: input.bandId,
            status: 'ACTIVE',
            role: { in: CAN_VOTE as any },
            userId: { not: input.userId },
          },
          select: { userId: true },
        })

        for (const member of votingMembers) {
          await notificationService.create({
            userId: member.userId,
            type: 'PROPOSAL_CREATED',
            title: 'New Proposal',
            message: `${proposalWithRelations.createdBy.name} created "${proposal.title}" in ${proposalWithRelations.band.name}`,
            actionUrl: `/bands/${proposalWithRelations.band.slug}/proposals/${proposal.id}`,
            priority: input.priority === 'URGENT' ? 'HIGH' : 'MEDIUM',
            relatedId: proposal.id,
            relatedType: 'PROPOSAL',
            bandId: input.bandId,
          })
        }
      }

      // Clear flags to prevent leaking to other operations
      clearAuditFlags()

      return {
        success: true,
        message: 'Proposal created successfully',
        proposal,
      }
    }),
})