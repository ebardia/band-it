import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'

export const bandRouter = router({
  /**
   * Create a new band
   */
  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string().min(2, 'Band name must be at least 2 characters'),
        description: z.string().min(10, 'Description must be at least 10 characters'),
        mission: z.string().min(10, 'Mission must be at least 10 characters'),
        values: z.string().min(1, 'Please enter at least one value'),
        skillsLookingFor: z.string().min(1, 'Please enter skills you are looking for'),
        whatMembersWillLearn: z.string().min(1, 'Please enter what members will learn'),
        membershipRequirements: z.string().min(10, 'Please describe membership requirements'),
        whoCanApprove: z.array(z.enum(['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'])),
        zipcode: z.preprocess(
          (val) => (val === '' ? undefined : val),
          z.string().length(5, 'Zipcode must be 5 digits').optional()
        ),
        imageUrl: z.preprocess(
          (val) => (val === '' ? undefined : val),
          z.string().url('Must be a valid URL').optional()
        ),
      })
    )
    .mutation(async ({ input }) => {
      // Convert comma-separated strings to arrays
      const valuesArray = input.values.split(',').map(v => v.trim()).filter(Boolean)
      const skillsArray = input.skillsLookingFor.split(',').map(s => s.trim()).filter(Boolean)
      const learnArray = input.whatMembersWillLearn.split(',').map(l => l.trim()).filter(Boolean)

      // Generate slug from band name
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      // Check if slug already exists
      const existingBand = await prisma.band.findUnique({
        where: { slug },
      })

      if (existingBand) {
        throw new Error('A band with this name already exists')
      }

      // Create band
      const band = await prisma.band.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          mission: input.mission,
          values: valuesArray,
          skillsLookingFor: skillsArray,
          whatMembersWillLearn: learnArray,
          membershipRequirements: input.membershipRequirements,
          whoCanApprove: input.whoCanApprove,
          zipcode: input.zipcode,
          imageUrl: input.imageUrl,
          createdById: input.userId,
          status: 'PENDING', // Starts as pending (only 1 member)
        },
      })

      // Add founder as first member with ACTIVE status
      await prisma.member.create({
        data: {
          userId: input.userId,
          bandId: band.id,
          role: 'FOUNDER',
          status: 'ACTIVE',
        },
      })

      return {
        success: true,
        message: 'Band created successfully',
        band,
      }
    }),

  /**
   * Get all bands
   */
  getAll: publicProcedure.query(async () => {
    const bands = await prisma.band.findMany({
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: {
              where: {
                status: 'ACTIVE',
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
      bands,
    }
  }),

  /**
   * Get bands for a specific user
   */
  getMyBands: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const memberships = await prisma.member.findMany({
        where: {
          userId: input.userId,
          status: 'ACTIVE',
        },
        include: {
          band: {
            include: {
              _count: {
                select: {
                  members: {
                    where: {
                      status: 'ACTIVE',
                    },
                  },
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
        bands: memberships.map((m) => ({
          ...m.band,
          myRole: m.role,
        })),
      }
    }),

  /**
   * Get band by slug
   */
  getBySlug: publicProcedure
    .input(
      z.object({
        slug: z.string(),
      })
    )
    .query(async ({ input }) => {
      const band = await prisma.band.findUnique({
        where: { slug: input.slug },
        include: {
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
          members: {
            where: {
              status: 'ACTIVE',
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
          },
        },
      })

      if (!band) {
        throw new Error('Band not found')
      }

      return {
        success: true,
        band,
      }
    }),

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