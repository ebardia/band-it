import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { notificationService } from '../../../services/notification.service'

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

      // Check if band should become active (3+ members)
      const activeMembers = await prisma.member.count({
        where: {
          bandId: membership.bandId,
          status: 'ACTIVE',
        },
      })

      if (activeMembers >= 3 && membership.band.status === 'PENDING') {
        await prisma.band.update({
          where: { id: membership.bandId },
          data: { status: 'ACTIVE' },
        })

        // Notify all members that band is now active
        const allActiveMem = await prisma.member.findMany({
          where: {
            bandId: membership.bandId,
            status: 'ACTIVE',
          },
          select: { userId: true },
        })

        for (const member of allActiveMem) {
          await notificationService.create({
            userId: member.userId,
            type: 'BAND_STATUS_CHANGED',
            actionUrl: `/bands/${membership.band.slug}`,
            priority: 'HIGH',
            metadata: {
              bandName: membership.band.name,
              bandSlug: membership.band.slug,
              status: 'ACTIVE',
            },
            relatedId: membership.bandId,
            relatedType: 'BAND',
          })
        }
      }

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

      // Check if band should go back to PENDING (less than 3 active members)
      const activeMembers = await prisma.member.count({
        where: {
          bandId: input.bandId,
          status: 'ACTIVE',
        },
      })

      if (activeMembers < 3 && membership.band.status === 'ACTIVE') {
        await prisma.band.update({
          where: { id: input.bandId },
          data: { status: 'PENDING' },
        })

        // Notify remaining members
        for (const member of remainingMembers) {
          await notificationService.create({
            userId: member.userId,
            type: 'BAND_STATUS_CHANGED',
            actionUrl: `/bands/${membership.band.slug}`,
            priority: 'HIGH',
            metadata: {
              bandName: membership.band.name,
              bandSlug: membership.band.slug,
              status: 'PENDING',
            },
            relatedId: input.bandId,
            relatedType: 'BAND',
          })
        }
      }

      return {
        success: true,
        message: 'You have left the band',
      }
    }),
})