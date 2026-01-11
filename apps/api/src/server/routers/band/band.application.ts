import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'

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

      // Create membership application
      const membership = await prisma.member.create({
        data: {
          userId: input.userId,
          bandId: input.bandId,
          role: 'VOTING_MEMBER', // Default role for applicants
          status: 'PENDING',
          notes: input.notes,
        },
      })

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
      })
    )
    .mutation(async ({ input }) => {
      // Get the membership
      const membership = await prisma.member.findUnique({
        where: { id: input.membershipId },
        include: { band: true },
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

      // Approve the application
      const updatedMembership = await prisma.member.update({
        where: { id: input.membershipId },
        data: { status: 'ACTIVE' },
      })

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
      }

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
        include: { band: true },
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

      return {
        success: true,
        message: 'Application rejected',
        membership: updatedMembership,
      }
    }),
})