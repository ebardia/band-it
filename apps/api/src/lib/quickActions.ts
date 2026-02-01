import { prisma } from './prisma'
import { addDays } from 'date-fns'

// Roles that can vote
export const CAN_VOTE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']

// Quick action types
export type QuickActionType = 'VOTE' | 'CONFIRM_PAYMENT' | 'EVENT_RSVP' | 'BAND_INVITE' | 'MENTION'
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

  // Run queries in parallel for better performance
  const [pendingVotes, pendingPayments, pendingEventRsvps, pendingInvitations, unreadMentions] = await Promise.all([
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
            author: { select: { id: true, name: true } },
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
  ])

  // Process pending votes
  for (const proposal of pendingVotes) {
    actions.push({
      type: 'VOTE',
      id: proposal.id,
      title: proposal.title,
      bandName: proposal.band.name,
      bandId: proposal.band.id,
      url: `/quick/vote/${proposal.id}`,
      urgency: getUrgency(proposal.votingEndsAt),
      meta: {
        endsAt: proposal.votingEndsAt,
        timeRemaining: proposal.votingEndsAt
          ? formatTimeRemaining(proposal.votingEndsAt)
          : null,
        proposalType: proposal.type,
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
      url: `/quick/confirm-payment/${payment.id}?token=${payment.confirmationToken}`,
      urgency: 'medium',
      meta: {
        amount: payment.amount,
        currency: payment.currency,
        method: payment.paymentMethod,
        from: payment.initiatedBy.name,
        autoConfirmAt: payment.autoConfirmAt,
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
      url: `/bands/${invitation.band.slug}`,
      urgency: 'medium',
      meta: {
        createdAt: invitation.createdAt,
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

  // Sort by urgency (high first)
  const urgencyOrder = { high: 0, medium: 1, low: 2 }
  actions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  return {
    actions: actions.slice(0, limit),
    total: actions.length,
  }
}
