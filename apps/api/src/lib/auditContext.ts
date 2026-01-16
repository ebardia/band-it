import { AsyncLocalStorage } from 'async_hooks'

export interface AuditContext {
  userId?: string
  ipAddress?: string
  userAgent?: string
}

export const auditStorage = new AsyncLocalStorage<AuditContext>()

export function getAuditContext(): AuditContext {
  return auditStorage.getStore() || {}
}

export function runWithAuditContext<T>(context: AuditContext, fn: () => T): T {
  return auditStorage.run(context, fn)
}
