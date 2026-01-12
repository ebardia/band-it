import { router } from '../trpc'
import { testRouter } from './test'
import { authRouter } from './auth'
import { paymentRouter } from './payment'
import { bandRouter } from './band'
import { notificationRouter } from './notification'

// Main app router - combines all sub-routers
export const appRouter = router({
  test: testRouter,
  auth: authRouter,
  payment: paymentRouter,
  band: bandRouter,
  notification: notificationRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter