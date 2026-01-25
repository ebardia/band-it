import { AsyncLocalStorage } from 'async_hooks'

export interface AuditContext {
  userId?: string
  ipAddress?: string
  userAgent?: string
  // Integrity Guard flags
  flagged?: boolean
  flagReasons?: string[]
  flagDetails?: any
}

export const auditStorage = new AsyncLocalStorage<AuditContext>()

export function getAuditContext(): AuditContext {
  return auditStorage.getStore() || {}
}

export function runWithAuditContext<T>(context: AuditContext, fn: () => T): T {
  return auditStorage.run(context, fn)
}

/**
 * Set integrity flags in the current audit context.
 * Call this before a create/update operation when user proceeds despite warnings.
 */
export function setAuditFlags(flags: {
  flagged: boolean
  flagReasons: string[]
  flagDetails?: any
}): void {
  const store = auditStorage.getStore()
  if (store) {
    store.flagged = flags.flagged
    store.flagReasons = flags.flagReasons
    store.flagDetails = flags.flagDetails
    console.log('[AuditFlags] Set flags:', { flagged: flags.flagged, flagReasons: flags.flagReasons })
  } else {
    console.warn('[AuditFlags] No store found - flags not set!')
  }
}

/**
 * Clear integrity flags from the current audit context.
 * Call this after the operation completes to prevent flags leaking to subsequent operations.
 */
export function clearAuditFlags(): void {
  const store = auditStorage.getStore()
  if (store) {
    store.flagged = undefined
    store.flagReasons = undefined
    store.flagDetails = undefined
  }
}

/**
 * Manually log an audit event.
 * Use this for custom events that aren't captured by the Prisma middleware.
 */
import { prisma } from './prisma'

export async function logAuditEvent(params: {
  bandId: string | null
  action: string
  entityType: string
  entityId: string
  entityName?: string | null
  changes?: Record<string, any> | null
}): Promise<void> {
  const context = getAuditContext()

  try {
    // Look up actor's name and membership info if we have a userId and bandId
    let actorName: string | null = null
    let actorMemberSince: Date | null = null

    if (context.userId) {
      const user = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { name: true },
      })
      actorName = user?.name || null

      // If this is a band-scoped action, get membership info
      if (params.bandId) {
        const member = await prisma.member.findUnique({
          where: {
            userId_bandId: { userId: context.userId, bandId: params.bandId },
          },
          select: { createdAt: true },
        })
        actorMemberSince = member?.createdAt || null
      }
    }

    await prisma.auditLog.create({
      data: {
        band: params.bandId ? { connect: { id: params.bandId } } : undefined,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName || null,
        actorId: context.userId || null,
        actorType: context.userId ? 'user' : 'system',
        actorName,
        actorMemberSince,
        changes: params.changes ?? undefined,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        flagged: context.flagged || false,
        flagReasons: context.flagReasons || [],
        flagDetails: context.flagDetails || null,
      },
    })
    console.log(`[Audit] Logged: ${params.action} ${params.entityType} (${params.entityId}) by ${actorName || 'system'}`)
  } catch (err: any) {
    console.error('[Audit] Failed to log event:', err.message)
  }
}
