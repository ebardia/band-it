/**
 * Status Update Service
 *
 * Compiles weekly activity data and sends status update webhooks to external websites.
 */

import { prisma } from '../lib/prisma'
import { webhookService } from './webhook.service'

export interface StatusUpdateData {
  period: {
    start: string
    end: string
  }

  proposals: {
    submitted: Array<{ id: string; title: string; author: string; status: string }>
    approved: Array<{ id: string; title: string; approvedAt: string }>
    rejected: Array<{ id: string; title: string; rejectedAt: string }>
    underReview: Array<{ id: string; title: string; votingEndsAt: string | null }>
  }

  projects: {
    completed: Array<{ id: string; name: string; completedAt: string }>
    statusChanges: Array<{ id: string; name: string; oldStatus: string; newStatus: string }>
  }

  tasks: {
    completed: Array<{ id: string; name: string; assignee: string | null; completedAt: string }>
  }

  checklists: {
    completed: Array<{ id: string; name: string; assignee: string | null; completedAt: string }>
  }

  events: {
    upcoming: Array<{ id: string; title: string; startTime: string; location: string | null }>
    created: Array<{ id: string; title: string; startTime: string }>
  }

  members: {
    joined: Array<{ name: string; role: string; joinedAt: string }>
    left: Array<{ name: string; leftAt: string }>
  }
}

/**
 * Compile status update data for a band over a given period
 */
