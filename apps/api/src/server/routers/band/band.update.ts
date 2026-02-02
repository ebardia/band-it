import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'

export const bandUpdateRouter = router({
  /**
   * Update band details (founder/governor only)
   */
  updateDetails: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        name: z.string().min(2, 'Band name must be at least 2 characters').optional(),
        description: z.string().min(10, 'Description must be at least 10 characters').optional(),
        mission: z.string().min(10, 'Mission must be at least 10 characters').optional(),
        values: z.string().min(1, 'Please enter at least one value').optional(),
        skillsLookingFor: z.string().min(1, 'Please enter skills you are looking for').optional(),
        whatMembersWillLearn: z.string().min(1, 'Please enter what members will learn').optional(),
        membershipRequirements: z.string().min(10, 'Please describe membership requirements').optional(),
        zipcode: z.preprocess(
          (val) => (val === '' ? undefined : val),
          z.string().length(5, 'Zipcode must be 5 digits').optional()
        ),
        imageUrl: z.preprocess(
          (val) => (val === '' ? undefined : val),
          z.string().url('Must be a valid URL').optional().nullable()
        ),
      })
    )
    .mutation(async ({ input }) => {
      // Check if user is a founder or governor
      const member = await prisma.member.findFirst({
        where: {
          bandId: input.bandId,
          userId: input.userId,
          status: 'ACTIVE',
          role: { in: ['FOUNDER', 'GOVERNOR'] },
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only founders and governors can edit band details',
        })
      }

      const updateData: any = {}

      if (input.name !== undefined) {
        // Check if new name would create duplicate slug
        const newSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const existingBand = await prisma.band.findFirst({
          where: {
            slug: newSlug,
            id: { not: input.bandId },
          },
        })
        if (existingBand) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'A band with this name already exists',
          })
        }
        updateData.name = input.name
        updateData.slug = newSlug
      }

      if (input.description !== undefined) updateData.description = input.description
      if (input.mission !== undefined) updateData.mission = input.mission
      if (input.membershipRequirements !== undefined) updateData.membershipRequirements = input.membershipRequirements
      if (input.zipcode !== undefined) updateData.zipcode = input.zipcode
      if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl

      // Convert comma-separated strings to arrays
      if (input.values !== undefined) {
        updateData.values = input.values.split(',').map((v: string) => v.trim()).filter(Boolean)
      }
      if (input.skillsLookingFor !== undefined) {
        updateData.skillsLookingFor = input.skillsLookingFor.split(',').map((s: string) => s.trim()).filter(Boolean)
      }
      if (input.whatMembersWillLearn !== undefined) {
        updateData.whatMembersWillLearn = input.whatMembersWillLearn.split(',').map((l: string) => l.trim()).filter(Boolean)
      }

      const updatedBand = await prisma.band.update({
        where: { id: input.bandId },
        data: updateData,
      })

      return { band: updatedBand }
    }),
})
