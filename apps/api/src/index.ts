import express from 'express'
import cors from 'cors'
import path from 'path'
import jwt from 'jsonwebtoken'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './server/routers/_app'
import { createContext } from './server/trpc'
import { auditStorage, AuditContext } from './lib/auditContext'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const app = express()
const PORT = process.env.PORT || 3001
const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || './uploads'

// Enable CORS for frontend (supports comma-separated list of origins)
const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, ''))
  : ['http://localhost:3000']

console.log('[CORS] Allowed origins:', ALLOWED_ORIGINS)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)

    // Normalize origin by removing trailing slash
    const normalizedOrigin = origin.replace(/\/$/, '')

    if (ALLOWED_ORIGINS.includes(normalizedOrigin)) {
      callback(null, true)
    } else {
      console.warn(`[CORS] Blocked origin: ${origin} (normalized: ${normalizedOrigin})`)
      console.warn(`[CORS] Allowed origins are: ${ALLOWED_ORIGINS.join(', ')}`)
      callback(null, false)
    }
  },
  credentials: true,
}))

// Increase payload limit for file uploads (base64 encoded)
app.use(express.json({ limit: '15mb' }))

// Serve uploaded files statically
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)))

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API running on http://localhost:${PORT}`)
  console.log(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`)
  console.log(`📁 Uploads served from: http://localhost:${PORT}/uploads`)
})