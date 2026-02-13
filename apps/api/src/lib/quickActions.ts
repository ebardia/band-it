import { prisma } from './prisma'
import { addDays } from 'date-fns'
import { MemberRole } from '@prisma/client'

// Roles that can vote
export const CAN_VOTE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']

// Role hierarchy for minClaimRole checks
const ROLE_HIERARCHY: Record<MemberRole, number> = {
  FOUNDER: 6,
  GOVERNOR: 5,
  MODERATOR: 4,
  CONDUCTOR: 3,
  VOTING_MEMBER: 2,
  OBSERVER: 1,
}

// Quick action types - desktop users redirected to full pages
export type QuickActionType = 'VOTE' | 'CONFIRM_PAYMENT' | 'EVENT_RSVP' | 'BAND_INVITE' | 'MENTION' | 'CHECKLIST' | 'REVIEW_APPLICATION'

// Roles that can review applications
const CAN_REVIEW_APPLICATIONS = ['FOUNDER', 'GOVERNOR', 'MODERATOR']
export type Urgency = 'high' | 'medium' | 'low'

export interface QuickAction {
  type: QuickActionType
  id: string
  title: string
  bandName: string
  bandId: string
  url: string
  urgency: Urgency
  meta: Record<string, any>
}

// Calculate urgency based on deadline
export function getUrgency(endsAt: Date | null): Urgency {
  if (!endsAt) return 'low'
  const hoursLeft = (endsAt.getTime() - Date.now()) / (1000 * 60 * 60)
  if (hoursLeft < 24) return 'high'
  if (hoursLeft < 72) return 'medium'
  return 'low'
}

// Format time remaining for display
export function formatTimeRemaining(endsAt: Date): string {
  const hoursLeft = (endsAt.getTime() - Date.now()) / (1000 * 60 * 60)
  if (hoursLeft < 1) return 'Less than 1 hour'
  if (hoursLeft < 24) return `${Math.ceil(hoursLeft)} hours`
  const daysLeft = Math.ceil(hoursLeft / 24)
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'}`
}

/**
 * Get all pending quick actions for a user
 * Used by both the API endpoint and the digest email job
 */
