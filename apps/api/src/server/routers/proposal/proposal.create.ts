import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { notificationService } from '../../../services/notification.service'

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
        
        // Type & Priority
        type: z.enum(['GENERAL', 'BUDGET', 'PROJECT', 'POLICY', 'MEMBERSHIP']).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        
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
      })
    )
    .mutation(async ({ input }) => {
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

      // Calculate voting end date
      const votingEndsAt = new Date()
      votingEndsAt.setDate(votingEndsAt.getDate() + membership.band.votingPeriodDays)

      // Create proposal
      const proposal = await prisma.proposal.create({
        data: {
          bandId: input.bandId,
          createdById: input.userId,
          title: input.title,
          description: input.description,
          type: input.type || 'GENERAL',
          priority: input.priority || 'MEDIUM',
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
          votingEndsAt,
        },
        include: {
          createdBy: {
            select: { name: true },
          },
          band: {
            select: { name: true, slug: true },
          },
        },
      })

      // Notify all voting members
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
          message: `${proposal.createdBy.name} created "${proposal.title}" in ${proposal.band.name}`,
          actionUrl: `/bands/${proposal.band.slug}/proposals/${proposal.id}`,
          priority: input.priority === 'URGENT' ? 'HIGH' : 'MEDIUM',
          relatedId: proposal.id,
          relatedType: 'PROPOSAL',
        })
      }

      return {
        success: true,
        message: 'Proposal created successfully',
        proposal,
      }
    }),
})