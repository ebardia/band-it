import { router } from '../trpc'
import { testRouter } from './test'
import { authRouter } from './auth'
import { paymentRouter } from './payment'
import { bandRouter } from './band'
import { notificationRouter } from './notification'
import { proposalRouter } from './proposal'
import { projectRouter } from './project'
import { taskRouter } from './task'
import { eventRouter } from './event'
import { aiRouter } from './ai'
import { aiUsageRouter } from './aiUsage'
import { fileRouter } from './file'
import { commentRouter } from './comment'
import { checklistRouter } from './checklist'
import { auditRouter } from './audit'
import { validationRouter } from './validation'
import { adminRouter } from './admin'
import { adminTaskRouter } from './adminTask'
import { channelRouter } from './channel'
import { messageRouter } from './message'
import { manualPaymentRouter } from './manualPayment'
import { helpRouter } from './help'
import { postsRouter } from './posts'

// Main app router - combines all sub-routers
export const appRouter = router({
  test: testRouter,
  auth: authRouter,
  payment: paymentRouter,
  band: bandRouter,
  notification: notificationRouter,
  proposal: proposalRouter,
  project: projectRouter,
  task: taskRouter,
  event: eventRouter,
  ai: aiRouter,
  aiUsage: aiUsageRouter,
  file: fileRouter,
  comment: commentRouter,
  checklist: checklistRouter,
  audit: auditRouter,
  validation: validationRouter,
  admin: adminRouter,
  adminTask: adminTaskRouter,
  channel: channelRouter,
  message: messageRouter,
  manualPayment: manualPaymentRouter,
  help: helpRouter,
  posts: postsRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter