import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { createDefaultChannel } from '../channel'
import { checkAndSetBandActivation } from './band.dissolve'
import { analyticsService } from '../../services/analytics.service'
import {
  businessBandCreateInputSchema,
  mapAddress,
  mapSocialLinks,
  optionalUrl,
  parseCommaValues,
} from '../../../lib/band-profile-validation'

export const bandCreateRouter = router({
  /**
   * Create a new client business band
   */
  create: publicProcedure
    .input(businessBandCreateInputSchema)
    .mutation(async ({ input }) => {
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

        if (parentBand.parentBandId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot create nested sub-bands. Parent band is already a sub-band.',
          })
        }

        const membership = parentBand.members[0]
        if (!membership || !['FOUNDER', 'GOVERNOR'].includes(membership.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only Founders and Governors of the Big Band can create sub-bands',
          })
        }
      }

      const valuesArray = parseCommaValues(input.values)
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      const existingBand = await prisma.band.findUnique({
        where: { slug },
      })

      if (existingBand) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A band with this name already exists',
        })
      }

      const band = await prisma.band.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          mission: input.mission,
          values: valuesArray,
          businessType: input.businessType,
          servicesOffered: input.servicesOffered,
          servicesOther: input.servicesOther ?? null,
          serviceAreaMiles: input.serviceAreaMiles,
          skillsLookingFor: [],
          whatMembersWillLearn: [],
          membershipRequirements: '',
          whoCanApprove: ['FOUNDER'],
          whoCanCreateProposals: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'],
          ...mapAddress(input),
          ...mapSocialLinks(input),
          imageUrl: input.logoUrl ?? null,
          createdById: input.userId,
          parentBandId: input.parentBandId || null,
          status: 'PENDING',
        },
      })

      await prisma.member.create({
        data: {
          userId: input.userId,
          bandId: band.id,
          role: 'FOUNDER',
          status: 'ACTIVE',
        },
      })

      await checkAndSetBandActivation(band.id)
      await createDefaultChannel(band.id, input.userId)

      await analyticsService.trackEvent('band_created', {
        userId: input.userId,
        metadata: {
          bandId: band.id,
          bandName: band.name,
          businessType: input.businessType,
          isSubBand: !!input.parentBandId,
          parentBandId: input.parentBandId || null,
        },
      })

      return {
        success: true,
        message: 'Business created successfully',
        band,
      }
    }),
})
