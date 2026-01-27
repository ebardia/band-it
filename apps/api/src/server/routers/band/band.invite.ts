import { z } from 'zod'
import crypto from 'crypto'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { notificationService } from '../../../services/notification.service'
import { emailService } from '../../services/email.service'
import { memberBillingTriggers } from '../../services/member-billing-triggers'
import { checkAndSetBandActivation } from './band.dissolve'

// Roles that can invite members
const CAN_INVITE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const bandInviteRouter = router({
  /**
   * Search for users by email or name
   */
  searchUsers: publicProcedure
    .input(
      z.object({
        query: z.string().min(2, 'Search query must be at least 2 characters'),
        bandId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: input.query, mode: 'insensitive' } },
            { name: { contains: input.query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          strengths: true,
          passions: true,
          developmentPath: true,
        },
        take: 10,
      })

      // Filter out users who are already members
      const existingMembers = await prisma.member.findMany({
        where: {
          bandId: input.bandId,
          userId: { in: users.map(u => u.id) },
        },
        select: { userId: true },
      })

      const existingMemberIds = new Set(existingMembers.map(m => m.userId))
      const availableUsers = users.filter(u => !existingMemberIds.has(u.id))

      return {
        success: true,
        users: availableUsers,
      }
    }),

  /**
   * Invite user to band
   */
  inviteUser: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        inviterId: z.string(),
        userId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if inviter is a member
      const inviterMembership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.inviterId,
            bandId: input.bandId,
          },
        },
        include: { 
          band: true,
          user: true,
        },
      })

      if (!inviterMembership) {
        throw new Error('You are not a member of this band')
      }

      // Check if user is already a member or invited
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
          throw new Error('User is already a member of this band')
        }
        if (existingMembership.status === 'INVITED') {
          throw new Error('User has already been invited')
        }
        if (existingMembership.status === 'PENDING') {
          throw new Error('User has already applied to join')
        }
      }

      // Get invitee details
      const invitee = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { name: true },
      })

      // Create invitation
      const membership = await prisma.member.create({
        data: {
          userId: input.userId,
          bandId: input.bandId,
          role: 'VOTING_MEMBER',
          status: 'INVITED',
          invitedBy: input.inviterId,
          notes: input.notes,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      // Create notification for invitee
      await notificationService.create({
        userId: input.userId,
        type: 'BAND_INVITE_RECEIVED',
        actionUrl: `/invitations`,
        priority: 'HIGH',
        metadata: {
          inviterName: inviterMembership.user.name,
          bandName: inviterMembership.band.name,
          bandSlug: inviterMembership.band.slug,
          membershipId: membership.id,
        },
        relatedId: input.bandId,
        relatedType: 'BAND',
      })

      return {
        success: true,
        message: 'Invitation sent successfully',
        membership,
      }
    }),

  /**
   * Get invitations for a user
   */
  getMyInvitations: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const invitations = await prisma.member.findMany({
        where: {
          userId: input.userId,
          status: 'INVITED',
        },
        include: {
          band: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return {
        success: true,
        invitations,
      }
    }),

  /**
   * Accept invitation
   */
  acceptInvitation: publicProcedure
    .input(
      z.object({
        membershipId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const membership = await prisma.member.findUnique({
        where: { id: input.membershipId },
        include: {
          band: true,
          user: true,
        },
      })

      if (!membership || membership.userId !== input.userId) {
        throw new Error('Invitation not found')
      }

      if (membership.status !== 'INVITED') {
        throw new Error('This invitation is no longer valid')
      }

      // Check if band is dissolved
      if (membership.band.dissolvedAt) {
        throw new Error('This band is no longer active')
      }

      // Get inviter details
      const inviter = membership.invitedBy ? await prisma.user.findUnique({
        where: { id: membership.invitedBy },
        select: { id: true, name: true },
      }) : null

      // Accept the invitation
      const updatedMembership = await prisma.member.update({
        where: { id: input.membershipId },
        data: { status: 'ACTIVE' },
      })

      // Notify inviter
      if (inviter) {
        await notificationService.create({
          userId: inviter.id,
          type: 'BAND_INVITE_ACCEPTED',
          actionUrl: `/bands/${membership.band.slug}`,
          priority: 'MEDIUM',
          metadata: {
            userName: membership.user.name,
            bandName: membership.band.name,
            bandSlug: membership.band.slug,
          },
          relatedId: membership.bandId,
          relatedType: 'BAND',
        })
      }

      // Notify all band members
      const allMembers = await prisma.member.findMany({
        where: {
          bandId: membership.bandId,
          status: 'ACTIVE',
          userId: { not: input.userId }, // Don't notify the new member
        },
        select: { userId: true },
      })

      for (const member of allMembers) {
        await notificationService.create({
          userId: member.userId,
          type: 'BAND_MEMBER_JOINED',
          actionUrl: `/bands/${membership.band.slug}`,
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

      // Check if band should be activated (reached 3 members)
      await checkAndSetBandActivation(membership.bandId)

      // Trigger billing checks (3rd member, 21st member, etc.)
      await memberBillingTriggers.onMemberActivated(membership.bandId)

      return {
        success: true,
        message: 'Invitation accepted',
        membership: updatedMembership,
      }
    }),

  /**
   * Decline invitation
   */
  declineInvitation: publicProcedure
    .input(
      z.object({
        membershipId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const membership = await prisma.member.findUnique({
        where: { id: input.membershipId },
        include: {
          band: true,
          user: true,
        },
      })

      if (!membership || membership.userId !== input.userId) {
        throw new Error('Invitation not found')
      }

      if (membership.status !== 'INVITED') {
        throw new Error('This invitation is no longer valid')
      }

      // Get inviter details
      const inviter = membership.invitedBy ? await prisma.user.findUnique({
        where: { id: membership.invitedBy },
        select: { id: true },
      }) : null

      // Delete the invitation
      await prisma.member.delete({
        where: { id: input.membershipId },
      })

      // Notify inviter
      if (inviter) {
        await notificationService.create({
          userId: inviter.id,
          type: 'BAND_INVITE_DECLINED',
          actionUrl: `/bands/${membership.band.slug}`,
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

      return {
        success: true,
        message: 'Invitation declined',
      }
    }),

  /**
   * Leave a band
   */
  leaveBand: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Get membership
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
        include: { 
          band: true,
          user: true,
        },
      })

      if (!membership) {
        throw new Error('You are not a member of this band')
      }

      // Check if user is the founder
      if (membership.role === 'FOUNDER') {
        throw new Error('Founders cannot leave the band. Please transfer ownership or dissolve the band first.')
      }

      // Delete membership
      await prisma.member.delete({
        where: { id: membership.id },
      })

      // Notify all remaining members
      const remainingMembers = await prisma.member.findMany({
        where: {
          bandId: input.bandId,
          status: 'ACTIVE',
        },
        select: { userId: true },
      })

      for (const member of remainingMembers) {
        await notificationService.create({
          userId: member.userId,
          type: 'BAND_MEMBER_LEFT',
          actionUrl: `/bands/${membership.band.slug}`,
          priority: 'LOW',
          metadata: {
            userName: membership.user.name,
            bandName: membership.band.name,
            bandSlug: membership.band.slug,
          },
          relatedId: input.bandId,
          relatedType: 'BAND',
        })
      }

      // Trigger billing checks (member count changes, billing owner left, etc.)
      await memberBillingTriggers.onMemberRemoved(input.bandId, input.userId)

      return {
        success: true,
        message: 'You have left the band',
      }
    }),

  /**
   * Invite someone by email - works for both existing and non-existing users
   */
  inviteByEmail: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        inviterId: z.string(),
        email: z.string().email('Invalid email address'),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { bandId, inviterId, email, notes } = input
      const normalizedEmail = email.toLowerCase().trim()

      // Get inviter's membership and band info
      const inviterMembership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: inviterId,
            bandId,
          },
        },
        include: {
          band: true,
          user: {
            select: { id: true, name: true },
          },
        },
      })

      if (!inviterMembership) {
        throw new Error('You are not a member of this band')
      }

      // Check if inviter has permission
      if (!CAN_INVITE.includes(inviterMembership.role)) {
        throw new Error('You do not have permission to invite members')
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, name: true, email: true },
      })

      if (existingUser) {
        // User exists - check if already a member or invited
        const existingMembership = await prisma.member.findUnique({
          where: {
            userId_bandId: {
              userId: existingUser.id,
              bandId,
            },
          },
        })

        if (existingMembership) {
          if (existingMembership.status === 'ACTIVE') {
            throw new Error('This user is already a member of this band')
          }
          if (existingMembership.status === 'INVITED') {
            throw new Error('This user has already been invited')
          }
          if (existingMembership.status === 'PENDING') {
            throw new Error('This user has already applied to join')
          }
        }

        // Create invitation for existing user
        const membership = await prisma.member.create({
          data: {
            userId: existingUser.id,
            bandId,
            role: 'VOTING_MEMBER',
            status: 'INVITED',
            invitedBy: inviterId,
            notes,
          },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        })

        // Create in-app notification
        await notificationService.create({
          userId: existingUser.id,
          type: 'BAND_INVITE_RECEIVED',
          actionUrl: '/invitations',
          priority: 'HIGH',
          metadata: {
            inviterName: inviterMembership.user.name,
            bandName: inviterMembership.band.name,
            bandSlug: inviterMembership.band.slug,
            membershipId: membership.id,
          },
          relatedId: bandId,
          relatedType: 'BAND',
        })

        // Send email notification
        await emailService.sendExistingUserInviteEmail({
          email: existingUser.email,
          userName: existingUser.name,
          bandName: inviterMembership.band.name,
          inviterName: inviterMembership.user.name,
          notes,
        })

        return {
          success: true,
          message: `Invitation sent to ${existingUser.name}`,
          type: 'existing_user',
          membership,
        }
      } else {
        // User doesn't exist - create pending invite

        // Check if already has pending invite for this band
        const existingInvite = await prisma.pendingInvite.findUnique({
          where: {
            email_bandId: {
              email: normalizedEmail,
              bandId,
            },
          },
        })

        if (existingInvite) {
          throw new Error('An invitation has already been sent to this email')
        }

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex')

        // Set expiration to 7 days from now
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        // Create pending invite
        const pendingInvite = await prisma.pendingInvite.create({
          data: {
            email: normalizedEmail,
            bandId,
            invitedById: inviterId,
            role: 'VOTING_MEMBER',
            token,
            expiresAt,
            notes,
          },
          include: {
            band: {
              select: { id: true, name: true, slug: true },
            },
          },
        })

        // Send invite email
        await emailService.sendBandInviteEmail({
          email: normalizedEmail,
          bandName: inviterMembership.band.name,
          inviterName: inviterMembership.user.name,
          inviteToken: token,
          notes,
        })

        return {
          success: true,
          message: `Invitation email sent to ${normalizedEmail}`,
          type: 'new_user',
          pendingInvite: {
            id: pendingInvite.id,
            email: pendingInvite.email,
            expiresAt: pendingInvite.expiresAt,
          },
        }
      }
    }),

  /**
   * Get pending invites for a band (admin view)
   */
  getPendingInvites: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { bandId, userId } = input

      // Check user is a member with permission
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId, bandId },
        },
      })

      if (!membership || !CAN_INVITE.includes(membership.role)) {
        throw new Error('You do not have permission to view pending invites')
      }

      const pendingInvites = await prisma.pendingInvite.findMany({
        where: {
          bandId,
          expiresAt: { gt: new Date() }, // Only non-expired
        },
        include: {
          invitedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return {
        success: true,
        pendingInvites,
      }
    }),

  /**
   * Cancel/revoke a pending invite
   */
  cancelPendingInvite: publicProcedure
    .input(
      z.object({
        inviteId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { inviteId, userId } = input

      const pendingInvite = await prisma.pendingInvite.findUnique({
        where: { id: inviteId },
        include: { band: true },
      })

      if (!pendingInvite) {
        throw new Error('Invite not found')
      }

      // Check user has permission
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId,
            bandId: pendingInvite.bandId,
          },
        },
      })

      if (!membership || !CAN_INVITE.includes(membership.role)) {
        throw new Error('You do not have permission to cancel invites')
      }

      await prisma.pendingInvite.delete({
        where: { id: inviteId },
      })

      return {
        success: true,
        message: 'Invitation cancelled',
      }
    }),
})