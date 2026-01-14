import express from 'express'
import cors from 'cors'
import path from 'path'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './server/routers/_app'

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

// tRPC middleware
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
  })
)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API running on http://localhost:${PORT}`)
  console.log(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`)
  console.log(`📁 Uploads served from: http://localhost:${PORT}/uploads`)
})