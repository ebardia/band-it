import { prisma } from '../../lib/prisma'
import type { AdminTaskHandler, TaskExecutionContext, TaskExecutionResult } from '../admin-task.service'

/**
 * Export Audit Log Handler
 *
 * Exports a CSV file containing audit log entries for the band.
 */
export const exportAuditLogHandler: AdminTaskHandler = {
  taskType: 'EXPORT_AUDIT_LOG',
  name: 'Export Audit Log',
  description: 'Export a CSV file containing all audit log entries for the band.',
  icon: 'file-text',
  category: 'export',
  allowedRoles: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'],

  parametersSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        format: 'date',
        description: 'Start date for the export (optional)',
      },
      endDate: {
        type: 'string',
        format: 'date',
        description: 'End date for the export (optional)',
      },
      entityTypes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by entity types (optional)',
      },
    },
  },

  async validate(parameters: Record<string, unknown>): Promise<string[]> {
    const errors: string[] = []

    // Validate dates if provided
    if (parameters.startDate && typeof parameters.startDate === 'string') {
      const date = new Date(parameters.startDate)
      if (isNaN(date.getTime())) {
        errors.push('Invalid start date format')
      }
    }

    if (parameters.endDate && typeof parameters.endDate === 'string') {
      const date = new Date(parameters.endDate)
      if (isNaN(date.getTime())) {
        errors.push('Invalid end date format')
      }
    }

    if (parameters.startDate && parameters.endDate) {
      const start = new Date(parameters.startDate as string)
      const end = new Date(parameters.endDate as string)
      if (start > end) {
        errors.push('Start date must be before end date')
      }
    }

    return errors
  },

  async preview(parameters: Record<string, unknown>, context: TaskExecutionContext) {
    const where = buildWhereClause(context.bandId, parameters)

    const entryCount = await prisma.auditLog.count({ where })

    const dateRange = getDateRangeDescription(parameters)

    return {
      summary: `Will export ${entryCount} audit log entries${dateRange}`,
      details: {
        entryCount,
        ...parameters,
        fields: ['Date', 'Time', 'Actor', 'Action', 'Entity Type', 'Entity Name', 'Changes', 'Flagged'],
      },
    }
  },

  async execute(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const where = buildWhereClause(context.bandId, context.parameters)

    // Fetch audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000, // Limit to prevent massive exports
    })

    if (auditLogs.length === 0) {
      return {
        success: true,
        summary: 'No audit log entries found for the specified criteria',
        data: { entryCount: 0 },
      }
    }

    // Build CSV content
    const headers = ['Date', 'Time', 'Actor', 'Actor Type', 'Action', 'Entity Type', 'Entity ID', 'Entity Name', 'Changes', 'Flagged', 'Flag Reasons']
    const rows = auditLogs.map(log => [
      escapeCsvField(log.createdAt.toISOString().split('T')[0]),
      escapeCsvField(log.createdAt.toISOString().split('T')[1].split('.')[0]),
      escapeCsvField(log.actorName || log.actorId || 'System'),
      escapeCsvField(log.actorType),
      escapeCsvField(log.action),
      escapeCsvField(log.entityType),
      escapeCsvField(log.entityId),
      escapeCsvField(log.entityName || ''),
      escapeCsvField(formatChanges(log.changes)),
      log.flagged ? 'Yes' : 'No',
      escapeCsvField(log.flagReasons?.join(', ') || ''),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')

    // Get band info for filename
    const band = await prisma.band.findUnique({
      where: { id: context.bandId },
      select: { slug: true },
    })

    const dateRangeSuffix = getDateRangeSuffix(context.parameters)
    const fileName = `${band?.slug || 'band'}-audit-log${dateRangeSuffix}-${new Date().toISOString().split('T')[0]}.csv`

    return {
      success: true,
      summary: `Exported ${auditLogs.length} audit log entries to CSV`,
      data: {
        entryCount: auditLogs.length,
        limitReached: auditLogs.length >= 10000,
      },
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName,
      mimeType: 'text/csv',
    }
  },
}

/**
 * Build Prisma where clause from parameters
 */
function buildWhereClause(bandId: string, parameters: Record<string, unknown>) {
  const where: Record<string, unknown> = { bandId }

  if (parameters.startDate || parameters.endDate) {
    where.createdAt = {}
    if (parameters.startDate) {
      (where.createdAt as Record<string, Date>).gte = new Date(parameters.startDate as string)
    }
    if (parameters.endDate) {
      const endDate = new Date(parameters.endDate as string)
      endDate.setHours(23, 59, 59, 999)
      ;(where.createdAt as Record<string, Date>).lte = endDate
    }
  }

  if (parameters.entityTypes && Array.isArray(parameters.entityTypes) && parameters.entityTypes.length > 0) {
    where.entityType = { in: parameters.entityTypes }
  }

  return where
}

/**
 * Format changes object for CSV display
 */
function formatChanges(changes: unknown): string {
  if (!changes || typeof changes !== 'object') return ''

  try {
    const changeObj = changes as Record<string, { from: unknown; to: unknown }>
    const parts = Object.entries(changeObj).map(([key, value]) => {
      if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
        return `${key}: ${JSON.stringify(value.from)} -> ${JSON.stringify(value.to)}`
      }
      return `${key}: ${JSON.stringify(value)}`
    })
    return parts.join('; ')
  } catch {
    return JSON.stringify(changes)
  }
}

/**
 * Get human-readable date range description
 */
function getDateRangeDescription(parameters: Record<string, unknown>): string {
  if (parameters.startDate && parameters.endDate) {
    return ` from ${parameters.startDate} to ${parameters.endDate}`
  }
  if (parameters.startDate) {
    return ` from ${parameters.startDate}`
  }
  if (parameters.endDate) {
    return ` until ${parameters.endDate}`
  }
  return ''
}

/**
 * Get date range suffix for filename
 */
function getDateRangeSuffix(parameters: Record<string, unknown>): string {
  if (parameters.startDate && parameters.endDate) {
    return `-${parameters.startDate}-to-${parameters.endDate}`
  }
  if (parameters.startDate) {
    return `-from-${parameters.startDate}`
  }
  if (parameters.endDate) {
    return `-until-${parameters.endDate}`
  }
  return ''
}

/**
 * Escape a field for CSV output
 */
function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  // If contains comma, newline, or quote, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
