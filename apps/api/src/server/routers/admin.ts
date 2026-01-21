import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'

// Helper to check if user is admin
async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })

  if (!user?.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }

  return user
}

export const adminRouter = router({
  /**
   * Get platform statistics for admin dashboard
   */
  getStats: publicProcedure.query(async () => {
    const [
      totalUsers,
      totalBands,
      activeProposals,
      openTasks,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.band.count(),
      prisma.proposal.count({
        where: { status: 'OPEN' },
      }),
      prisma.task.count({
        where: {
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
      }),
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    return {
      totalUsers,
      totalBands,
      activeProposals,
      openTasks,
      recentUsers,
    }
  }),

  /**
   * Get all users with pagination and search
   */
  getUsers: publicProcedure
    .input(
      z.object({
        userId: z.string(), // Admin user ID for auth check
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.userId)

      const where = input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' as const } },
              { email: { contains: input.search, mode: 'insensitive' as const } },
            ],
          }
        : {}

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
            emailVerified: true,
            createdAt: true,
            _count: {
              select: {
                memberships: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        prisma.user.count({ where }),
      ])

      return {
        users,
        total,
        pages: Math.ceil(total / input.limit),
      }
    }),

  /**
   * Get all bands with pagination and search
   */
  getBands: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.userId)

      const where = input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' as const } },
              { slug: { contains: input.search, mode: 'insensitive' as const } },
            ],
          }
        : {}

      const [bands, total] = await Promise.all([
        prisma.band.findMany({
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            billingStatus: true,
            createdAt: true,
            _count: {
              select: {
                members: true,
                proposals: true,
                projects: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        prisma.band.count({ where }),
      ])

      return {
        bands,
        total,
        pages: Math.ceil(total / input.limit),
      }
    }),

  /**
   * Toggle admin status for a user
   */
  setUserAdmin: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(), // The admin performing the action
        targetUserId: z.string(), // The user to modify
        isAdmin: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      // Prevent removing own admin status
      if (input.adminUserId === input.targetUserId && !input.isAdmin) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot remove your own admin status',
        })
      }

      const user = await prisma.user.update({
        where: { id: input.targetUserId },
        data: { isAdmin: input.isAdmin },
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
        },
      })

      return { user }
    }),
})
