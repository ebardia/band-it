import { prisma } from '../../lib/prisma'
import type { AdminTaskHandler, TaskExecutionContext, TaskExecutionResult } from '../admin-task.service'

/**
 * Export Member Roster Handler
 *
 * Exports a CSV file containing all active band members with their details.
 * Does NOT include lastActive field per spec.
 */
export const exportMemberRosterHandler: AdminTaskHandler = {
  taskType: 'EXPORT_MEMBER_ROSTER',
  name: 'Export Member Roster',
  description: 'Export a CSV file containing all band members with their name, email, role, join date, and other details.',
  icon: 'download',
  category: 'export',
  allowedRoles: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'],

  parametersSchema: {
    type: 'object',
    properties: {
      includeInactive: {
        type: 'boolean',
        description: 'Include inactive/pending members in the export',
        default: false,
      },
    },
  },

  async validate(parameters: Record<string, unknown>): Promise<string[]> {
    const errors: string[] = []
    // No required parameters
    return errors
  },

  async preview(parameters: Record<string, unknown>, context: TaskExecutionContext) {
    const includeInactive = parameters.includeInactive === true

    const memberCount = await prisma.member.count({
      where: {
        bandId: context.bandId,
        ...(includeInactive ? {} : { status: 'ACTIVE' }),
      },
    })

    return {
      summary: `Will export ${memberCount} ${includeInactive ? '' : 'active '}member(s) to CSV`,
      details: {
        memberCount,
        includeInactive,
        fields: ['Name', 'Email', 'Role', 'Status', 'Joined Date', 'Treasurer'],
      },
    }
  },

  async execute(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const includeInactive = context.parameters.includeInactive === true

    // Fetch all members with user info
    const members = await prisma.member.findMany({
      where: {
        bandId: context.bandId,
        ...(includeInactive ? {} : { status: 'ACTIVE' }),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    if (members.length === 0) {
      return {
        success: true,
        summary: 'No members found to export',
        data: { memberCount: 0 },
      }
    }

    // Build CSV content
    const headers = ['Name', 'Email', 'Role', 'Status', 'Joined Date', 'Is Treasurer']
    const rows = members.map(member => [
      escapeCsvField(member.user.name),
      escapeCsvField(member.user.email),
      member.role,
      member.status,
      member.createdAt.toISOString().split('T')[0],
      member.isTreasurer ? 'Yes' : 'No',
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

    const fileName = `${band?.slug || 'band'}-members-${new Date().toISOString().split('T')[0]}.csv`

    return {
      success: true,
      summary: `Exported ${members.length} member(s) to CSV`,
      data: {
        memberCount: members.length,
        includeInactive,
      },
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName,
      mimeType: 'text/csv',
    }
  },
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
