/**
 * Formats audit log entries into human-readable descriptions
 */

interface AuditEntry {
  action: string
  entityType: string
  entityId: string
  entityName: string | null
  actorName: string | null
  changes: Record<string, { from: any; to: any }> | null
}

interface FormattedAudit {
  description: string
  category: AuditCategory
}

export type AuditCategory =
  | 'membership'
  | 'voting'
  | 'proposals'
  | 'projects'
  | 'tasks'
  | 'events'
  | 'settings'
  | 'other'

/**
 * Get the category for an audit entry
 */
export function getAuditCategory(entityType: string, action: string, changes: Record<string, any> | null): AuditCategory {
  switch (entityType) {
    case 'Member':
      return 'membership'
    case 'Vote':
      return 'voting'
    case 'Proposal':
      return 'proposals'
    case 'Project':
      return 'projects'
    case 'Task':
    case 'ChecklistItem':
      return 'tasks'
    case 'Event':
    case 'EventRSVP':
    case 'EventAttendance':
      return 'events'
    case 'Band':
      // Check if it's a governance settings change
      if (changes && (
        'votingMethod' in changes ||
        'votingPeriodDays' in changes ||
        'quorumPercentage' in changes ||
        'requireProposalReview' in changes
      )) {
        return 'settings'
      }
      return 'other'
    default:
      return 'other'
  }
}

/**
 * Format a role name for display
 */
function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    'FOUNDER': 'Founder',
    'GOVERNOR': 'Governor',
    'MODERATOR': 'Moderator',
    'CONDUCTOR': 'Conductor',
    'VOTING_MEMBER': 'Voting Member',
    'OBSERVER': 'Observer',
  }
  return roleMap[role] || role
}

/**
 * Format a status for display
 */
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'pending',
    'ACTIVE': 'active',
    'INVITED': 'invited',
    'DRAFT': 'draft',
    'PENDING_REVIEW': 'pending review',
    'OPEN': 'open for voting',
    'APPROVED': 'approved',
    'REJECTED': 'rejected',
    'CLOSED': 'closed',
    'WITHDRAWN': 'withdrawn',
  }
  return statusMap[status] || status.toLowerCase()
}

/**
 * Get a short entity name, truncating if needed
 */
function shortName(name: string | null, maxLen: number = 40): string {
  if (!name) return 'unknown'
  if (name.length <= maxLen) return name
  return name.slice(0, maxLen - 3) + '...'
}

/**
 * Format an audit entry into a human-readable description
 */
export function formatAuditDescription(entry: AuditEntry): FormattedAudit {
  const { action, entityType, entityName, actorName, changes } = entry
  const actor = actorName || 'System'
  const name = shortName(entityName)

  const category = getAuditCategory(entityType, action, changes)

  // Member actions
  if (entityType === 'Member') {
    // Check for role change (promotion/demotion)
    if (changes?.role) {
      const fromRole = formatRole(changes.role.from)
      const toRole = formatRole(changes.role.to)
      // Determine if it's a promotion or demotion based on role hierarchy
      const roleHierarchy = ['OBSERVER', 'VOTING_MEMBER', 'CONDUCTOR', 'MODERATOR', 'GOVERNOR', 'FOUNDER']
      const fromIndex = roleHierarchy.indexOf(changes.role.from)
      const toIndex = roleHierarchy.indexOf(changes.role.to)

      if (toIndex > fromIndex) {
        return { description: `${actor} promoted ${name} to ${toRole}`, category }
      } else {
        return { description: `${actor} changed ${name}'s role to ${toRole}`, category }
      }
    }

    // Check for status change
    if (changes?.status) {
      const { from, to } = changes.status

      // Joined the band (PENDING/INVITED -> ACTIVE)
      if (to === 'ACTIVE' && (from === 'PENDING' || from === 'INVITED')) {
        // If actor is same as entity name, they accepted their own invitation
        if (actor === name) {
          return { description: `${name} joined the band`, category }
        }
        return { description: `${actor} approved ${name}'s membership`, category }
      }

      // Left or removed
      if (from === 'ACTIVE' && to !== 'ACTIVE') {
        if (actor === name) {
          return { description: `${name} left the band`, category }
        }
        return { description: `${actor} removed ${name} from the band`, category }
      }
    }

    // Created member (invitation sent)
    if (action === 'created') {
      if (actor === name) {
        return { description: `${name} applied to join the band`, category }
      }
      return { description: `${actor} invited ${name} to the band`, category }
    }

    // Deleted member
    if (action === 'deleted') {
      return { description: `${actor} removed ${name} from the band`, category }
    }

    // Generic update
    return { description: `${actor} updated ${name}'s membership`, category }
  }

  // Vote actions
  if (entityType === 'Vote') {
    if (action === 'created') {
      // entityName should be like "YES on proposal title" or contain the vote
      const voteMatch = entityName?.match(/^(YES|NO|ABSTAIN) on "?(.+)"?$/)
      if (voteMatch) {
        const [, vote, proposalTitle] = voteMatch
        return { description: `${actor} voted ${vote} on "${shortName(proposalTitle, 35)}"`, category }
      }
      return { description: `${actor} voted on "${name}"`, category }
    }
    if (action === 'updated') {
      return { description: `${actor} changed their vote on "${name}"`, category }
    }
    if (action === 'deleted') {
      return { description: `${actor}'s vote was reset on "${name}"`, category }
    }
  }

  // Proposal actions
  if (entityType === 'Proposal') {
    if (action === 'created') {
      return { description: `${actor} created proposal "${name}"`, category }
    }

    if (action === 'updated' && changes?.status) {
      const { from, to } = changes.status

      if (from === 'DRAFT' && to === 'OPEN') {
        return { description: `${actor} submitted proposal "${name}" for voting`, category }
      }
      if (from === 'DRAFT' && to === 'PENDING_REVIEW') {
        return { description: `${actor} submitted proposal "${name}" for review`, category }
      }
      if (from === 'PENDING_REVIEW' && to === 'OPEN') {
        return { description: `${actor} approved proposal "${name}" for voting`, category }
      }
      if (to === 'APPROVED') {
        return { description: `Proposal "${name}" was approved`, category }
      }
      if (to === 'REJECTED') {
        return { description: `${actor} rejected proposal "${name}"`, category }
      }
      if (to === 'CLOSED') {
        return { description: `Proposal "${name}" voting closed`, category }
      }
      if (to === 'WITHDRAWN') {
        return { description: `${actor} withdrew proposal "${name}"`, category }
      }
    }

    if (action === 'updated') {
      return { description: `${actor} updated proposal "${name}"`, category }
    }

    if (action === 'deleted') {
      return { description: `${actor} deleted proposal "${name}"`, category }
    }
  }

  // Project actions
  if (entityType === 'Project') {
    if (action === 'created') {
      return { description: `${actor} created project "${name}"`, category }
    }
    if (action === 'updated' && changes?.status) {
      const { to } = changes.status
      const statusText = formatStatus(to)
      return { description: `${actor} marked project "${name}" as ${statusText}`, category }
    }
    if (action === 'updated') {
      return { description: `${actor} updated project "${name}"`, category }
    }
    if (action === 'deleted') {
      return { description: `${actor} deleted project "${name}"`, category }
    }
  }

  // Task actions
  if (entityType === 'Task') {
    if (action === 'created') {
      return { description: `${actor} created task "${name}"`, category }
    }
    if (action === 'updated' && changes?.status) {
      const { to } = changes.status
      if (to === 'COMPLETED') {
        return { description: `${actor} completed task "${name}"`, category }
      }
      if (to === 'IN_PROGRESS') {
        return { description: `${actor} started working on task "${name}"`, category }
      }
      if (to === 'BLOCKED') {
        return { description: `${actor} marked task "${name}" as blocked`, category }
      }
    }
    if (action === 'updated' && changes?.assigneeId) {
      if (changes.assigneeId.to && !changes.assigneeId.from) {
        return { description: `${actor} claimed task "${name}"`, category }
      }
      return { description: `${actor} reassigned task "${name}"`, category }
    }
    if (action === 'updated') {
      return { description: `${actor} updated task "${name}"`, category }
    }
    if (action === 'deleted') {
      return { description: `${actor} deleted task "${name}"`, category }
    }
  }

  // Checklist item actions
  if (entityType === 'ChecklistItem') {
    if (action === 'created') {
      return { description: `${actor} added checklist item "${name}"`, category }
    }
    if (action === 'updated' && changes?.isCompleted) {
      if (changes.isCompleted.to === true) {
        return { description: `${actor} completed checklist item "${name}"`, category }
      } else {
        return { description: `${actor} unchecked checklist item "${name}"`, category }
      }
    }
    if (action === 'updated') {
      return { description: `${actor} updated checklist item "${name}"`, category }
    }
    if (action === 'deleted') {
      return { description: `${actor} removed checklist item "${name}"`, category }
    }
  }

  // Event actions
  if (entityType === 'Event') {
    if (action === 'created') {
      return { description: `${actor} created event "${name}"`, category }
    }
    if (action === 'updated') {
      return { description: `${actor} updated event "${name}"`, category }
    }
    if (action === 'deleted') {
      return { description: `${actor} cancelled event "${name}"`, category }
    }
  }

  // Event RSVP
  if (entityType === 'EventRSVP') {
    if (action === 'created' || action === 'updated') {
      // entityName might contain the RSVP status
      const rsvpMatch = entityName?.match(/(GOING|NOT_GOING|MAYBE)/)
      if (rsvpMatch) {
        const status = rsvpMatch[1]
        const statusText = status === 'GOING' ? 'Going' : status === 'NOT_GOING' ? 'Not going' : 'Maybe'
        return { description: `${actor} RSVPed "${statusText}" to an event`, category }
      }
      return { description: `${actor} updated their RSVP`, category }
    }
  }

  // Band actions
  if (entityType === 'Band') {
    if (action === 'created') {
      return { description: `${actor} created the band`, category }
    }
    if (action === 'updated' && changes?.status) {
      if (changes.status.to === 'ACTIVE') {
        return { description: `${actor} activated the band`, category }
      }
      if (changes.status.to === 'DISSOLVED') {
        return { description: `${actor} dissolved the band`, category }
      }
    }
    if (action === 'updated') {
      // Check for specific settings changes
      if (changes?.votingMethod) {
        return { description: `${actor} changed voting method to ${changes.votingMethod.to}`, category }
      }
      if (changes?.votingPeriodDays) {
        return { description: `${actor} changed voting period to ${changes.votingPeriodDays.to} days`, category }
      }
      if (changes?.quorumPercentage !== undefined) {
        return { description: `${actor} changed quorum to ${changes.quorumPercentage.to}%`, category }
      }
      if (changes?.requireProposalReview !== undefined) {
        const enabled = changes.requireProposalReview.to ? 'enabled' : 'disabled'
        return { description: `${actor} ${enabled} proposal review requirement`, category }
      }
      return { description: `${actor} updated band settings`, category }
    }
  }

  // Comment actions
  if (entityType === 'Comment') {
    if (action === 'created') {
      return { description: `${actor} posted a comment`, category }
    }
    if (action === 'updated') {
      return { description: `${actor} edited a comment`, category }
    }
    if (action === 'deleted') {
      return { description: `${actor} deleted a comment`, category }
    }
  }

  // File actions
  if (entityType === 'File') {
    if (action === 'created') {
      return { description: `${actor} uploaded file "${name}"`, category }
    }
    if (action === 'deleted') {
      return { description: `${actor} deleted file "${name}"`, category }
    }
  }

  // Generic fallback
  const actionText = action === 'created' ? 'created' : action === 'updated' ? 'updated' : action === 'deleted' ? 'deleted' : action
  return { description: `${actor} ${actionText} ${entityType.toLowerCase()} "${name}"`, category }
}

/**
 * Categories with display labels
 */
export const AUDIT_CATEGORIES: { value: AuditCategory; label: string }[] = [
  { value: 'membership', label: 'Membership' },
  { value: 'voting', label: 'Voting' },
  { value: 'proposals', label: 'Proposals' },
  { value: 'projects', label: 'Projects' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'events', label: 'Events' },
  { value: 'settings', label: 'Settings' },
  { value: 'other', label: 'Other' },
]