export async function getQuickActionsForUser(
  userId: string,
  limit: number = 5
): Promise<{ actions: QuickAction[]; total: number }> {
  const actions: QuickAction[] = []
  const now = new Date()

  // Get user's last digest timestamp to filter mentions
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { digestLastSentAt: true },
  })
  // Only show mentions since last digest (or last 7 days if never sent)
  const mentionsSince = user?.digestLastSentAt || addDays(now, -7)

  // Get user's memberships with roles for task filtering
  const memberships = await prisma.member.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      band: { dissolvedAt: null },
    },
    select: { bandId: true, role: true },
  })
  const bandRoles = new Map<string, MemberRole>()
  memberships.forEach(m => bandRoles.set(m.bandId, m.role))
  const userBandIds = Array.from(bandRoles.keys())

  // Get bands where user can review applications
  const reviewerBandIds = memberships
    .filter(m => CAN_REVIEW_APPLICATIONS.includes(m.role))
    .map(m => m.bandId)

  // Run queries in parallel for better performance
  const [pendingVotes, pendingPayments, pendingEventRsvps, pendingInvitations, unreadMentions, claimableChecklistItems, pendingApplications] = await Promise.all([
    // 1. Pending votes - proposals open for voting where user hasn't voted
    prisma.proposal.findMany({
      where: {
        status: 'OPEN',
        votingEndsAt: { gt: now },
        band: {
          members: {
            some: {
              userId,
              status: 'ACTIVE',
              role: { in: CAN_VOTE as any },
            },
          },
        },
        votes: {
          none: { userId },
        },
      },
      include: {
        band: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { votingEndsAt: 'asc' },
      take: limit,
    }),

    // 2. Pending payment confirmations - payments where user needs to confirm
    // User confirms when: they are the payer AND someone else initiated
    prisma.manualPayment.findMany({
      where: {
        status: 'PENDING',
        memberUserId: userId,
        NOT: {
          initiatedById: userId,
        },
      },
      include: {
        band: { select: { id: true, name: true, slug: true } },
        initiatedBy: { select: { id: true, name: true } },
      },
      take: limit,
    }),

    // 3. Events needing RSVP - upcoming events (within 7 days) user hasn't RSVPed to
    prisma.event.findMany({
      where: {
        startTime: {
          gt: now,
          lte: addDays(now, 7),
        },
        band: {
          members: {
            some: {
              userId,
              status: 'ACTIVE',
            },
          },
        },
        rsvps: {
          none: { userId },
        },
      },
      include: {
        band: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { startTime: 'asc' },
      take: limit,
    }),

    // 4. Pending band invitations (Member records with INVITED status)
    prisma.member.findMany({
      where: {
        userId,
        status: 'INVITED',
      },
      include: {
        band: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),

    // 5. Unread @mentions - only since last digest was sent
    prisma.messageMention.findMany({
      where: {
        userId,
        message: {
          createdAt: { gt: mentionsSince },
          deletedAt: null,
          // Exclude own messages
          NOT: { authorId: userId },
        },
      },
      include: {
        message: {
          include: {
            author: { select: { id: true, name: true, deletedAt: true } },
            channel: {
              select: {
                id: true,
                name: true,
                band: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
      orderBy: { message: { createdAt: 'desc' } },
      take: limit,
    }),

    // 6. Claimable checklist items - unassigned items user can claim
    userBandIds.length > 0 ? prisma.checklistItem.findMany({
      where: {
        task: {
          bandId: { in: userBandIds },
          status: { in: ['TODO', 'IN_PROGRESS'] }, // Only from active tasks
          project: {
            status: { notIn: ['CANCELLED', 'COMPLETED'] }, // Exclude cancelled/completed projects
          },
        },
        assigneeId: null,
        isCompleted: false,
        OR: [
          { verificationStatus: null },
          { verificationStatus: { not: 'APPROVED' } },
        ],
      },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            project: { select: { id: true, name: true } },
            band: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
      take: limit * 2, // Fetch extra since we'll filter by role
    }) : Promise.resolve([]),

    // 7. Pending applications - applications to bands where user can review
    reviewerBandIds.length > 0 ? prisma.member.findMany({
      where: {
        bandId: { in: reviewerBandIds },
        status: 'PENDING', // Application pending review
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        band: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'asc' }, // Oldest first
      take: limit,
    }) : Promise.resolve([]),
  ])

  // Process pending votes
  for (const proposal of pendingVotes) {
    actions.push({
      type: 'VOTE',
      id: proposal.id,
      title: proposal.title,
      bandName: proposal.band.name,
      bandId: proposal.band.id,
      url: `/quick/vote/${proposal.id}?band=${proposal.band.slug}`,
      urgency: getUrgency(proposal.votingEndsAt),
      meta: {
        endsAt: proposal.votingEndsAt,
        timeRemaining: proposal.votingEndsAt
          ? formatTimeRemaining(proposal.votingEndsAt)
          : null,
        proposalType: proposal.type,
        bandSlug: proposal.band.slug,
      },
    })
  }

  // Process pending payment confirmations
  for (const payment of pendingPayments) {
    // Format amount
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: payment.currency.toUpperCase(),
    }).format(payment.amount / 100)

    actions.push({
      type: 'CONFIRM_PAYMENT',
      id: payment.id,
      title: `${formattedAmount} via ${payment.paymentMethod}`,
      bandName: payment.band.name,
      bandId: payment.band.id,
      url: `/quick/confirm-payment/${payment.id}?token=${payment.confirmationToken}&band=${payment.band.slug}`,
      urgency: 'medium',
      meta: {
        amount: payment.amount,
        currency: payment.currency,
        method: payment.paymentMethod,
        from: payment.initiatedBy.name,
        autoConfirmAt: payment.autoConfirmAt,
        bandSlug: payment.band.slug,
      },
    })
  }

  // Process pending event RSVPs
  for (const event of pendingEventRsvps) {
    const eventDate = new Date(event.startTime)
    const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    actions.push({
      type: 'EVENT_RSVP',
      id: event.id,
      title: event.title,
      bandName: event.band.name,
      bandId: event.band.id,
      url: `/bands/${event.band.slug}/events/${event.id}`,
      urgency: hoursUntil < 24 ? 'high' : hoursUntil < 48 ? 'medium' : 'low',
      meta: {
        startTime: event.startTime,
        location: event.location,
        timeRemaining: formatTimeRemaining(eventDate),
      },
    })
  }

  // Process pending band invitations
  for (const invitation of pendingInvitations) {
    actions.push({
      type: 'BAND_INVITE',
      id: invitation.id,
      title: `Join ${invitation.band.name}`,
      bandName: invitation.band.name,
      bandId: invitation.band.id,
      url: `/invitations`,
      urgency: 'medium',
      meta: {
        createdAt: invitation.createdAt,
        bandSlug: invitation.band.slug,
      },
    })
  }

  // Process unread mentions from MessageMention table
  for (const mention of unreadMentions) {
    const message = mention.message
    actions.push({
      type: 'MENTION',
      id: message.id,
      title: `${message.author.name} mentioned you`,
      bandName: message.channel.band.name,
      bandId: message.channel.band.id,
      url: `/bands/${message.channel.band.slug}`,
      urgency: 'low',
      meta: {
        channelName: message.channel.name,
        authorName: message.author.name,
        preview: message.content.substring(0, 100),
        createdAt: message.createdAt,
      },
    })
  }

  // Process claimable checklist items - filter by role requirement
  for (const item of claimableChecklistItems) {
    const userRole = bandRoles.get(item.task.band.id)
    if (!userRole) continue

    // Check role requirement
    if (item.minClaimRole) {
      const userRoleLevel = ROLE_HIERARCHY[userRole] || 0
      const minRoleLevel = ROLE_HIERARCHY[item.minClaimRole] || 0
      if (userRoleLevel < minRoleLevel) continue
    }

    // Determine urgency based on due date and priority
    let urgency: Urgency = 'low'
    if (item.dueDate) {
      const hoursUntilDue = (item.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      if (hoursUntilDue < 0) urgency = 'high' // Overdue
      else if (hoursUntilDue < 24) urgency = 'high'
      else if (hoursUntilDue < 72) urgency = 'medium'
    }
    // High priority items are always at least medium urgency
    if (item.priority === 'URGENT') urgency = 'high'
    else if (item.priority === 'HIGH' && urgency === 'low') urgency = 'medium'

    actions.push({
      type: 'CHECKLIST',
      id: item.id,
      title: item.description.substring(0, 80) + (item.description.length > 80 ? '...' : ''),
      bandName: item.task.band.name,
      bandId: item.task.band.id,
      url: `/quick/checklist/${item.id}?band=${item.task.band.slug}&task=${item.task.id}`,
      urgency,
      meta: {
        taskName: item.task.name,
        taskId: item.task.id,
        projectName: item.task.project.name,
        priority: item.priority,
        dueDate: item.dueDate,
        timeRemaining: item.dueDate ? formatTimeRemaining(item.dueDate) : null,
        contextPhone: item.contextPhone,
        contextComputer: item.contextComputer,
        contextTravel: item.contextTravel,
        contextTimeMinutes: item.contextTimeMinutes,
        bandSlug: item.task.band.slug,
      },
    })
  }

  // Process pending applications
  for (const application of pendingApplications) {
    // Calculate how long the application has been waiting
    const hoursWaiting = (now.getTime() - application.createdAt.getTime()) / (1000 * 60 * 60)
    let urgency: Urgency = 'low'
    if (hoursWaiting > 72) urgency = 'high' // Waiting more than 3 days
    else if (hoursWaiting > 24) urgency = 'medium' // Waiting more than 1 day

    actions.push({
      type: 'REVIEW_APPLICATION',
      id: application.id,
      title: `${application.user.name || application.user.email} wants to join`,
      bandName: application.band.name,
      bandId: application.band.id,
      url: `/bands/${application.band.slug}/applications`,
      urgency,
      meta: {
        applicantName: application.user.name,
        applicantEmail: application.user.email,
        appliedAt: application.createdAt,
        waitingTime: hoursWaiting > 24
          ? `${Math.floor(hoursWaiting / 24)} day${Math.floor(hoursWaiting / 24) === 1 ? '' : 's'}`
          : `${Math.floor(hoursWaiting)} hour${Math.floor(hoursWaiting) === 1 ? '' : 's'}`,
        bandSlug: application.band.slug,
      },
    })
  }

  // Sort by urgency (high first)
  const urgencyOrder = { high: 0, medium: 1, low: 2 }
  actions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  return {
    actions: actions.slice(0, limit),
    total: actions.length,
  }
}
