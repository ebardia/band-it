import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { notificationService } from '../../../services/notification.service'
import { webhookService } from '../../../services/webhook.service'
import { memberBillingTriggers } from '../../services/member-billing-triggers'
import { checkAndSetBandActivation } from './band.dissolve'
import { hasActiveDissolutionVote } from '../../../lib/dues-enforcement'

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
        select: { name: true, slug: true, whoCanApprove: true, dissolvedAt: true },
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

      // Create membership application
      const membership = await prisma.member.create({
        data: {
          userId: input.userId,
          bandId: input.bandId,
          role: 'VOTING_MEMBER', // Default role for applicants
          requestedRole: input.requestedRole,
          status: 'PENDING',
          notes: input.notes,
        },
      })

      // Notify members who can approve
      const approvers = await prisma.member.findMany({
        where: {
          bandId: input.bandId,
          status: 'ACTIVE',
          role: { in: band.whoCanApprove },
        },
        select: { userId: true },
      })

      for (const approver of approvers) {
        await notificationService.create({
          userId: approver.userId,
          type: 'BAND_APPLICATION_RECEIVED',
          actionUrl: `/bands/${band.slug}/applications`,
          priority: 'MEDIUM',
          metadata: {
            userName: applicant.name,
            bandName: band.name,
            bandSlug: band.slug,
            membershipId: membership.id,
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