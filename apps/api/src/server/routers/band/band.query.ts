import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'

export const bandQueryRouter = router({
  /**
   * Get all bands (excludes dissolved bands)
   */
  getAll: publicProcedure.query(async () => {
    const bands = await prisma.band.findMany({
      where: {
        dissolvedAt: null, // Exclude dissolved bands
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