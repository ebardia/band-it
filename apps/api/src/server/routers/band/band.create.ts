import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { createDefaultChannel } from '../channel'
import { checkAndSetBandActivation } from './band.dissolve'
import { analyticsService } from '../../services/analytics.service'
import { createOnboarding } from '../../../lib/onboarding/milestones'

export const bandCreateRouter = router({
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
        // Governance settings
        votingMethod: z.enum(['SIMPLE_MAJORITY', 'SUPERMAJORITY_66', 'SUPERMAJORITY_75', 'UNANIMOUS']).default('SIMPLE_MAJORITY'),
        votingPeriodDays: z.number().min(1).max(30).default(7),
        votingPeriodHours: z.number().min(1).max(720).nullable().optional(),  // 1 hour to 30 days in hours
        quorumPercentage: z.number().min(1).max(100).default(50),
        whoCanCreateProposals: z.array(z.enum(['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'])).default(['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']),
        zipcode: z.preprocess(
          (val) => (val === '' ? undefined : val),
          z.string().min(3, 'Postal code must be at least 3 characters').max(10, 'Postal code must be at most 10 characters').optional()
        ),
        imageUrl: z.preprocess(
          (val) => (val === '' ? undefined : val),
          z.string().url('Must be a valid URL').optional()
        ),
        // Big Band - parent band ID for creating sub-bands
        parentBandId: z.string().optional(),
        // Onboarding template ID
        templateId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // If creating a sub-band, validate parent band
      if (input.parentBandId) {
        const parentBand = await prisma.band.findUnique({
          where: { id: input.parentBandId },
          include: {
            members: {
              where: {
                userId: input.userId,
                status: 'ACTIVE',
              },
            },
          },
        })

        if (!parentBand) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Parent band not found',
          })
        }

        if (parentBand.dissolvedAt) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot create sub-band under a dissolved band',
          })
        }

        // Prevent nesting - parent cannot itself be a sub-band
        if (parentBand.parentBandId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot create nested sub-bands. Parent band is already a sub-band.',
          })
        }

        // Check if user is FOUNDER or GOVERNOR of parent band
        const membership = parentBand.members[0]
        if (!membership || !['FOUNDER', 'GOVERNOR'].includes(membership.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only Founders and Governors of the Big Band can create sub-bands',
          })
        }
      }

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
          // Governance settings
          votingMethod: input.votingMethod,
          votingPeriodDays: input.votingPeriodDays,
          votingPeriodHours: input.votingPeriodHours,
          quorumPercentage: input.quorumPercentage,
          whoCanCreateProposals: input.whoCanCreateProposals,
          zipcode: input.zipcode,
          imageUrl: input.imageUrl,
          createdById: input.userId,
          parentBandId: input.parentBandId || null,
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

      // Check if band should be activated (in case MIN_MEMBERS_TO_ACTIVATE is 1)
      await checkAndSetBandActivation(band.id)

      // Create the default General channel
      await createDefaultChannel(band.id, input.userId)

      // Initialize onboarding if template was selected
      if (input.templateId) {
        await createOnboarding(band.id, input.templateId)
      }

      // Track band creation event
      await analyticsService.trackEvent('band_created', {
        userId: input.userId,
        metadata: {
          bandId: band.id,
          bandName: band.name,
          isSubBand: !!input.parentBandId,
          parentBandId: input.parentBandId || null,
          templateId: input.templateId || null,
        },
      })

      return {
        success: true,
        message: 'Band created successfully',
        band,
      }
    }),
})