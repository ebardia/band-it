import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { notificationService } from '../../../services/notification.service'
import { proposalEffectsService } from '../../../services/proposal-effects.service'
import { requireGoodStanding } from '../../../lib/dues-enforcement'
import { executeDissolution, checkDissolutionVotePassed } from '../../../lib/band-dissolution'
import { checkAndAdvanceOnboarding } from '../../../lib/onboarding/milestones'

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

      if (!proposal.votingEndsAt || new Date() > proposal.votingEndsAt) {
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

      // ADD_FOUNDER: only founders can vote
      if (proposal.type === 'ADD_FOUNDER') {
        if (membership.role !== 'FOUNDER') {
          throw new Error('Only founders can vote on founder nomination proposals')
        }
      }

      // Check dues standing
      await requireGoodStanding(proposal.bandId, input.userId)

      // Dissolution proposals don't allow abstain
      if (proposal.type === 'DISSOLUTION' && input.vote === 'ABSTAIN') {
        throw new Error('Abstaining is not allowed on dissolution proposals. You must vote YES or NO.')
      }

      // ADD_FOUNDER proposals don't allow abstain
      if (proposal.type === 'ADD_FOUNDER' && input.vote === 'ABSTAIN') {
        throw new Error('Abstaining is not allowed on founder nomination proposals. You must vote YES or NO.')
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

      if (!membership || membership.status !== 'ACTIVE') {
        throw new Error('You must be an active member of this band to close proposals')
      }

      const isFounder = membership.role === 'FOUNDER'
      const canClose = proposal.createdById === input.userId ||
                       isFounder ||
                       membership.role === 'GOVERNOR'

      if (!canClose) {
        throw new Error('You do not have permission to close this proposal')
      }

      // Check if voting deadline has passed
      const now = new Date()
      const deadlinePassed = proposal.votingEndsAt ? now > proposal.votingEndsAt : false

      if (!deadlinePassed) {
        if (input.forceClose && isFounder) {
          // Founders can force close early
        } else if (input.forceClose) {
          throw new Error('Only founders can force close a proposal before the deadline')
        } else {
          throw new Error('Voting period has not ended yet. The deadline is ' + (proposal.votingEndsAt?.toLocaleDateString() || 'unknown'))
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

      // DISSOLUTION proposals have special voting rules
      if (proposal.type === 'DISSOLUTION') {
        // Unanimous among those who voted (non-voters are excluded)
        // At least one person must have voted
        if (totalVoters === 0) {
          approved = false
          rejectionReason = 'No votes were cast'
        } else if (noVotes > 0) {
          approved = false
          rejectionReason = `Dissolution requires unanimous YES votes. ${noVotes} member(s) voted NO.`
        } else {
          // All voters said YES
          approved = true
        }
      } else if (proposal.type === 'ADD_FOUNDER') {
        // ADD_FOUNDER: Requires unanimous YES from all founders who voted
        // Get all active founders
        const founders = await prisma.member.findMany({
          where: { bandId: proposal.bandId, status: 'ACTIVE', role: 'FOUNDER' }
        })

        const founderVotes = proposal.votes.filter(v =>
          founders.some(f => f.userId === v.userId)
        )
        const founderNoVotes = founderVotes.filter(v => v.vote === 'NO').length

        if (founderVotes.length === 0) {
          approved = false
          rejectionReason = 'No founders voted'
        } else if (founderNoVotes > 0) {
          approved = false
          rejectionReason = `Founder nomination requires unanimous YES votes. ${founderNoVotes} founder(s) voted NO.`
        } else {
          // All founder voters said YES
          approved = true
        }
      } else if (!quorumMet) {
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

      // Check onboarding progress (proposal passed = milestone 7)
      if (approved) {
        checkAndAdvanceOnboarding(proposal.bandId).catch(err =>
          console.error('Error checking onboarding:', err)
        )
      }

      // If approved, execute based on proposal type and execution type
      let executionResult: { success: boolean; error?: string; stripeErrors?: string[] } | null = null
      if (approved) {
        // Handle DISSOLUTION proposals specially
        if (proposal.type === 'DISSOLUTION') {
          try {
            const dissolutionResult = await executeDissolution(
              proposal.bandId,
              proposal.createdById, // The person who created the dissolution proposal
              proposal.description, // The reason
              'PROPOSAL'
            )
            executionResult = {
              success: true,
              stripeErrors: dissolutionResult.stripeErrors,
            }
          } catch (error) {
            console.error('Dissolution execution error:', error)
            executionResult = {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to execute dissolution',
            }
          }
        } else if (proposal.type === 'ADD_FOUNDER') {
          // Execute the role change directly
          try {
            const effects = Array.isArray(proposal.effects) ? proposal.effects : []
            const effect = effects[0] as any
            const targetMemberId = effect?.payload?.targetMemberId
            const targetUserId = effect?.payload?.targetUserId

            if (targetMemberId && targetUserId) {
              await prisma.member.update({
                where: { id: targetMemberId },
                data: { role: 'FOUNDER' }
              })

              // Notify new founder
              await notificationService.create({
                userId: targetUserId,
                type: 'BAND_STATUS_CHANGED',
                title: 'You are now a Co-Founder!',
                message: `The founders unanimously approved your nomination in ${proposal.band.name}. You now have full founder privileges.`,
                actionUrl: `/bands/${proposal.band.slug}`,
                priority: 'HIGH',
              })

              executionResult = { success: true }
            } else {
              executionResult = {
                success: false,
                error: 'Missing target member information in proposal effects',
              }
            }
          } catch (error) {
            console.error('ADD_FOUNDER execution error:', error)
            executionResult = {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to promote member to founder',
            }
          }
        } else {
          switch (proposal.executionType) {
            case 'GOVERNANCE':
            case 'ACTION':
              // Execute declarative effects
              if (proposal.effects) {
                try {
                  executionResult = await proposalEffectsService.executeAndLogEffects(
                    {
                      id: proposal.id,
                      bandId: proposal.bandId,
                      executionSubtype: proposal.executionSubtype,
                      effects: proposal.effects,
                    },
                    input.userId
                  )
                } catch (error) {
                  console.error('Effects execution error:', error)
                  executionResult = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to execute proposal effects',
                  }
                }
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
      }

      // Notify all band members (non-blocking - don't fail the close if notifications fail)
      const resultMessage = approved
        ? 'approved'
        : rejectionReason
          ? `rejected (${rejectionReason})`
          : 'rejected'

      try {
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
            message: `"${proposal.title}" was ${resultMessage}`,
            actionUrl: `/bands/${proposal.band.slug}/proposals/${proposal.id}`,
            priority: 'MEDIUM',
            relatedId: proposal.id,
            relatedType: 'PROPOSAL',
          })
        }
      } catch (notifyError) {
        console.error('Error sending proposal close notifications:', notifyError)
        // Don't fail the close operation if notifications fail
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