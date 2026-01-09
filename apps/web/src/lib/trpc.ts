import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../../../api/src/server/routers/_app'

// Create tRPC React hooks
export const trpc = createTRPCReact<AppRouter>()