import { Prisma, PrismaClient } from '@prisma/client'
import { getAuditContext } from './auditContext'

// Entities we want to audit
const AUDITED_ENTITIES = [
  'User',
  'Band',
  'Member',
  'Proposal',
  'Vote',
  'Project',
  'Task',
  'ChecklistItem',
  'Comment',
  'File',
  'Event',
  'EventRSVP',
  'EventAttendance',
]

// Fields to exclude from change tracking (noisy/sensitive)
const EXCLUDED_FIELDS = [
  'updatedAt',
  'createdAt',
  'password',
  'passwordResetToken',
  'passwordResetExpires',
]

// Map entity to its band relationship field
const BAND_ID_FIELD: Record<string, string | null> = {
  'User': null,           // Users are cross-band
  'Band': 'id',           // Band's own ID
  'Member': 'bandId',
  'Proposal': 'bandId',
  'Vote': null,           // Get from proposal
  'Project': 'bandId',
  'Task': 'bandId',
  'ChecklistItem': null,  // Get from task
  'Comment': 'bandId',
  'File': 'bandId',
  'Event': 'bandId',
  'EventRSVP': null,      // Get from event
  'EventAttendance': null, // Get from event
}

// Fields to use as human-readable name
const NAME_FIELD: Record<string, string | null> = {
  'User': 'email',
  'Band': 'name',
  'Member': null,          // Custom logic - fetches user name
  'Proposal': 'title',
  'Vote': null,            // Custom logic - fetches proposal title
  'Project': 'name',
  'Task': 'name',
  'ChecklistItem': 'description',
  'Comment': null,         // Custom logic - shows snippet of content
  'File': 'originalName',
  'Event': 'title',
  'EventRSVP': null,       // Custom logic - fetches event title
  'EventAttendance': null, // Custom logic - fetches event title
}

function computeChanges(before: any, after: any): Record<string, { from: any; to: any }> | null {
  if (!before || !after) return null

  const changes: Record<string, { from: any; to: any }> = {}

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of allKeys) {
    if (EXCLUDED_FIELDS.includes(key)) continue
    if (key.startsWith('_')) continue // Prisma internal fields

    const fromVal = before[key]
    const toVal = after[key]

    // Skip if both are objects (relations) - we only track scalar changes
    if (typeof fromVal === 'object' && fromVal !== null && !Array.isArray(fromVal)) continue
    if (typeof toVal === 'object' && toVal !== null && !Array.isArray(toVal)) continue

    // Compare values
    const fromStr = JSON.stringify(fromVal)
    const toStr = JSON.stringify(toVal)

    if (fromStr !== toStr) {
      changes[key] = { from: fromVal, to: toVal }
    }
  }

  return Object.keys(changes).length > 0 ? changes : null
}

// Format RSVP status for display
function formatRsvpStatus(status: string): string {
  switch (status) {
    case 'GOING': return 'Going'
    case 'NOT_GOING': return 'Not Going'
    case 'MAYBE': return 'Maybe'
    default: return status
  }
}

// Format attendance status for display
function formatAttendanceStatus(status: string): string {
  switch (status) {
    case 'ATTENDED': return 'Attended'
    case 'ABSENT': return 'Absent'
    case 'EXCUSED': return 'Excused'
    default: return status
  }
}

// Get meaningful entity name for models that need custom logic
async function getEntityName(model: string, record: any, prismaClient: PrismaClient): Promise<string | null> {
  if (!record) return null

  // For Member, fetch user name
  if (model === 'Member' && record.userId) {
    try {
      const user = await prismaClient.user.findUnique({
        where: { id: record.userId },
        select: { name: true }
      })
      return user?.name || null
    } catch {
      return null
    }
  }

  // For Vote, fetch proposal title and show vote value
  if (model === 'Vote' && record.proposalId) {
    try {
      const proposal = await prismaClient.proposal.findUnique({
        where: { id: record.proposalId },
        select: { title: true }
      })
      if (proposal) {
        const voteValue = record.vote || 'unknown'
        return `${voteValue} on "${proposal.title}"`
      }
    } catch {
      return record.vote || null
    }
  }

  // For Comment, show a snippet of content
  if (model === 'Comment' && record.content) {
    const snippet = record.content.slice(0, 50)
    return snippet.length < record.content.length ? snippet + '...' : snippet
  }

  // For EventRSVP, fetch event title and combine with status
  if (model === 'EventRSVP' && record.eventId) {
    try {
      const event = await prismaClient.event.findUnique({
        where: { id: record.eventId },
        select: { title: true }
      })
      if (event) {
        return `${formatRsvpStatus(record.status)} - ${event.title}`
      }
    } catch {
      // Fallback to just status if event lookup fails
      return formatRsvpStatus(record.status)
    }
  }

  // For EventAttendance, fetch event title and combine with status
  if (model === 'EventAttendance' && record.eventId) {
    try {
      const event = await prismaClient.event.findUnique({
        where: { id: record.eventId },
        select: { title: true }
      })
      if (event) {
        return `${formatAttendanceStatus(record.status)} - ${event.title}`
      }
    } catch {
      return formatAttendanceStatus(record.status)
    }
  }

  // For other models, use the NAME_FIELD mapping
  const nameField = NAME_FIELD[model]
  if (nameField) {
    return record[nameField] || null
  }

  return null
}

