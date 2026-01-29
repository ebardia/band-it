import { prisma } from './prisma'
import { TRPCError } from '@trpc/server'

/**
 * Check if a band has an active dissolution vote.
 * Used to freeze dues and membership changes during the vote.
 */
export async function hasActiveDissolutionVote(bandId: string): Promise<boolean> {
  const dissolution = await prisma.proposal.findFirst({
    where: {
      bandId,
      type: 'DISSOLUTION',
      status: 'OPEN', // Only when voting is active
    },
  })
  return !!dissolution
}

export interface StandingResult {
  inGoodStanding: boolean
  exempt: boolean
  reason?: string
  duesPlan?: {
    amountCents: number
    currency: string
    interval: string
  }
}

/**
 * Check if a member is in good standing (has paid their dues).
 * Returns detailed info about standing status.
 */
export async function checkGoodStanding(
  bandId: string,
  userId: string
): Promise<StandingResult> {
  // 0. Check if there's an active dissolution vote (dues frozen during vote)
  const dissolutionVoteActive = await hasActiveDissolutionVote(bandId)
  if (dissolutionVoteActive) {
    return { inGoodStanding: true, exempt: false }
  }

  // 1. Check if band has an active dues plan
  const duesPlan = await prisma.bandDuesPlan.findFirst({
    where: { bandId, isActive: true },
  })

  // No dues plan = everyone in good standing
  if (!duesPlan) {
    return { inGoodStanding: true, exempt: false }
  }

  // 2. $0 dues plan = everyone in good standing
  if (duesPlan.amountCents === 0) {
    return { inGoodStanding: true, exempt: false }
  }

  // 3. Check if band has enforcement enabled
  const financeSettings = await prisma.bandFinanceSettings.findUnique({
    where: { bandId },
  })

  if (financeSettings && !financeSettings.duesEnforcementEnabled) {
    return { inGoodStanding: true, exempt: false }
  }

  // 4. Check if member is billing owner or treasurer (exempt but tracked)
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: { billingOwnerId: true },
  })

  const member = await prisma.member.findUnique({
    where: { userId_bandId: { userId, bandId } },
  })

  if (!member) {
    return {
      inGoodStanding: false,
      exempt: false,
      reason: 'You are not a member of this band.',
    }
  }

  const isExempt = band?.billingOwnerId === userId || member.isTreasurer

  const duesPlanInfo = {
    amountCents: duesPlan.amountCents,
    currency: duesPlan.currency,
    interval: duesPlan.interval,
  }

  // 5. Check new-member grace period
  if (member.status === 'ACTIVE') {
    const graceDays = financeSettings?.newMemberGraceDays ?? 7
    const memberActivatedAt = member.updatedAt
    const graceEnd = new Date(memberActivatedAt.getTime() + graceDays * 24 * 60 * 60 * 1000)

    if (new Date() < graceEnd) {
      return { inGoodStanding: true, exempt: false }
    }
  }

  // 6. Check billing status
  const billing = await prisma.bandMemberBilling.findUnique({
    where: { bandId_memberUserId: { bandId, memberUserId: userId } },
  })

  if (!billing) {
    if (isExempt) {
      return { inGoodStanding: true, exempt: true, duesPlan: duesPlanInfo }
    }
    return {
      inGoodStanding: false,
      exempt: false,
      reason: 'You have not paid your dues yet.',
      duesPlan: duesPlanInfo,
    }
  }

  if (billing.status === 'ACTIVE') {
    return { inGoodStanding: true, exempt: false }
  }

  // 7. Check lapsed-member grace period
  if (billing.status === 'PAST_DUE') {
    const lapsedGraceDays = financeSettings?.lapsedMemberGraceDays ?? 3
    const paymentFailedAt = billing.updatedAt
    const graceEnd = new Date(paymentFailedAt.getTime() + lapsedGraceDays * 24 * 60 * 60 * 1000)

    if (new Date() < graceEnd) {
      return { inGoodStanding: true, exempt: false }
    }
  }

  // 8. If exempt (billing owner / treasurer), allow but track
  if (isExempt) {
    return { inGoodStanding: true, exempt: true, duesPlan: duesPlanInfo }
  }

  // 9. Not in good standing
  const reasons: Record<string, string> = {
    PAST_DUE: 'Your dues payment is past due. Please update your payment to continue participating.',
    CANCELED: 'Your dues subscription has been canceled. Please renew to continue participating.',
    UNPAID: 'Please pay your dues to participate in band activities.',
  }

  return {
    inGoodStanding: false,
    exempt: false,
    reason: reasons[billing.status] || reasons.UNPAID,
    duesPlan: duesPlanInfo,
  }
}

/**
 * Simple boolean check for good standing.
 */
export async function isInGoodStanding(bandId: string, userId: string): Promise<boolean> {
  const result = await checkGoodStanding(bandId, userId)
  return result.inGoodStanding
}

/**
 * Guard that throws a TRPCError if the member is not in good standing.
 * Use at the start of procedures that should be blocked for unpaid members.
 */
export async function requireGoodStanding(bandId: string, userId: string): Promise<void> {
  const result = await checkGoodStanding(bandId, userId)

  if (!result.inGoodStanding) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: result.reason || 'Please pay your dues to perform this action.',
      cause: { errorCode: 'DUES_REQUIRED' },
    })
  }
}

/**
 * Helper to resolve bandId from a channelId.
 */
export async function getBandIdFromChannel(channelId: string): Promise<string> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { bandId: true },
  })
  if (!channel) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' })
  }
  return channel.bandId
}

/**
 * Helper to resolve bandId from a proposalId.
 */
export async function getBandIdFromProposal(proposalId: string): Promise<string> {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { bandId: true },
  })
  if (!proposal) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposal not found' })
  }
  return proposal.bandId
}

/**
 * Helper to resolve bandId from an eventId.
 */
export async function getBandIdFromEvent(eventId: string): Promise<string> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { bandId: true },
  })
  if (!event) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' })
  }
  return event.bandId
}

/**
 * Helper to resolve bandId from a messageId (message → channel → band).
 */
export async function getBandIdFromMessage(messageId: string): Promise<string> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { channel: { select: { bandId: true } } },
  })
  if (!message) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' })
  }
  return message.channel.bandId
}

/**
 * Helper to resolve bandId from a taskId.
 */
export async function getBandIdFromTask(taskId: string): Promise<string> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { bandId: true },
  })
  if (!task) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
  }
  return task.bandId
}

/**
 * Helper to resolve bandId from a projectId.
 */
export async function getBandIdFromProject(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { bandId: true },
  })
  if (!project) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
  }
  return project.bandId
}
