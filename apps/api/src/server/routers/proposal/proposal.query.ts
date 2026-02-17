import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'

// Roles that can vote
const CAN_VOTE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']

export const proposalQueryRouter = router({
  /**
   * Get all proposals for a band
   */
  getByBand: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        status: z.enum(['DRAFT', 'PENDING_REVIEW', 'OPEN', 'CLOSED', 'APPROVED', 'REJECTED', 'WITHDRAWN']).optional(),
        type: z.enum(['GENERAL', 'BUDGET', 'PROJECT', 'POLICY', 'MEMBERSHIP', 'DISSOLUTION', 'ADD_FOUNDER']).optional(),
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
          reviewedBy: {
            select: { id: true, name: true },
          },
          lastEditedBy: {
            select: { id: true, name: true },
          },
          band: {
            select: {
              id: true,
              name: true,
              slug: true,
              votingMethod: true,
              votingPeriodDays: true,
              quorumPercentage: true,
              requireProposalReview: true,
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

      // Calculate quorum
      const quorumPercentage = proposal.band.quorumPercentage
      const participationPercentage = eligibleVoters > 0 ? (totalVotes / eligibleVoters) * 100 : 0
      const quorumMet = participationPercentage >= quorumPercentage

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
          quorum: {
            required: quorumPercentage,
            actual: Math.round(participationPercentage),
            met: quorumMet,
          },
        },
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
   * Get all proposals created by user across all bands they're still active in
   */
  getMyProposals: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Get bands where user is still an active member
      const activeMemberships = await prisma.member.findMany({
        where: {
          userId: input.userId,
          status: 'ACTIVE',
        },
        select: { bandId: true },
      })

      const activeBandIds = activeMemberships.map(m => m.bandId)

      const proposals = await prisma.proposal.findMany({
        where: {
          createdById: input.userId,
          bandId: { in: activeBandIds },
        },
        include: {
          band: {
            select: { id: true, name: true, slug: true },
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
})