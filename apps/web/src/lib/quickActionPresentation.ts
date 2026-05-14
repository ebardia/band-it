/** Shared labels/formatting for quick action rows (dashboard + /daily). */

export type QuickActionShape = {
  type: string
  id: string
  title: string
  bandName: string
  url: string
  urgency: 'high' | 'medium' | 'low'
  meta: Record<string, unknown>
}

export function getQuickActionIcon(action: QuickActionShape): string {
  switch (action.type) {
    case 'VOTE':
      return '🗳️'
    case 'CONFIRM_PAYMENT':
      return '💳'
    case 'EVENT_RSVP':
      return '📅'
    case 'BAND_INVITE':
      return '✉️'
    case 'MENTION':
      return '💬'
    case 'TASK':
      return '✋'
    case 'CHECKLIST':
      return '☑️'
    case 'REVIEW_APPLICATION':
      return '👋'
    case 'REIMBURSE':
      return '💸'
    case 'CONFIRM_REIMBURSEMENT':
      return '✅'
    default:
      return '📌'
  }
}

export function getQuickActionTypeLabel(action: QuickActionShape): string {
  switch (action.type) {
    case 'VOTE':
      return 'Vote'
    case 'CONFIRM_PAYMENT':
      return 'Confirm Payment'
    case 'EVENT_RSVP':
      return 'RSVP'
    case 'BAND_INVITE':
      return 'Invitation'
    case 'MENTION':
      return 'Mention'
    case 'TASK':
      return 'Claim Task'
    case 'CHECKLIST':
      return 'Claim/Dismiss'
    case 'REVIEW_APPLICATION':
      return 'Application'
    case 'REIMBURSE':
      return 'Reimburse'
    case 'CONFIRM_REIMBURSEMENT':
      return 'Confirm Receipt'
    default:
      return action.type
  }
}

export function formatQuickActionTitle(action: QuickActionShape): string {
  if (action.type === 'CONFIRM_PAYMENT' && action.meta.from) {
    return `${action.title} from ${action.meta.from}`
  }
  if (action.type === 'MENTION' && action.meta.channelName) {
    return `in #${action.meta.channelName}`
  }
  if (
    action.type === 'BAND_INVITE' ||
    action.type === 'TASK' ||
    action.type === 'CHECKLIST' ||
    action.type === 'REVIEW_APPLICATION' ||
    action.type === 'REIMBURSE' ||
    action.type === 'CONFIRM_REIMBURSEMENT'
  ) {
    return action.title
  }
  return `"${action.title}"`
}

export function formatQuickActionSubtitle(action: QuickActionShape): string {
  if (action.type === 'TASK' && action.meta.projectName) {
    return `${String(action.meta.projectName)} • ${action.bandName}`
  }
  if (action.type === 'CHECKLIST' && action.meta.taskName) {
    return `${String(action.meta.taskName)} • ${action.bandName}`
  }
  if (action.type === 'REIMBURSE' && action.meta.taskName) {
    return `${String(action.meta.taskName)} • ${action.bandName}`
  }
  if (action.type === 'CONFIRM_REIMBURSEMENT' && action.meta.reimbursedByName) {
    return `From ${String(action.meta.reimbursedByName)} • ${action.bandName}`
  }
  return action.bandName
}
