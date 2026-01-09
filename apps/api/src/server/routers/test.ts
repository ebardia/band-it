import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'

export const testRouter = router({
  // Simple hello endpoint
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.name ?? 'World'}!`,
        timestamp: new Date().toISOString(),
      }
    }),

  // Health check endpoint
  health: publicProcedure.query(() => {
    return {
      status: 'ok',
      message: 'Backend API is running',
      timestamp: new Date().toISOString(),
    }
  }),

  // Database connection test - NEW!
  dbTest: publicProcedure.query(async () => {
    try {
      // Try to count users (should be 0)
      const userCount = await prisma.user.count()
      const bandCount = await prisma.band.count()

      return {
        status: 'connected',
        message: 'Database connection successful!',
        users: userCount,
        bands: bandCount,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Database connection failed',
        timestamp: new Date().toISOString(),
      }
    }
  }),
})