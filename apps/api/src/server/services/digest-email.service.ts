import { emailService } from './email.service'
import { QuickAction } from '../../lib/quickActions'
import { getUnsubscribeUrl, getPreferencesUrl } from '../../lib/digest-token'

/**
 * Render the digest email HTML template
 */
function renderDigestEmail(
  userName: string | null,
  actions: QuickAction[],
  unsubscribeUrl: string,
  preferencesUrl: string
): string {
  const greeting = userName ? `Hi ${userName},` : 'Hi there,'

  const actionCards = actions.map((action) => {
    const { icon, typeLabel, buttonLabel } = getActionDetails(action.type)
    const urgencyHtml = getUrgencyHtml(action)
    const baseUrl = process.env.FRONTEND_URL || 'https://banditeco.com'
    const fullUrl = `${baseUrl}${action.url}`

    return `
      <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          ${icon} ${typeLabel}${urgencyHtml}
        </div>
        <div style="font-size: 16px; font-weight: 600; margin: 4px 0; color: #333;">
          ${escapeHtml(action.title)}
        </div>
        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">
          ${escapeHtml(action.bandName)}
        </div>
        <a href="${fullUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          ${buttonLabel}
        </a>
      </div>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <p style="margin: 0 0 16px 0;">${greeting}</p>

  <p style="margin: 0 0 20px 0;">You have ${actions.length} thing${actions.length > 1 ? 's' : ''} waiting:</p>

  ${actionCards}

  <p style="margin: 20px 0 0 0; font-size: 14px; color: #666;">Each takes less than a minute. ⚡</p>

  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
    <p style="margin: 0;">
      You're receiving this because you're a Band It member.<br>
      <a href="${preferencesUrl}" style="color: #2563eb;">Change frequency</a> ·
      <a href="${unsubscribeUrl}" style="color: #2563eb;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
  `.trim()
}

function getActionDetails(type: QuickAction['type']): { icon: string; typeLabel: string; buttonLabel: string } {
  switch (type) {
    case 'VOTE':
      return { icon: '🗳️', typeLabel: 'Vote', buttonLabel: 'Vote Now' }
    case 'CONFIRM_PAYMENT':
      return { icon: '💳', typeLabel: 'Confirm Payment', buttonLabel: 'Confirm' }
    case 'EVENT_RSVP':
      return { icon: '📅', typeLabel: 'Event', buttonLabel: 'RSVP' }
    case 'BAND_INVITE':
      return { icon: '✉️', typeLabel: 'Invitation', buttonLabel: 'Respond' }
    case 'MENTION':
      return { icon: '💬', typeLabel: 'Mention', buttonLabel: 'View' }
    default:
      return { icon: '📌', typeLabel: type, buttonLabel: 'View' }
  }
}

function getUrgencyHtml(action: QuickAction): string {
  if (action.urgency === 'high' && action.meta.timeRemaining) {
    return ` <span style="color: #dc2626; font-weight: 600;">· Ends soon!</span>`
  }
  if (action.urgency === 'medium' && action.meta.timeRemaining) {
    return ` <span style="color: #ca8a04; font-weight: 600;">· ${action.meta.timeRemaining} left</span>`
  }
  return ''
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Generate email subject line
 */
function getSubject(actionCount: number): string {
  return `You have ${actionCount} thing${actionCount > 1 ? 's' : ''} to do`
}

/**
 * Send digest email to a user
 */
export async function sendDigestEmail(
  userId: string,
  userEmail: string,
  userName: string | null,
  actions: QuickAction[]
): Promise<{ success: boolean; error?: any }> {
  const unsubscribeUrl = getUnsubscribeUrl(userId)
  const preferencesUrl = getPreferencesUrl()

  const html = renderDigestEmail(userName, actions, unsubscribeUrl, preferencesUrl)
  const subject = getSubject(actions.length)

  return emailService.sendEmail({
    to: userEmail,
    subject,
    html,
  })
}
