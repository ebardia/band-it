import { router } from '../trpc'
import { testRouter } from './test'
import { authRouter } from './auth'
import { paymentRouter } from './payment'

// Main app router - combines all sub-routers
export const appRouter = router({
  test: testRouter,
  auth: authRouter,
  payment: paymentRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter