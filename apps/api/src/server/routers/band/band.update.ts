import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { checkAndAdvanceOnboarding } from '../../../lib/onboarding/milestones'
import {
  businessBandUpdateInputSchema,
  optionalUrl,
  parseCommaValues,
} from '../../../lib/band-profile-validation'

export const agencyBigBandUpdateInputSchema = z.object({
  bandId: z.string(),
  userId: z.string(),
  name: z.string().min(2).optional(),
  mission: z.string().min(10).optional(),
  productsOffered: z.array(z.string()).min(1).optional(),
  productsOther: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  clientSearchRadiusMiles: z.number().int().min(1).max(500).optional(),
  logoUrl: optionalUrl.nullable(),
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  zipcode: z.string().min(3).max(10).optional(),
  country: z.string().optional(),
  websiteUrl: optionalUrl.nullable(),
  facebookUrl: optionalUrl.nullable(),
  instagramUrl: optionalUrl.nullable(),
  xUrl: optionalUrl.nullable(),
  tiktokUrl: optionalUrl.nullable(),
  youtubeUrl: optionalUrl.nullable(),
})

export const bandUpdateRouter = router({
  /**
   * Update client business band details (founder/governor only)
   */
  updateDetails: publicProcedure
    .input(businessBandUpdateInputSchema)
    .mutation(async ({ input }) => {
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

      const band = await prisma.band.findUnique({ where: { id: input.bandId } })
      if (!band || band.isBigBand) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Use updateAgencyProfile for agency bands',
        })
      }

      const updateData: Record<string, unknown> = {}

      if (input.name !== undefined) {
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

      if (input.businessType !== undefined) updateData.businessType = input.businessType
      if (input.description !== undefined) updateData.description = input.description
      if (input.mission !== undefined) updateData.mission = input.mission
      if (input.values !== undefined) updateData.values = parseCommaValues(input.values)
      if (input.servicesOffered !== undefined) updateData.servicesOffered = input.servicesOffered
      if (input.servicesOther !== undefined) updateData.servicesOther = input.servicesOther ?? null
      if (input.serviceAreaMiles !== undefined) updateData.serviceAreaMiles = input.serviceAreaMiles
      if (input.addressLine1 !== undefined) updateData.addressLine1 = input.addressLine1
      if (input.addressLine2 !== undefined) updateData.addressLine2 = input.addressLine2 ?? null
      if (input.city !== undefined) updateData.city = input.city
      if (input.state !== undefined) updateData.state = input.state
      if (input.zipcode !== undefined) updateData.zipcode = input.zipcode
      if (input.country !== undefined) updateData.country = input.country
      if (input.logoUrl !== undefined) updateData.imageUrl = input.logoUrl
      if (input.websiteUrl !== undefined) updateData.websiteUrl = input.websiteUrl
      if (input.facebookUrl !== undefined) updateData.facebookUrl = input.facebookUrl
      if (input.instagramUrl !== undefined) updateData.instagramUrl = input.instagramUrl
      if (input.xUrl !== undefined) updateData.xUrl = input.xUrl
      if (input.tiktokUrl !== undefined) updateData.tiktokUrl = input.tiktokUrl
      if (input.youtubeUrl !== undefined) updateData.youtubeUrl = input.youtubeUrl

      const updatedBand = await prisma.band.update({
        where: { id: input.bandId },
        data: updateData,
      })

      await checkAndAdvanceOnboarding(input.bandId)

      return { band: updatedBand }
    }),

  /**
   * Update agency (Big Band) profile (founder/governor only)
   */
  updateAgencyProfile: publicProcedure
    .input(agencyBigBandUpdateInputSchema)
    .mutation(async ({ input }) => {
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
          message: 'Only founders and governors can edit agency details',
        })
      }

      const band = await prisma.band.findUnique({ where: { id: input.bandId } })
      if (!band?.isBigBand) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This endpoint is only for agency bands',
        })
      }

      const updateData: Record<string, unknown> = {}

      if (input.name !== undefined) {
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
            message: 'An agency with this name already exists',
          })
        }
        updateData.name = input.name
        updateData.slug = newSlug
      }

      if (input.mission !== undefined) updateData.mission = input.mission
      if (input.productsOffered !== undefined) updateData.productsOffered = input.productsOffered
      if (input.productsOther !== undefined) updateData.productsOther = input.productsOther ?? null
      if (input.clientSearchRadiusMiles !== undefined) updateData.clientSearchRadiusMiles = input.clientSearchRadiusMiles
      if (input.addressLine1 !== undefined) updateData.addressLine1 = input.addressLine1
      if (input.addressLine2 !== undefined) updateData.addressLine2 = input.addressLine2 ?? null
      if (input.city !== undefined) updateData.city = input.city
      if (input.state !== undefined) updateData.state = input.state
      if (input.zipcode !== undefined) updateData.zipcode = input.zipcode
      if (input.country !== undefined) updateData.country = input.country
      if (input.logoUrl !== undefined) updateData.imageUrl = input.logoUrl
      if (input.websiteUrl !== undefined) updateData.websiteUrl = input.websiteUrl
      if (input.facebookUrl !== undefined) updateData.facebookUrl = input.facebookUrl
      if (input.instagramUrl !== undefined) updateData.instagramUrl = input.instagramUrl
      if (input.xUrl !== undefined) updateData.xUrl = input.xUrl
      if (input.tiktokUrl !== undefined) updateData.tiktokUrl = input.tiktokUrl
      if (input.youtubeUrl !== undefined) updateData.youtubeUrl = input.youtubeUrl

      const updatedBand = await prisma.band.update({
        where: { id: input.bandId },
        data: updateData,
      })

      return { band: updatedBand }
    }),
})
