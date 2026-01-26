import { prisma } from '../../lib/prisma'
import { emailService } from '../../server/services/email.service'
import type { AdminTaskHandler, TaskExecutionContext, TaskExecutionResult } from '../admin-task.service'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

/**
 * Send Announcement Handler
 *
 * Sends an email announcement to all active band members.
 */
export const sendAnnouncementHandler: AdminTaskHandler = {
  taskType: 'SEND_ANNOUNCEMENT',
  name: 'Send Announcement',
  description: 'Send an email announcement to all active band members.',
  icon: 'mail',
  category: 'communication',
  allowedRoles: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'],

  parametersSchema: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description: 'Email subject line',
        minLength: 1,
        maxLength: 200,
      },
      message: {
        type: 'string',
        description: 'The announcement message (plain text)',
        minLength: 1,
        maxLength: 5000,
      },
      targetRoles: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'],
        },
        description: 'Target specific roles (empty = all active members)',
      },
    },
    required: ['subject', 'message'],
  },

  async validate(parameters: Record<string, unknown>): Promise<string[]> {
    const errors: string[] = []

    if (!parameters.subject || typeof parameters.subject !== 'string') {
      errors.push('Subject is required')
    } else if (parameters.subject.length > 200) {
      errors.push('Subject must be 200 characters or less')
    }

    if (!parameters.message || typeof parameters.message !== 'string') {
      errors.push('Message is required')
    } else if (parameters.message.length > 5000) {
      errors.push('Message must be 5000 characters or less')
    }

    if (parameters.targetRoles && !Array.isArray(parameters.targetRoles)) {
      errors.push('Target roles must be an array')
    }

    return errors
  },

  async preview(parameters: Record<string, unknown>, context: TaskExecutionContext) {
    const where = buildMemberWhereClause(context.bandId, parameters)

    const memberCount = await prisma.member.count({ where })

    const roleFilter = parameters.targetRoles && Array.isArray(parameters.targetRoles) && parameters.targetRoles.length > 0
      ? ` (${(parameters.targetRoles as string[]).join(', ')})`
      : ' (all roles)'

    return {
      summary: `Will send announcement to ${memberCount} member(s)${roleFilter}`,
      details: {
        recipientCount: memberCount,
        subject: parameters.subject,
        messagePreview: (parameters.message as string).substring(0, 100) + ((parameters.message as string).length > 100 ? '...' : ''),
        targetRoles: parameters.targetRoles || 'all',
      },
    }
  },

  async execute(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const subject = context.parameters.subject as string
    const message = context.parameters.message as string

    // Get band info
    const band = await prisma.band.findUnique({
      where: { id: context.bandId },
      select: { name: true, slug: true },
    })

    if (!band) {
      return {
        success: false,
        summary: 'Band not found',
        error: 'Band not found',
      }
    }

    // Get sender info
    const sender = await prisma.user.findUnique({
      where: { id: context.executedById },
      select: { name: true },
    })

    const where = buildMemberWhereClause(context.bandId, context.parameters)

    // Fetch all target members with their emails
    const members = await prisma.member.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    })

    if (members.length === 0) {
      return {
        success: true,
        summary: 'No members found matching the criteria',
        data: { sentCount: 0, failedCount: 0 },
      }
    }

    // Build the email HTML
    const bandUrl = `${FRONTEND_URL}/bands/${band.slug}`
    const html = buildAnnouncementHtml({
      bandName: band.name,
      senderName: sender?.name || 'Band Administrator',
      subject,
      message,
      bandUrl,
    })

    // Send emails to all members with rate limiting (Resend allows 2/sec on free tier)
    let sentCount = 0
    let failedCount = 0
    const failures: string[] = []

    // Helper to delay between emails to respect rate limits
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    for (let i = 0; i < members.length; i++) {
      const member = members[i]

      // Add delay between emails (600ms = ~1.6 emails/sec, safely under 2/sec limit)
      if (i > 0) {
        await delay(600)
      }

      try {
        const result = await emailService.sendEmail({
          to: member.user.email,
          subject: `[${band.name}] ${subject}`,
          html,
        })

        if (result.success) {
          sentCount++
        } else {
          failedCount++
          failures.push(member.user.email)
        }
      } catch (error) {
        failedCount++
        failures.push(member.user.email)
        console.error(`Failed to send announcement to ${member.user.email}:`, error)
      }
    }

    const success = failedCount === 0
    const summary = success
      ? `Successfully sent announcement to ${sentCount} member(s)`
      : `Sent to ${sentCount} member(s), failed: ${failedCount}`

    return {
      success,
      summary,
      data: {
        sentCount,
        failedCount,
        totalRecipients: members.length,
        ...(failures.length > 0 && { failedEmails: failures }),
      },
      error: failedCount > 0 ? `Failed to send to ${failedCount} recipient(s)` : undefined,
    }
  },
}

/**
 * Build Prisma where clause for member query
 */
function buildMemberWhereClause(bandId: string, parameters: Record<string, unknown>) {
  const where: Record<string, unknown> = {
    bandId,
    status: 'ACTIVE',
  }

  if (parameters.targetRoles && Array.isArray(parameters.targetRoles) && parameters.targetRoles.length > 0) {
    where.role = { in: parameters.targetRoles }
  }

  return where
}

/**
 * Build HTML email for announcement
 */
function buildAnnouncementHtml(options: {
  bandName: string
  senderName: string
  subject: string
  message: string
  bandUrl: string
}): string {
  const { bandName, senderName, subject, message, bandUrl } = options

  // Convert line breaks to HTML
  const formattedMessage = message
    .split('\n')
    .map(line => line.trim())
    .map(line => line ? `<p style="margin: 0 0 10px 0;">${escapeHtml(line)}</p>` : '<br>')
    .join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(subject)}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: Arial, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6;">
        <tr>
          <td align="center" style="padding: 20px 10px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px;">
              <!-- Header -->
              <tr>
                <td style="background-color: #3B82F6; color: white; padding: 24px 20px; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 22px; font-weight: bold;">${escapeHtml(bandName)}</h1>
                  <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Announcement</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="background-color: white; padding: 28px 24px; border-left: 1px solid #E5E7EB; border-right: 1px solid #E5E7EB;">
                  <h2 style="margin: 0 0 20px 0; color: #1F2937; font-size: 20px; line-height: 1.3;">
                    ${escapeHtml(subject)}
                  </h2>
                  <div style="color: #374151; font-size: 16px; line-height: 1.7;">
                    ${formattedMessage}
                  </div>
                  <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                    <p style="margin: 0; color: #6B7280; font-size: 14px;">
                      Sent by <strong>${escapeHtml(senderName)}</strong>
                    </p>
                  </div>
                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td style="background-color: #F9FAFB; padding: 20px 24px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
                  <a href="${bandUrl}" style="display: inline-block; background-color: #3B82F6; color: white; text-decoration: none; font-size: 16px; font-weight: 600; padding: 12px 24px; border-radius: 6px;">
                    View ${escapeHtml(bandName)}
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 20px; text-align: center;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 13px; line-height: 1.5;">
                    You received this email because you are a member of ${escapeHtml(bandName)} on Band IT.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
