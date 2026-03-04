import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { notificationService } from '../../../services/notification.service'
import { webhookService } from '../../../services/webhook.service'
import { memberBillingTriggers } from '../../services/member-billing-triggers'
import { checkAndSetBandActivation } from './band.dissolve'
import { hasActiveDissolutionVote } from '../../../lib/dues-enforcement'

// Helper to calculate voting deadline
function calculateVotingDeadline(days: number, hours: number): Date {
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + days)
  deadline.setHours(deadline.getHours() + hours)
  return deadline
}

export const bandApplicationRouter = router({
  /**
   * Apply to join a band
   */
  applyToJoin: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        bandId: z.string(),
        notes: z.string().min(10, 'Please write at least 10 characters about why you want to join'),
        requestedRole: z.enum(['GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if user is already a member
      const existingMembership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
      })

      if (existingMembership) {
        if (existingMembership.status === 'ACTIVE') {
          throw new Error('You are already a member of this band')
        }
        if (existingMembership.status === 'PENDING') {
          throw new Error('You already have a pending application to this band')
        }
        if (existingMembership.status === 'INVITED') {
          throw new Error('You have been invited to this band. Please check your invitations.')
        }
      }

      // Get band and applicant details
      const band = await prisma.band.findUnique({
        where: { id: input.bandId },
        select: {
          name: true,
          slug: true,
          whoCanApprove: true,
          dissolvedAt: true,
          memberApprovalWindowDays: true,
          memberApprovalWindowHours: true,
        },
      })

      const applicant = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { name: true },
      })

      if (!band || !applicant) {
        throw new Error('Band or user not found')
      }

      // Check if band is dissolved
      if (band.dissolvedAt) {
        throw new Error('This band is no longer active')
      }

      // Check if there's an active dissolution vote (membership frozen)
      const dissolutionVoteActive = await hasActiveDissolutionVote(input.bandId)
      if (dissolutionVoteActive) {
        throw new Error('This band has a dissolution vote in progress. New applications are temporarily frozen.')
      }

      // Calculate voting deadline
      const votingDeadline = calculateVotingDeadline(
        band.memberApprovalWindowDays,
        band.memberApprovalWindowHours
      )

      // Create membership application
      const membership = await prisma.member.create({
        data: {
          userId: input.userId,
          bandId: input.bandId,
          role: 'VOTING_MEMBER', // Default role for applicants
          requestedRole: input.requestedRole,
          status: 'PENDING',
          notes: input.notes,
          votingDeadline,
        },
      })

      // Notify all voting members (they can vote on applications)
      const votingMembers = await prisma.member.findMany({
        where: {
          bandId: input.bandId,
          status: 'ACTIVE',
          role: { in: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER'] },
        },
        select: { userId: true },
      })

      for (const member of votingMembers) {
        await notificationService.create({
          userId: member.userId,
          type: 'BAND_APPLICATION_RECEIVED',
          actionUrl: `/bands/${band.slug}/applications`,
          priority: 'MEDIUM',
          metadata: {
            userName: applicant.name,
            bandName: band.name,
            bandSlug: band.slug,
            membershipId: membership.id,
            votingDeadline: votingDeadline.toISOString(),
          },
          relatedId: input.bandId,
          relatedType: 'BAND',
        })
      }

      return {
        success: true,
        message: 'Application submitted successfully',
        membership,
      }
    }),

  /**
   * Get pending applications for a band
   */
  getPendingApplications: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Get band settings for threshold info
      const band = await prisma.band.findUnique({
        where: { id: input.bandId },
        select: {
          memberApprovalThreshold: true,
          memberApprovalQuorum: true,
        },
      })

      // Count voting members
      const votingMemberCount = await prisma.member.count({
        where: {
          bandId: input.bandId,
          status: 'ACTIVE',
          role: { in: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER'] },
        },
      })

      const applications = await prisma.member.findMany({
        where: {
          bandId: input.bandId,
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              strengths: true,
              passions: true,
              developmentPath: true,
            },
          },
          applicationVotes: {
            include: {
              voter: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return {
        success: true,
        applications,
        votingSettings: {
          threshold: band?.memberApprovalThreshold || 50,
          quorum: band?.memberApprovalQuorum || 25,
          totalVotingMembers: votingMemberCount,
          quorumRequired: Math.ceil(((band?.memberApprovalQuorum || 25) / 100) * votingMemberCount),
        },
      }
    }),

  /**
   * Approve application
   */
  approveApplication: publicProcedure
    .input(
      z.object({
        membershipId: z.string(),
        approverId: z.string(),
        role: z.enum(['GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Get the membership
      const membership = await prisma.member.findUnique({
        where: { id: input.membershipId },
        include: {
          band: true,
          user: true,
        },
      })

      if (!membership) {
        throw new Error('Application not found')
      }

      // Check if approver has permission
      const approverMembership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.approverId,
            bandId: membership.bandId,
          },
        },
      })

      if (!approverMembership || !membership.band.whoCanApprove.includes(approverMembership.role)) {
        throw new Error('You do not have permission to approve applications')
      }

      // Check if band is dissolved
      if (membership.band.dissolvedAt) {
        throw new Error('This band is no longer active')
      }

      // Check if there's an active dissolution vote (membership frozen)
      const dissolutionVoteActive = await hasActiveDissolutionVote(membership.bandId)
      if (dissolutionVoteActive) {
        throw new Error('This band has a dissolution vote in progress. Approvals are temporarily frozen.')
      }

      // Approve the application with the specified role (defaults to VOTING_MEMBER)
      const updatedMembership = await prisma.member.update({
        where: { id: input.membershipId },
        data: {
          status: 'ACTIVE',
          role: input.role || 'VOTING_MEMBER',
        },
      })

      // Notify applicant
      await notificationService.create({
        userId: membership.userId,
        type: 'BAND_APPLICATION_APPROVED',
        actionUrl: `/bands/${membership.band.slug}`,
        priority: 'HIGH',
        metadata: {
          bandName: membership.band.name,
          bandSlug: membership.band.slug,
        },
        relatedId: membership.bandId,
        relatedType: 'BAND',
      })

      // Notify all other band members
      const allMembers = await prisma.member.findMany({
        where: {
          bandId: membership.bandId,
          status: 'ACTIVE',
          userId: { not: membership.userId }, // Don't notify the new member again
        },
        select: { userId: true },
      })

      for (const member of allMembers) {
        await notificationService.create({
          userId: member.userId,
          type: 'BAND_MEMBER_JOINED',
          actionUrl: `/bands/${membership.band.slug}/members`,
          priority: 'LOW',
          metadata: {
            userName: membership.user.name,
            bandName: membership.band.name,
            bandSlug: membership.band.slug,
          },
          relatedId: membership.bandId,
          relatedType: 'BAND',
        })
      }

      // Check if band should be activated (reached minimum members)
      await checkAndSetBandActivation(membership.bandId)

      // Trigger billing checks (minimum member reached, 21st member, etc.)
      await memberBillingTriggers.onMemberActivated(membership.bandId)

      // Send webhook to external website (non-blocking)
      webhookService.memberJoined(membership.bandId, {
        name: membership.user.name,
        role: input.role || 'VOTING_MEMBER',
        joinedAt: new Date(),
      }).catch(err => console.error('Webhook error:', err))

      // Sync full member list to external website (includes parent band if applicable)
      webhookService.syncMembersWithParent(membership.bandId)

      return {
        success: true,
        message: 'Application approved',
        membership: updatedMembership,
      }
    }),

  /**
   * Reject application
   */
  rejectApplication: publicProcedure
    .input(
      z.object({
        membershipId: z.string(),
        approverId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Get the membership
      const membership = await prisma.member.findUnique({
        where: { id: input.membershipId },
        include: { 
          band: true,
          user: true,
        },
      })

      if (!membership) {
        throw new Error('Application not found')
      }

      // Check if approver has permission
      const approverMembership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.approverId,
            bandId: membership.bandId,
          },
        },
      })

      if (!approverMembership || !membership.band.whoCanApprove.includes(approverMembership.role)) {
        throw new Error('You do not have permission to reject applications')
      }

      // Reject the application
      const updatedMembership = await prisma.member.update({
        where: { id: input.membershipId },
        data: { status: 'REJECTED' },
      })

      // Notify applicant
      await notificationService.create({
        userId: membership.userId,
        type: 'BAND_APPLICATION_REJECTED',
        actionUrl: `/bands`,
        priority: 'LOW',
        metadata: {
          bandName: membership.band.name,
          bandSlug: membership.band.slug,
        },
        relatedId: membership.bandId,
        relatedType: 'BAND',
      })

      return {
        success: true,
        message: 'Application rejected',
        membership: updatedMembership,
      }
    }),

  /**
   * Vote on a membership application
   */
  voteOnApplication: publicProcedure
    .input(
      z.object({
        membershipId: z.string(),
        voterId: z.string(),
        vote: z.enum(['APPROVE', 'REJECT']),
      })
    )
    .mutation(async ({ input }) => {
      // Get the membership application
      const membership = await prisma.member.findUnique({
        where: { id: input.membershipId },
        include: {
          band: {
            select: {
              id: true,
              name: true,
              slug: true,
              whoCanApprove: true,
              dissolvedAt: true,
            },
          },
          user: {
            select: { name: true },
          },
        },
      })

      if (!membership) {
        throw new Error('Application not found')
      }

      if (membership.status !== 'PENDING') {
        throw new Error('This application has already been processed')
      }

      // Check if voting deadline has passed
      if (membership.votingDeadline && new Date() > membership.votingDeadline) {
        throw new Error('Voting deadline has passed for this application')
      }

      // Check if band is dissolved
      if (membership.band.dissolvedAt) {
        throw new Error('This band is no longer active')
      }

      // Check if there's an active dissolution vote
      const dissolutionVoteActive = await hasActiveDissolutionVote(membership.bandId)
      if (dissolutionVoteActive) {
        throw new Error('This band has a dissolution vote in progress. Voting is temporarily frozen.')
      }

      // Check if voter is a voting member of the band
      const voterMembership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.voterId,
            bandId: membership.bandId,
          },
        },
      })

      if (!voterMembership || voterMembership.status !== 'ACTIVE') {
        throw new Error('You must be an active member of this band to vote')
      }

      const votingRoles = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']
      if (!votingRoles.includes(voterMembership.role)) {
        throw new Error('You do not have voting rights in this band')
      }

      // Get voter info for notification
      const voter = await prisma.user.findUnique({
        where: { id: input.voterId },
        select: { name: true },
      })

      // Upsert the vote (create or update)
      const vote = await prisma.applicationVote.upsert({
        where: {
          memberId_voterId: {
            memberId: input.membershipId,
            voterId: input.voterId,
          },
        },
        create: {
          memberId: input.membershipId,
          voterId: input.voterId,
          vote: input.vote,
        },
        update: {
          vote: input.vote,
          updatedAt: new Date(),
        },
      })

      // Get current vote counts for the response
      const allVotes = await prisma.applicationVote.findMany({
        where: { memberId: input.membershipId },
      })
      const approveCount = allVotes.filter(v => v.vote === 'APPROVE').length
      const rejectCount = allVotes.filter(v => v.vote === 'REJECT').length

      // Voting will be tallied when the deadline is reached (via cron job)
      // No early termination - everyone gets a chance to vote

      return {
        success: true,
        message: `Vote recorded: ${input.vote}. Current tally: ${approveCount} approve, ${rejectCount} reject. Final decision will be made when voting period ends.`,
        vote,
        applicationStatus: 'PENDING',
      }
    }),

  /**
   * Get votes for a specific application
   */
  getApplicationVotes: publicProcedure
    .input(
      z.object({
        membershipId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Verify user is a member of the band
      const membership = await prisma.member.findUnique({
        where: { id: input.membershipId },
        include: {
          band: {
            select: {
              memberApprovalThreshold: true,
              memberApprovalQuorum: true,
            },
          },
        },
      })

      if (!membership) {
        throw new Error('Application not found')
      }

      const userMembership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: membership.bandId,
          },
        },
      })

      if (!userMembership || userMembership.status !== 'ACTIVE') {
        throw new Error('You must be an active member to view votes')
      }

      // Get all votes
      const votes = await prisma.applicationVote.findMany({
        where: { memberId: input.membershipId },
        include: {
          voter: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Count voting members
      const votingMemberCount = await prisma.member.count({
        where: {
          bandId: membership.bandId,
          status: 'ACTIVE',
          role: { in: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER'] },
        },
      })

      const approveVotes = votes.filter(v => v.vote === 'APPROVE').length
      const rejectVotes = votes.filter(v => v.vote === 'REJECT').length

      // Find current user's vote
      const userVote = votes.find(v => v.voterId === input.userId)

      return {
        success: true,
        votes,
        summary: {
          approve: approveVotes,
          reject: rejectVotes,
          total: votes.length,
          totalVotingMembers: votingMemberCount,
          quorumRequired: Math.ceil((membership.band.memberApprovalQuorum / 100) * votingMemberCount),
          threshold: membership.band.memberApprovalThreshold,
          userVote: userVote?.vote || null,
        },
      }
    }),

    /**
   * Get all pending applications for bands where user can approve
   */
  getMyApplicationsToReview: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Get all bands where user is a member
      const memberships = await prisma.member.findMany({
        where: {
          userId: input.userId,
          status: 'ACTIVE',
        },
        include: {
          band: {
            select: {
              id: true,
              name: true,
              slug: true,
              whoCanApprove: true,
            },
          },
        },
      })

      // Filter to bands where user can approve
      const bandsWhereCanApprove = memberships.filter(
        (m) => m.band.whoCanApprove.includes(m.role)
      )

      if (bandsWhereCanApprove.length === 0) {
        return { success: true, applications: [] }
      }

      // Get all pending applications for those bands
      const applications = await prisma.member.findMany({
        where: {
          bandId: { in: bandsWhereCanApprove.map((m) => m.bandId) },
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              strengths: true,
              passions: true,
              developmentPath: true,
            },
          },
          band: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return {
        success: true,
        applications,
      }
    }),
})