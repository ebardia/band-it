import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { notificationService } from '../../../services/notification.service'
import { proposalEffectsService } from '../../../services/proposal-effects.service'

// Roles that can vote
const CAN_VOTE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']

export const proposalVoteRouter = router({
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
        forceClose: z.boolean().optional(), // Only founders can force close before deadline
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

      const isFounder = membership?.role === 'FOUNDER'
      const canClose = proposal.createdById === input.userId ||
                       isFounder ||
                       membership?.role === 'GOVERNOR'

      if (!canClose) {
        throw new Error('You do not have permission to close this proposal')
      }

      // Check if voting deadline has passed
      const now = new Date()
      const deadlinePassed = now > proposal.votingEndsAt

      if (!deadlinePassed) {
        if (input.forceClose && isFounder) {
          // Founders can force close early
        } else if (input.forceClose) {
          throw new Error('Only founders can force close a proposal before the deadline')
        } else {
          throw new Error('Voting period has not ended yet. The deadline is ' + proposal.votingEndsAt.toLocaleDateString())
        }
      }

      // Get count of eligible voters (members with voting roles)
      const eligibleVoters = await prisma.member.count({
        where: {
          bandId: proposal.bandId,
          status: 'ACTIVE',
          role: { in: CAN_VOTE as any },
        },
      })

      // Calculate results
      const yesVotes = proposal.votes.filter(v => v.vote === 'YES').length
      const noVotes = proposal.votes.filter(v => v.vote === 'NO').length
      const abstainVotes = proposal.votes.filter(v => v.vote === 'ABSTAIN').length
      const totalVoters = yesVotes + noVotes + abstainVotes // All who participated
      const totalVotes = yesVotes + noVotes // Abstain doesn't count toward decision

      // Check quorum (minimum participation)
      const quorumPercentage = proposal.band.quorumPercentage
      const participationPercentage = eligibleVoters > 0 ? (totalVoters / eligibleVoters) * 100 : 0
      const quorumMet = participationPercentage >= quorumPercentage

      let approved = false
      let rejectionReason: string | null = null

      if (!quorumMet) {
        // Quorum not met - proposal fails
        approved = false
        rejectionReason = `Quorum not met: ${totalVoters} of ${eligibleVoters} eligible voters participated (${participationPercentage.toFixed(0)}%), needed ${quorumPercentage}%`
      } else if (totalVotes > 0) {
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

      // If approved, execute based on execution type
      let executionResult: { success: boolean; error?: string } | null = null
      if (approved) {
        switch (proposal.executionType) {
          case 'GOVERNANCE':
          case 'ACTION':
            // Execute declarative effects
            if (proposal.effects) {
              executionResult = await proposalEffectsService.executeAndLogEffects(
                {
                  id: proposal.id,
                  bandId: proposal.bandId,
                  executionSubtype: proposal.executionSubtype,
                  effects: proposal.effects,
                },
                input.userId
              )
            }
            break

          case 'PROJECT':
            // Create project from proposal (existing behavior)
            // This is handled separately via the project creation flow
            // The frontend typically prompts to create a project after approval
            break

          case 'RESOLUTION':
            // Just a recorded decision - nothing to execute
            break
        }
      }

      // Notify all band members
      const allMembers = await prisma.member.findMany({
        where: {
          bandId: proposal.bandId,
          status: 'ACTIVE',
        },
        select: { userId: true },
      })

      const resultMessage = approved
        ? 'approved'
        : rejectionReason
          ? `rejected (${rejectionReason})`
          : 'rejected'

      for (const member of allMembers) {
        await notificationService.create({
          userId: member.userId,
          type: approved ? 'PROPOSAL_APPROVED' : 'PROPOSAL_REJECTED',
          title: approved ? 'Proposal Approved' : 'Proposal Rejected',
          message: `"${proposal.title}" was ${resultMessage}`,
          actionUrl: `/bands/${proposal.band.slug}/proposals/${proposal.id}`,
          priority: 'MEDIUM',
          relatedId: proposal.id,
          relatedType: 'PROPOSAL',
        })
      }

      return {
        success: true,
        message: `Proposal ${resultMessage}`,
        proposal: updatedProposal,
        quorumInfo: {
          required: quorumPercentage,
          actual: Math.round(participationPercentage),
          met: quorumMet,
          eligibleVoters,
          totalVoters,
        },
        executionResult: executionResult || undefined,
      }
    }),
})