async function getBandId(model: string, record: any, prismaClient: PrismaClient): Promise<string | null> {
  if (!record) return null

  const field = BAND_ID_FIELD[model]

  // For ChecklistItem, look up via task
  if (model === 'ChecklistItem' && record.taskId) {
    try {
      const task = await prismaClient.task.findUnique({
        where: { id: record.taskId },
        select: { bandId: true }
      })
      return task?.bandId || null
    } catch {
      return null
    }
  }

  // For Vote, look up via proposal
  if (model === 'Vote' && record.proposalId) {
    try {
      const proposal = await prismaClient.proposal.findUnique({
        where: { id: record.proposalId },
        select: { bandId: true }
      })
      return proposal?.bandId || null
    } catch {
      return null
    }
  }

  // For EventRSVP, look up via event
  if (model === 'EventRSVP' && record.eventId) {
    try {
      const event = await prismaClient.event.findUnique({
        where: { id: record.eventId },
        select: { bandId: true }
      })
      return event?.bandId || null
    } catch {
      return null
    }
  }

  // For EventAttendance, look up via event
  if (model === 'EventAttendance' && record.eventId) {
    try {
      const event = await prismaClient.event.findUnique({
        where: { id: record.eventId },
        select: { bandId: true }
      })
      return event?.bandId || null
    } catch {
      return null
    }
  }

  if (field === null) return null
  if (field === 'id') return record.id // For Band model itself

  return record[field] || null
}

export function createAuditMiddleware(prismaClient: PrismaClient): Prisma.Middleware {
  return async (params, next) => {
    const { model, action } = params

    // Skip non-audited models
    if (!model || !AUDITED_ENTITIES.includes(model)) {
      return next(params)
    }

    // Skip read operations
    if (!['create', 'update', 'delete', 'updateMany', 'deleteMany'].includes(action)) {
      return next(params)
    }

    // Get context
    const context = getAuditContext()

    // Debug logging for audit context
    if (context.flagged || context.userId) {
      console.log(`[Audit] ${action} ${model}: userId=${context.userId}, flagged=${context.flagged}, flagReasons=${JSON.stringify(context.flagReasons)}`)
    }

    // For update/delete, get the before state
    let beforeState: any = null
    if ((action === 'update' || action === 'delete') && params.args?.where) {
      try {
        beforeState = await (prismaClient as any)[model.charAt(0).toLowerCase() + model.slice(1)].findUnique({
          where: params.args.where,
        })
      } catch (e) {
        // Ignore - might not exist
      }
    }

    // Execute the actual operation
    const result = await next(params)

    // Build audit log entry
    try {
      let auditAction: string
      let entityId: string
      let entityName: string | null = null
      let bandId: string | null = null
      let changes: any = null

      switch (action) {
        case 'create':
          auditAction = 'created'
          entityId = result.id
          entityName = await getEntityName(model, result, prismaClient)
          bandId = await getBandId(model, result, prismaClient)
          break

        case 'update':
          auditAction = 'updated'
          entityId = result.id
          entityName = await getEntityName(model, result, prismaClient)
          bandId = await getBandId(model, result, prismaClient)
          changes = computeChanges(beforeState, result)
          // Skip if nothing meaningful changed
          if (!changes) return result
          break

        case 'delete':
          auditAction = 'deleted'
          entityId = beforeState?.id || params.args?.where?.id || 'unknown'
          entityName = await getEntityName(model, beforeState, prismaClient)
          bandId = await getBandId(model, beforeState, prismaClient)
          break

        case 'updateMany':
        case 'deleteMany':
          // For bulk operations, log a summary
          auditAction = action === 'updateMany' ? 'bulk_updated' : 'bulk_deleted'
          entityId = 'multiple'
          break

        default:
          return result
      }

      // Look up actor's name and membership info
      let actorName: string | null = null
      let actorMemberSince: Date | null = null

      if (context.userId) {
        try {
          const user = await prismaClient.user.findUnique({
            where: { id: context.userId },
            select: { name: true },
          })
          actorName = user?.name || null

          if (bandId) {
            const member = await prismaClient.member.findUnique({
              where: {
                userId_bandId: { userId: context.userId, bandId },
              },
              select: { createdAt: true },
            })
            actorMemberSince = member?.createdAt || null
          }
        } catch {
          // Ignore lookup errors
        }
      }

      // Create audit log (fire and forget - don't block the main operation)
      const auditData = {
        band: bandId ? { connect: { id: bandId } } : undefined,
        action: auditAction,
        entityType: model,
        entityId,
        entityName,
        actorId: context.userId || null,
        actorType: context.userId ? 'user' : 'system',
        actorName,
        actorMemberSince,
        changes,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        // Integrity Guard flags
        flagged: context.flagged || false,
        flagReasons: context.flagReasons || [],
        flagDetails: context.flagDetails || null,
      }

      console.log(`[Audit] Creating entry for ${model}: bandId=${bandId}, actor=${actorName || context.userId || 'system'}, flagged=${context.flagged}`)

      prismaClient.auditLog.create({ data: auditData })
        .then(() => {
          console.log(`[Audit] Saved: ${auditAction} ${model} (${entityId}) bandId=${bandId}`)
        })
        .catch((err: any) => {
          console.error('[Audit] Failed to save:', err.message)
          console.error('[Audit] Data was:', JSON.stringify(auditData, null, 2))
        })

    } catch (err) {
      // Don't let audit failures break the main operation
      console.error('Audit middleware error:', err)
    }

    return result
  }
}
