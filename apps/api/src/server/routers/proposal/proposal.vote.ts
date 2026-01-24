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
        executionResult: executionResult || undefined,
      }
    }),
})