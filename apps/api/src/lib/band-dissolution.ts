import Stripe from 'stripe'
import { prisma } from './prisma'
import { MemberRole, DissolutionMethod } from '@prisma/client'
import { notificationService } from '../services/notification.service'
import { emailService } from '../server/services/email.service'
import { MIN_MEMBERS_TO_ACTIVATE } from '@band-it/shared'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Roles that can vote on proposals
const VOTING_ROLES: MemberRole[] = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']

export interface DissolutionEligibility {
  canDissolve: boolean
  method: 'DIRECT' | 'PROPOSAL' | null
  reason?: string
  memberCount?: number
}

/**
 * Check if a user can dissolve a band and by what method
 */
export async function checkDissolutionEligibility(
  bandId: string,
  userId: string
): Promise<DissolutionEligibility> {
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    include: {
      members: {
        where: { status: 'ACTIVE' },
        select: { userId: true, role: true },
      },
      subBands: {
        where: { dissolvedAt: null },
        select: { name: true },
      },
    },
  })

  if (!band) {
    return { canDissolve: false, method: null, reason: 'Band not found' }
  }

  if (band.dissolvedAt) {
    return { canDissolve: false, method: null, reason: 'Band is already dissolved' }
  }

  // Block Big Band dissolution if active sub-bands exist
  if (band.subBands.length > 0) {
    const subBandNames = band.subBands.map(sb => sb.name).join(', ')
    return {
      canDissolve: false,
      method: null,
      reason: `Cannot dissolve a Big Band with active sub-bands. Please dissolve these sub-bands first: ${subBandNames}`,
    }
  }

  const memberCount = band.members.length
  const userMember = band.members.find(m => m.userId === userId)

  if (!userMember) {
    return { canDissolve: false, method: null, reason: 'You are not a member of this band' }
  }

  const isFounder = userMember.role === 'FOUNDER'

  // Below minimum active members: only founder can dissolve directly
  if (memberCount < MIN_MEMBERS_TO_ACTIVATE) {
    if (isFounder) {
      return {
        canDissolve: true,
        method: 'DIRECT',
        memberCount,
        reason: `As founder, you can dissolve this band directly since it has fewer than ${MIN_MEMBERS_TO_ACTIVATE} members.`,
      }
    } else {
      return {
        canDissolve: false,
        method: null,
        memberCount,
        reason: `Only the founder can dissolve bands with fewer than ${MIN_MEMBERS_TO_ACTIVATE} members.`,
      }
    }
  }

  // Minimum or more members: must create a dissolution proposal
  return {
    canDissolve: true,
    method: 'PROPOSAL',
    memberCount,
    reason: 'Dissolution requires a proposal with unanimous approval from all voting members.',
  }
}

/**
 * Check if there's an active dissolution proposal for a band
 */
export async function hasActiveDissolutionProposal(bandId: string): Promise<boolean> {
  const existing = await prisma.proposal.findFirst({
    where: {
      bandId,
      type: 'DISSOLUTION',
      status: { in: ['DRAFT', 'PENDING_REVIEW', 'OPEN'] },
    },
  })
  return !!existing
}

/**
 * Cancel Band It subscription (platform subscription)
 * Returns true if cancelled, false if no subscription, throws on error
 */
export async function cancelBandItSubscription(bandId: string): Promise<{ cancelled: boolean; error?: string }> {
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: { stripeSubscriptionId: true },
  })

  if (!band?.stripeSubscriptionId) {
    return { cancelled: false }
  }

  try {
    await stripe.subscriptions.cancel(band.stripeSubscriptionId)
    return { cancelled: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Failed to cancel Band It subscription for band ${bandId}:`, error)
    return { cancelled: false, error: errorMsg }
  }
}

/**
 * Cancel all member dues subscriptions
 * Returns count of cancelled subscriptions and any errors
 */
export async function cancelAllMemberDues(bandId: string): Promise<{
  cancelled: number
  failed: number
  errors: string[]
}> {
  // Get band's Stripe Connect account
  const bandStripeAccount = await prisma.bandStripeAccount.findFirst({
    where: {
      bandId,
      disconnectedAt: null, // Active account only
    },
  })

  if (!bandStripeAccount?.stripeAccountId) {
    return { cancelled: 0, failed: 0, errors: [] }
  }

  // Get all active member billing records
  const memberBillings = await prisma.bandMemberBilling.findMany({
    where: {
      bandId,
      status: 'ACTIVE',
      stripeSubscriptionId: { not: null },
    },
  })

  let cancelled = 0
  let failed = 0
  const errors: string[] = []

  for (const billing of memberBillings) {
    try {
      await stripe.subscriptions.cancel(
        billing.stripeSubscriptionId!,
        { stripeAccount: bandStripeAccount.stripeAccountId }
      )

      await prisma.bandMemberBilling.update({
        where: { id: billing.id },
        data: { status: 'CANCELED' },
      })

      cancelled++
    } catch (error) {
      const errorMsg = `Failed to cancel dues subscription ${billing.stripeSubscriptionId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      errors.push(errorMsg)
      failed++
    }
  }

  return { cancelled, failed, errors }
}

