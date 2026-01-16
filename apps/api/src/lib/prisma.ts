import { PrismaClient } from '@prisma/client'
import { createAuditMiddleware } from './auditMiddleware'

// Prevent multiple instances in development
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  })

// Add audit middleware (only once)
if (!globalForPrisma.prisma) {
  prisma.$use(createAuditMiddleware(prisma))
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma