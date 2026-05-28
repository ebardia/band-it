import { initTRPC, TRPCError } from '@trpc/server'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Context type
export interface Context {
  userId?: string
  ipAddress?: string
  userAgent?: string
}

// Create context from Express request
export function createContext({ req }: CreateExpressContextOptions): Context {
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

  return {
    userId,
    ipAddress,
    userAgent,
  }
}

// Initialize tRPC with context
const t = initTRPC.context<Context>().create()

// Export reusable router and procedure helpers
export const router = t.router
export const publicProcedure = t.procedure

/**
 * Requires a valid authenticated user. The JWT is verified in `createContext`,
 * so a populated `ctx.userId` means the caller is who they claim to be. Use this
 * for any user-scoped read/write so callers can't act on behalf of others.
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' })
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})

export const protectedProcedure = t.procedure.use(isAuthed)