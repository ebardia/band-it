import { prisma } from './prisma'

// Roles that can vote
export const CAN_VOTE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']

// Quick action types
export type QuickActionType = 'VOTE' | 'CONFIRM_PAYMENT'
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

  // Run queries in parallel for better performance
  const [pendingVotes, pendingPayments] = await Promise.all([
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

  // Sort by urgency (high first)
  const urgencyOrder = { high: 0, medium: 1, low: 2 }
  actions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  return {
    actions: actions.slice(0, limit),
    total: actions.length,
  }
}
