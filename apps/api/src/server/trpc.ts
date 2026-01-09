import { initTRPC } from '@trpc/server'

// Initialize tRPC
const t = initTRPC.create()

// Export reusable router and procedure helpers
export const router = t.router
export const publicProcedure = t.procedure