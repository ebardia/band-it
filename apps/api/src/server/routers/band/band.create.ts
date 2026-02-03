import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { createDefaultChannel } from '../channel'
import { checkAndSetBandActivation } from './band.dissolve'

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
        quorumPercentage: z.number().min(1).max(100).default(50),
        whoCanCreateProposals: z.array(z.enum(['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'])).default(['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']),
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
          // Governance settings
          votingMethod: input.votingMethod,
          votingPeriodDays: input.votingPeriodDays,
          quorumPercentage: input.quorumPercentage,
          whoCanCreateProposals: input.whoCanCreateProposals,
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

      // Check if band should be activated (in case MIN_MEMBERS_TO_ACTIVATE is 1)
      await checkAndSetBandActivation(band.id)

      // Create the default General channel
      await createDefaultChannel(band.id, input.userId)

      return {
        success: true,
        message: 'Band created successfully',
        band,
      }
    }),
})