/**
 * Delete all active content for a band (proposals, projects, tasks, events, etc.)
 */
export async function deleteActiveContent(bandId: string): Promise<{
  deletedProposals: number
  deletedProjects: number
  deletedTasks: number
  deletedEvents: number
  deletedChannels: number
}> {
  // Use a transaction for data integrity
  const result = await prisma.$transaction(async (tx) => {
    // Delete tasks first (depends on projects)
    const deletedTasks = await tx.task.deleteMany({
      where: { bandId },
    })

    // Delete projects (depends on proposals)
    const deletedProjects = await tx.project.deleteMany({
      where: { bandId },
    })

    // Delete proposals
    const deletedProposals = await tx.proposal.deleteMany({
      where: { bandId },
    })

    // Delete events
    const deletedEvents = await tx.event.deleteMany({
      where: { bandId },
    })

    // Delete channels and messages
    const deletedChannels = await tx.channel.deleteMany({
      where: { bandId },
    })

    return {
      deletedProposals: deletedProposals.count,
      deletedProjects: deletedProjects.count,
      deletedTasks: deletedTasks.count,
      deletedEvents: deletedEvents.count,
      deletedChannels: deletedChannels.count,
    }
  })

  return result
}

/**
 * Invalidate all pending invites for a band
 */
export async function invalidatePendingInvites(bandId: string): Promise<number> {
  const result = await prisma.pendingInvite.updateMany({
    where: {
      bandId,
      invalidatedAt: null,
    },
    data: {
      invalidatedAt: new Date(),
      invalidationReason: 'BAND_DISSOLVED',
    },
  })

  // Also reject pending member applications
  await prisma.member.updateMany({
    where: {
      bandId,
      status: { in: ['PENDING', 'INVITED'] },
    },
    data: {
      status: 'REJECTED',
    },
  })

  return result.count
}

/**
 * Notify Band It admins about Stripe failures during dissolution
 */
export async function notifyAdminsOfStripeFailure(
  bandId: string,
  bandName: string,
  errors: string[]
): Promise<void> {
  // Get all admin users
  const admins = await prisma.user.findMany({
    where: { isAdmin: true },
    select: { id: true, email: true },
  })

  for (const admin of admins) {
    await notificationService.create({
      userId: admin.id,
      type: 'BILLING_PAYMENT_FAILED', // Reuse existing type
      actionUrl: `/admin/bands`,
      priority: 'HIGH',
      metadata: {
        bandId,
        bandName,
        context: 'dissolution_stripe_failure',
        errors,
      },
      relatedId: bandId,
      relatedType: 'BAND',
    })
  }
}

/**
 * Notify all members about dissolution
 */
