import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { notificationService } from '../../services/notification.service'

// Roles that can create proposals
const CAN_CREATE_PROPOSAL = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

// Roles that can vote
const CAN_VOTE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']

export const proposalRouter = router({
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
        proposedStartDate: z.string().optional(), // ISO date string
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

  /**
   * Get all proposals for a band
   */
  getByBand: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        status: z.enum(['OPEN', 'CLOSED', 'APPROVED', 'REJECTED']).optional(),
        type: z.enum(['GENERAL', 'BUDGET', 'PROJECT', 'POLICY', 'MEMBERSHIP']).optional(),
      })
    )
    .query(async ({ input }) => {
      const proposals = await prisma.proposal.findMany({
        where: {
          bandId: input.bandId,
          status: input.status,
          type: input.type,
        },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
          _count: {
            select: { votes: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return {
        success: true,
        proposals,
      }
    }),

  /**
   * Get proposal by ID with votes
   */
  getById: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const proposal = await prisma.proposal.findUnique({
        where: { id: input.proposalId },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
          band: {
            select: { 
              id: true, 
              name: true, 
              slug: true,
              votingMethod: true,
              votingPeriodDays: true,
            },
          },
          votes: {
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      })

      if (!proposal) {
        throw new Error('Proposal not found')
      }

      // Calculate vote counts
      const yesVotes = proposal.votes.filter(v => v.vote === 'YES').length
      const noVotes = proposal.votes.filter(v => v.vote === 'NO').length
      const abstainVotes = proposal.votes.filter(v => v.vote === 'ABSTAIN').length
      const totalVotes = proposal.votes.length

      // Get eligible voters count
      const eligibleVoters = await prisma.member.count({
        where: {
          bandId: proposal.bandId,
          status: 'ACTIVE',
          role: { in: CAN_VOTE as any },
        },
      })

      return {
        success: true,
        proposal,
        voteSummary: {
          yes: yesVotes,
          no: noVotes,
          abstain: abstainVotes,
          total: totalVotes,
          eligibleVoters,
          percentageYes: totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0,
          percentageNo: totalVotes > 0 ? Math.round((noVotes / totalVotes) * 100) : 0,
        },
      }
    }),

  /**
   * Vote on a proposal
   */
  vote: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
        userId: z.string(),
        vote: z.enum(['YES', 'NO', 'ABSTAIN']),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Get proposal
      const proposal = await prisma.proposal.findUnique({
        where: { id: input.proposalId },
        include: { band: true },
      })

      if (!proposal) {
        throw new Error('Proposal not found')
      }

      if (proposal.status !== 'OPEN') {
        throw new Error('This proposal is no longer open for voting')
      }

      if (new Date() > proposal.votingEndsAt) {
        throw new Error('Voting period has ended')
      }

      // Check if user can vote
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: proposal.bandId,
          },
        },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new Error('You are not an active member of this band')
      }

      if (!CAN_VOTE.includes(membership.role)) {
        throw new Error('Your role does not have permission to vote')
      }

      // Check if already voted
      const existingVote = await prisma.vote.findUnique({
        where: {
          proposalId_userId: {
            proposalId: input.proposalId,
            userId: input.userId,
          },
        },
      })

      let vote
      if (existingVote) {
        // Update existing vote
        vote = await prisma.vote.update({
          where: { id: existingVote.id },
          data: {
            vote: input.vote,
            comment: input.comment,
          },
        })
      } else {
        // Create new vote
        vote = await prisma.vote.create({
          data: {
            proposalId: input.proposalId,
            userId: input.userId,
            vote: input.vote,
            comment: input.comment,
          },
        })
      }

      return {
        success: true,
        message: existingVote ? 'Vote updated' : 'Vote recorded',
        vote,
      }
    }),

  /**
   * Close a proposal and determine result
   */
  closeProposal: publicProcedure
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
          band: true,
          votes: true,
          createdBy: { select: { name: true } },
        },
      })

      if (!proposal) {
        throw new Error('Proposal not found')
      }

      if (proposal.status !== 'OPEN') {
        throw new Error('This proposal is already closed')
      }

      // Check if user has permission (creator or founder/governor)
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: proposal.bandId,
          },
        },
      })

      const canClose = proposal.createdById === input.userId || 
                       membership?.role === 'FOUNDER' || 
                       membership?.role === 'GOVERNOR'

      if (!canClose) {
        throw new Error('You do not have permission to close this proposal')
      }

      // Calculate results
      const yesVotes = proposal.votes.filter(v => v.vote === 'YES').length
      const noVotes = proposal.votes.filter(v => v.vote === 'NO').length
      const totalVotes = yesVotes + noVotes // Abstain doesn't count

      let approved = false
      if (totalVotes > 0) {
        const yesPercentage = (yesVotes / totalVotes) * 100
        
        switch (proposal.band.votingMethod) {
          case 'SIMPLE_MAJORITY':
            approved = yesPercentage > 50
            break
          case 'SUPERMAJORITY_66':
            approved = yesPercentage >= 66
            break
          case 'SUPERMAJORITY_75':
            approved = yesPercentage >= 75
            break
          case 'UNANIMOUS':
            approved = noVotes === 0 && yesVotes > 0
            break
        }
      }

      // Update proposal status
      const updatedProposal = await prisma.proposal.update({
        where: { id: input.proposalId },
        data: {
          status: approved ? 'APPROVED' : 'REJECTED',
          closedAt: new Date(),
        },
      })

      // Notify all band members
      const allMembers = await prisma.member.findMany({
        where: {
          bandId: proposal.bandId,
          status: 'ACTIVE',
        },
        select: { userId: true },
      })

      for (const member of allMembers) {
        await notificationService.create({
          userId: member.userId,
          type: approved ? 'PROPOSAL_APPROVED' : 'PROPOSAL_REJECTED',
          title: approved ? 'Proposal Approved' : 'Proposal Rejected',
          message: `"${proposal.title}" was ${approved ? 'approved' : 'rejected'}`,
          actionUrl: `/bands/${proposal.band.slug}/proposals/${proposal.id}`,
          priority: 'MEDIUM',
          relatedId: proposal.id,
          relatedType: 'PROPOSAL',
        })
      }

      return {
        success: true,
        message: `Proposal ${approved ? 'approved' : 'rejected'}`,
        proposal: updatedProposal,
      }
    }),

  /**
   * Get proposals that need user's vote
   */
  getMyPendingVotes: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Get all bands where user can vote
      const memberships = await prisma.member.findMany({
        where: {
          userId: input.userId,
          status: 'ACTIVE',
          role: { in: CAN_VOTE as any },
        },
        select: { bandId: true },
      })

      const bandIds = memberships.map(m => m.bandId)

      // Get open proposals in those bands
      const proposals = await prisma.proposal.findMany({
        where: {
          bandId: { in: bandIds },
          status: 'OPEN',
          votingEndsAt: { gt: new Date() },
        },
        include: {
          band: {
            select: { name: true, slug: true },
          },
          createdBy: {
            select: { name: true },
          },
          votes: {
            where: { userId: input.userId },
            select: { id: true },
          },
        },
        orderBy: {
          votingEndsAt: 'asc',
        },
      })

      // Filter to only proposals user hasn't voted on
      const needsVote = proposals.filter(p => p.votes.length === 0)

      return {
        success: true,
        proposals: needsVote,
      }
    }),

  /**
   * AI: Generate proposal draft
   */
  generateDraft: publicProcedure
    .input(
      z.object({
        title: z.string().min(3, 'Title must be at least 3 characters'),
        type: z.enum(['GENERAL', 'BUDGET', 'PROJECT', 'POLICY', 'MEMBERSHIP']),
        context: z.string().optional(), // Any additional context
      })
    )
    .mutation(async ({ input }) => {
      // For now, generate a structured template based on type
      // Later, this can call OpenAI/Anthropic API
      
      let draft = {
        description: '',
        problemStatement: '',
        expectedOutcome: '',
        risksAndConcerns: '',
        budgetBreakdown: '',
        milestones: '',
      }

      switch (input.type) {
        case 'BUDGET':
          draft = {
            description: `This proposal requests funding for: ${input.title}\n\n[Describe what the funds will be used for and why this expenditure is necessary for the band.]`,
            problemStatement: '[What problem or need does this budget address? Why is this spending necessary now?]',
            expectedOutcome: '[What will be achieved with this budget? What tangible results can members expect?]',
            risksAndConcerns: '[What are the risks of not approving this budget? What happens if costs exceed estimates?]',
            budgetBreakdown: '• Item 1: $X\n• Item 2: $X\n• Contingency (10%): $X\n• Total: $X',
            milestones: '• Week 1: [First milestone]\n• Week 2: [Second milestone]\n• Week 4: [Completion]',
          }
          break

        case 'PROJECT':
          draft = {
            description: `This proposal initiates a new project: ${input.title}\n\n[Provide a comprehensive overview of the project, its goals, and how it aligns with the band's mission.]`,
            problemStatement: '[What opportunity or challenge does this project address? Why should the band pursue this?]',
            expectedOutcome: '[What does success look like? List specific, measurable outcomes.]',
            risksAndConcerns: '[What could go wrong? How will these risks be mitigated?]',
            budgetBreakdown: '[If applicable, break down any costs associated with this project]',
            milestones: '• Phase 1: Planning (Week 1-2)\n• Phase 2: Execution (Week 3-6)\n• Phase 3: Review (Week 7-8)',
          }
          break

        case 'POLICY':
          draft = {
            description: `This proposal suggests a policy change: ${input.title}\n\n[Describe the proposed policy and how it differs from current practices.]`,
            problemStatement: '[What issue with current policy does this address? What incidents or feedback prompted this proposal?]',
            expectedOutcome: '[How will this policy improve band operations? Who benefits and how?]',
            risksAndConcerns: '[Are there any downsides to this policy? How might it be misused or create unintended consequences?]',
            budgetBreakdown: '',
            milestones: '• Effective immediately upon approval\n• Review after 3 months',
          }
          break

        case 'MEMBERSHIP':
          draft = {
            description: `This proposal concerns band membership: ${input.title}\n\n[Describe the membership action being proposed - promotion, role change, etc.]`,
            problemStatement: '[Why is this membership change being proposed? What qualifications or circumstances support this?]',
            expectedOutcome: '[How will this change benefit the band? What new responsibilities or privileges are involved?]',
            risksAndConcerns: '[Are there any concerns about this change? How will transition be handled?]',
            budgetBreakdown: '',
            milestones: '• Effective upon approval',
          }
          break

        default: // GENERAL
          draft = {
            description: `Proposal: ${input.title}\n\n[Provide a clear and detailed description of what you are proposing. Include all relevant information members need to make an informed decision.]`,
            problemStatement: '[What problem or opportunity does this proposal address?]',
            expectedOutcome: '[What will happen if this proposal is approved? What are the expected benefits?]',
            risksAndConcerns: '[What are potential downsides or risks? How can they be addressed?]',
            budgetBreakdown: '',
            milestones: '',
          }
      }

      // If context was provided, add it
      if (input.context) {
        draft.description = draft.description.replace(
          '[Describe',
          `Context: ${input.context}\n\n[Describe`
        )
      }

      return {
        success: true,
        draft,
      }
    }),
})