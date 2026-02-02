import express from 'express'
import cors from 'cors'
import path from 'path'
import jwt from 'jsonwebtoken'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './server/routers/_app'
import { createContext } from './server/trpc'
import { auditStorage, AuditContext } from './lib/auditContext'
import { handleStripeWebhook } from './webhooks/stripe'
import { handleStripeConnectWebhook } from './webhooks/stripe-connect'
import { initBillingCron } from './cron/billing-cron'
import { initDigestCron } from './cron/digest-cron'
import { initTaskEscalationCron } from './cron/task-escalation-cron'
import { initializeEffectHandlers } from './services/effects'
import stripeConnectRoutes from './routes/stripe-connect'
import bandDuesRoutes from './routes/band-dues'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const app = express()
const PORT = process.env.PORT || 3001
const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || './uploads'

// Enable CORS for frontend
app.use(cors({
  origin: true,
  credentials: true,
}))

// Stripe webhook endpoints - MUST be before JSON body parser
// Stripe requires raw body for signature verification
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook)
app.post('/api/webhooks/stripe-connect', express.raw({ type: 'application/json' }), handleStripeConnectWebhook)

// Increase payload limit for file uploads (base64 encoded)
app.use(express.json({ limit: '15mb' }))

// Serve uploaded files statically
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)))

// Stripe Connect routes (OAuth flow for band Stripe accounts)
app.use('/api', stripeConnectRoutes)

// Band Dues routes (dues plans, checkout, billing)
app.use('/api', bandDuesRoutes)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend API is running' })
})

// Helper to extract audit context from request
function getAuditContextFromRequest(req: express.Request): AuditContext {
  let userId: string | undefined

  // Extract userId from Authorization header
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
      userId = decoded.userId
    } catch (error: any) {
      // Log token verification failures for debugging
      console.warn('JWT verification failed:', error.message)
    }
  }

  // Extract IP address (handle proxies)
  const forwarded = req.headers['x-forwarded-for']
  const ipAddress = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress

  // Extract user agent
  const userAgent = req.headers['user-agent']

  return { userId, ipAddress, userAgent }
}

// Wrap tRPC middleware with audit context
const trpcMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
})

// tRPC middleware with audit context wrapper
app.use('/trpc', (req, res, next) => {
  const auditContext = getAuditContextFromRequest(req)
  // Use run() to properly propagate context through async operations
  auditStorage.run(auditContext, () => {
    trpcMiddleware(req, res, next)
  })
})

// Initialize proposal effect handlers
initializeEffectHandlers()
console.log(`📋 Proposal effect handlers initialized`)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API running on http://localhost:${PORT}`)
  console.log(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`)
  console.log(`💳 Stripe webhook: http://localhost:${PORT}/webhooks/stripe`)
  console.log(`💳 Stripe Connect webhook: http://localhost:${PORT}/api/webhooks/stripe-connect`)
  console.log(`🔗 Stripe Connect: http://localhost:${PORT}/api/bands/:bandId/stripe/*`)
  console.log(`💰 Band Dues: http://localhost:${PORT}/api/bands/:bandId/dues-*`)
  console.log(`📁 Uploads served from: http://localhost:${PORT}/uploads`)

  // Initialize billing cron jobs
  initBillingCron()
  console.log(`⏰ Billing cron jobs scheduled`)

  // Initialize digest email cron job
  initDigestCron()
  console.log(`📧 Digest email cron job scheduled`)

  // Initialize task escalation cron job
  initTaskEscalationCron()
  console.log(`✅ Task escalation cron job scheduled`)
})