export async function notifyMembersOfDissolution(
  bandId: string,
  bandName: string,
  method: DissolutionMethod,
  reason: string,
  dissolverId: string
): Promise<void> {
  const members = await prisma.member.findMany({
    where: {
      bandId,
      status: 'ACTIVE',
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  for (const member of members) {
    // Skip the person who initiated dissolution
    if (member.userId === dissolverId) continue

    // In-app notification
    await notificationService.create({
      userId: member.userId,
      type: 'BAND_DISSOLVED',
      actionUrl: '/bands',
      priority: 'HIGH',
      metadata: {
        bandName,
        method,
        reason,
      },
      relatedId: bandId,
      relatedType: 'BAND',
    })

    // Email notification
    try {
      await emailService.sendBandDissolvedEmail({
        email: member.user.email,
        userName: member.user.name,
        bandName,
        reason,
      })
    } catch (error) {
      console.error(`Failed to send dissolution email to ${member.user.email}:`, error)
    }
  }
}

/**
 * Execute full dissolution process
 */
export async function executeDissolution(
  bandId: string,
  userId: string,
  reason: string,
  method: DissolutionMethod
): Promise<{
  success: boolean
  stripeErrors: string[]
  deletedContent: {
    proposals: number
    projects: number
    tasks: number
    events: number
    channels: number
  }
}> {
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: { name: true, slug: true },
  })

  if (!band) {
    throw new Error('Band not found')
  }

  const stripeErrors: string[] = []

  // 1. Cancel Band It subscription
  const bandItResult = await cancelBandItSubscription(bandId)
  if (bandItResult.error) {
    stripeErrors.push(`Band It subscription: ${bandItResult.error}`)
  }

  // 2. Cancel all member dues subscriptions
  const duesResult = await cancelAllMemberDues(bandId)
  stripeErrors.push(...duesResult.errors)

  // 3. Invalidate pending invites
  await invalidatePendingInvites(bandId)

  // 4. Delete active content
  const deletedContent = await deleteActiveContent(bandId)

  // 5. Mark band as dissolved (release slug by clearing it is NOT needed - we filter by dissolvedAt)
  await prisma.band.update({
    where: { id: bandId },
    data: {
      dissolvedAt: new Date(),
      dissolvedById: userId,
      dissolutionMethod: method,
      dissolutionReason: reason,
      // Clear subscription data
      stripeSubscriptionId: null,
      stripePriceId: null,
      billingStatus: 'INACTIVE',
      status: 'INACTIVE',
    },
  })

  // 6. Log to audit
  await prisma.auditLog.create({
    data: {
      bandId,
      action: 'dissolved',
      entityType: 'Band',
      entityId: bandId,
      entityName: band.name,
      actorId: userId,
      actorType: 'user',
      changes: {
        method,
        reason,
        deletedContent,
      },
    },
  })

  // 7. Notify members
  await notifyMembersOfDissolution(bandId, band.name, method, reason, userId)

  // 8. Notify admins if there were Stripe errors
  if (stripeErrors.length > 0) {
    await notifyAdminsOfStripeFailure(bandId, band.name, stripeErrors)
  }

  return {
    success: true,
    stripeErrors,
    deletedContent: {
      proposals: deletedContent.deletedProposals,
      projects: deletedContent.deletedProjects,
      tasks: deletedContent.deletedTasks,
      events: deletedContent.deletedEvents,
      channels: deletedContent.deletedChannels,
    },
  }
}

/**
 * Check if dissolution voting passed (unanimous among those who voted)
 */
export async function checkDissolutionVotePassed(proposalId: string): Promise<{
  passed: boolean
  yesVotes: number
  noVotes: number
  totalVoters: number
  totalEligible: number
}> {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      votes: true,
      band: {
        include: {
          members: {
            where: {
              status: 'ACTIVE',
              role: { in: VOTING_ROLES },
            },
          },
        },
      },
    },
  })

  if (!proposal) {
    throw new Error('Proposal not found')
  }

  const yesVotes = proposal.votes.filter(v => v.vote === 'YES').length
  const noVotes = proposal.votes.filter(v => v.vote === 'NO').length
  const totalVoters = proposal.votes.length
  const totalEligible = proposal.band.members.length

  // Unanimous = all who voted said YES (and at least one person voted)
  // Non-voters are excluded from the count
  const passed = totalVoters > 0 && noVotes === 0 && yesVotes === totalVoters

  return {
    passed,
    yesVotes,
    noVotes,
    totalVoters,
    totalEligible,
  }
}

/**
 * Get voting eligible member count for a band
 */
export async function getVotingEligibleCount(bandId: string): Promise<number> {
  return prisma.member.count({
    where: {
      bandId,
      status: 'ACTIVE',
      role: { in: VOTING_ROLES },
    },
  })
}
