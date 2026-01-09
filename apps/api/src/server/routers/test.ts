import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

// Test router with sample endpoints
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
})