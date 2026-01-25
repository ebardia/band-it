/**
 * Admin Task Handlers
 *
 * This module exports and registers all admin task handlers.
 * Import this module to ensure all handlers are registered.
 */

import { registerAdminTaskHandler } from '../admin-task.service'
import { exportMemberRosterHandler } from './export-member-roster.handler'
import { exportAuditLogHandler } from './export-audit-log.handler'
import { sendAnnouncementHandler } from './send-announcement.handler'

// Export all handlers
export { exportMemberRosterHandler } from './export-member-roster.handler'
export { exportAuditLogHandler } from './export-audit-log.handler'
export { sendAnnouncementHandler } from './send-announcement.handler'

// Register all handlers
export function registerAllAdminTaskHandlers(): void {
  registerAdminTaskHandler(exportMemberRosterHandler)
  registerAdminTaskHandler(exportAuditLogHandler)
  registerAdminTaskHandler(sendAnnouncementHandler)

  console.log('[Admin Tasks] Registered 3 task handlers')
}

// Auto-register on import
registerAllAdminTaskHandlers()
