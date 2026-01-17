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
