import { router } from '../trpc'
import { testRouter } from './test'

// Main app router - combines all sub-routers
export const appRouter = router({
  test: testRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter