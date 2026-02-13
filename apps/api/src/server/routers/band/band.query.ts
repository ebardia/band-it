import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'

export const bandQueryRouter = router({
  /**
   * Get all bands (excludes dissolved bands)
   * Optionally exclude bands where a specific user is already a member
   */
  getAll: publicProcedure
    .input(
      z.object({
        excludeUserId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
    // Get band IDs where user is a member (if excludeUserId provided)
    let excludeBandIds: string[] = []
    if (input?.excludeUserId) {
      const userMemberships = await prisma.member.findMany({
        where: { userId: input.excludeUserId },
        select: { bandId: true },
      })
      excludeBandIds = userMemberships.map(m => m.bandId)
    }

    const bands = await prisma.band.findMany({
      where: {
        dissolvedAt: null, // Exclude dissolved bands
        parentBandId: null, // Exclude sub-bands from browse
        ...(excludeBandIds.length > 0 && { id: { notIn: excludeBandIds } }),
      },
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
            subBands: {
              where: {
                dissolvedAt: null,
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
   * Get bands for a specific user (excludes dissolved bands)
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
          band: {
            dissolvedAt: null, // Exclude dissolved bands
          },
        },
        include: {
          band: {
            include: {
              parentBand: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              _count: {
                select: {
                  members: {
                    where: {
                      status: 'ACTIVE',
                    },
                  },
                  subBands: {
                    where: {
                      dissolvedAt: null,
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
          isBigBand: m.band._count.subBands > 0,
          isSubBand: !!m.band.parentBandId,
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
          // Finance data
          buckets: {
            where: {
              isActive: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
          financeSettings: true,
          // Big Band relations
          parentBand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          subBands: {
            where: {
              dissolvedAt: null,
            },
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
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
              name: 'asc',
            },
          },
        },
      })

      if (!band) {
        throw new Error('Band not found')
      }

      // Check if band is dissolved
      if (band.dissolvedAt) {
        throw new Error('This band has been dissolved')
      }

      return {
        success: true,
        band,
      }
    }),
})