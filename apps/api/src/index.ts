import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './server/routers/_app'

const app = express()
const PORT = process.env.PORT || 3001

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:3000', // Next.js frontend
  credentials: true,
}))

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
})