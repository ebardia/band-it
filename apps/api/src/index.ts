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

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:3000', // Next.js frontend
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
    } catch {
      // Invalid token - continue without userId
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
  // Use enterWith to set context for entire request lifecycle
  auditStorage.enterWith(auditContext)
  trpcMiddleware(req, res, next)
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API running on http://localhost:${PORT}`)
  console.log(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`)
  console.log(`📁 Uploads served from: http://localhost:${PORT}/uploads`)
})