export async function compileStatusUpdate(
  bandId: string,
  startDate: Date,
  endDate: Date
): Promise<StatusUpdateData> {
  const [
    proposals,
    projects,
    tasks,
    checklists,
    upcomingEvents,
    createdEvents,
    memberActivity,
  ] = await Promise.all([
    // Proposals activity
    prisma.proposal.findMany({
      where: {
        bandId,
        OR: [
          { createdAt: { gte: startDate, lte: endDate } },
          { closedAt: { gte: startDate, lte: endDate } },
        ],
      },
      include: {
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Projects completed or status changed
    prisma.project.findMany({
      where: {
        bandId,
        updatedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { updatedAt: 'desc' },
    }),

    // Tasks completed
    prisma.task.findMany({
      where: {
        bandId,
        status: 'COMPLETED',
        updatedAt: { gte: startDate, lte: endDate },
      },
      include: {
        assignee: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),

    // Checklists completed
    prisma.checklistItem.findMany({
      where: {
        task: { bandId },
        isCompleted: true,
        completedAt: { gte: startDate, lte: endDate },
      },
      include: {
        assignee: { select: { name: true } },
      },
      orderBy: { completedAt: 'desc' },
    }),

    // Upcoming events (next 7 days from endDate)
    prisma.event.findMany({
      where: {
        bandId,
        startTime: {
          gte: endDate,
          lte: new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        },
        isCancelled: false,
      },
      orderBy: { startTime: 'asc' },
      take: 10,
    }),

    // Events created this period
    prisma.event.findMany({
      where: {
        bandId,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Member activity (audit log for joins/leaves)
    prisma.auditLog.findMany({
      where: {
        bandId,
        createdAt: { gte: startDate, lte: endDate },
        action: { in: ['MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_APPROVED', 'PUBLIC_APPLICATION_SUBMITTED'] },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Process proposals
  const proposalData = {
    submitted: proposals
      .filter(p => p.createdAt >= startDate && p.createdAt <= endDate)
      .map(p => ({
        id: p.id,
        title: p.title,
        author: p.createdBy.name,
        status: p.status,
      })),
    approved: proposals
      .filter(p => p.status === 'APPROVED' && p.closedAt && p.closedAt >= startDate)
      .map(p => ({
        id: p.id,
        title: p.title,
        approvedAt: p.closedAt!.toISOString(),
      })),
    rejected: proposals
      .filter(p => p.status === 'REJECTED' && p.closedAt && p.closedAt >= startDate)
      .map(p => ({
        id: p.id,
        title: p.title,
        rejectedAt: p.closedAt!.toISOString(),
      })),
    underReview: proposals
      .filter(p => p.status === 'OPEN')
      .map(p => ({
        id: p.id,
        title: p.title,
        votingEndsAt: p.votingEndsAt?.toISOString() || null,
      })),
  }

  // Process projects
  const projectData = {
    completed: projects
      .filter(p => p.status === 'COMPLETED')
      .map(p => ({
        id: p.id,
        name: p.name,
        completedAt: p.updatedAt.toISOString(),
      })),
    statusChanges: [], // Would need audit log to track this properly
  }

  // Process tasks
  const taskData = {
    completed: tasks.map(t => ({
      id: t.id,
      name: t.name,
      assignee: t.assignee?.name || null,
      completedAt: t.updatedAt.toISOString(),
    })),
  }

  // Process checklists
  const checklistData = {
    completed: checklists.map(c => ({
      id: c.id,
      name: c.description,
      assignee: c.assignee?.name || null,
      completedAt: c.completedAt?.toISOString() || c.updatedAt.toISOString(),
    })),
  }

  // Process events
  const eventData = {
    upcoming: upcomingEvents.map(e => ({
      id: e.id,
      title: e.title,
      startTime: e.startTime.toISOString(),
      location: e.location,
    })),
    created: createdEvents.map(e => ({
      id: e.id,
      title: e.title,
      startTime: e.startTime.toISOString(),
    })),
  }

  // Process member activity from audit logs
  const memberData = {
    joined: memberActivity
      .filter(a => a.action === 'MEMBER_JOINED' || a.action === 'MEMBER_APPROVED')
      .map(a => ({
        name: a.entityName || 'Unknown',
        role: (a.changes as any)?.role || 'VOTING_MEMBER',
        joinedAt: a.createdAt.toISOString(),
      })),
    left: memberActivity
      .filter(a => a.action === 'MEMBER_LEFT')
      .map(a => ({
        name: a.entityName || 'Unknown',
        leftAt: a.createdAt.toISOString(),
      })),
  }

  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    proposals: proposalData,
    projects: projectData,
    tasks: taskData,
    checklists: checklistData,
    events: eventData,
    members: memberData,
  }
}

/**
 * Send status update webhook for a specific band
 */
export async function sendStatusUpdateWebhook(
  bandId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ sent: boolean; error?: string }> {
  // Default to last 7 days
  const end = endDate || new Date()
  const start = startDate || new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Check if band has webhook configured
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: {
      slug: true,
      webhookUrl: true,
      webhookSecret: true,
    },
  })

  if (!band || !band.webhookUrl || !band.webhookSecret) {
    return { sent: false, error: 'No webhook configured for this band' }
  }

  // Compile the status update
  const statusData = await compileStatusUpdate(bandId, start, end)

  // Send via webhook service
  return webhookService.statusUpdate(bandId, {
    title: `Weekly Status Update`,
    content: statusData,
    createdAt: new Date(),
  })
}

/**
 * Send status updates for all bands with webhooks configured
 */
export async function sendAllStatusUpdates(): Promise<{
  sent: number
  failed: number
  errors: Array<{ bandId: string; error: string }>
}> {
  // Find all bands with webhook URLs configured
  const bands = await prisma.band.findMany({
    where: {
      webhookUrl: { not: null },
      webhookSecret: { not: null },
      status: 'ACTIVE',
      dissolvedAt: null,
    },
    select: { id: true, slug: true },
  })

  let sent = 0
  let failed = 0
  const errors: Array<{ bandId: string; error: string }> = []

  for (const band of bands) {
    const result = await sendStatusUpdateWebhook(band.id)
    if (result.sent) {
      sent++
      console.log(`Status update sent for band ${band.slug}`)
    } else {
      failed++
      errors.push({ bandId: band.id, error: result.error || 'Unknown error' })
      console.error(`Failed to send status update for band ${band.slug}:`, result.error)
    }
  }

  return { sent, failed, errors }
}

export const statusUpdateService = {
  compile: compileStatusUpdate,
  send: sendStatusUpdateWebhook,
  sendAll: sendAllStatusUpdates,
}
