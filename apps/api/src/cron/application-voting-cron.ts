import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { notificationService } from '../services/notification.service'
import { webhookService } from '../services/webhook.service'
import { memberBillingTriggers } from '../server/services/member-billing-triggers'
import { checkAndSetBandActivation } from '../server/routers/band/band.dissolve'
import { withCronRetry } from '../lib/retry'

/**
 * Initialize the application voting deadline cron job
 * Runs every hour to check for deadlines
 */
export function initApplicationVotingCron() {
  // Check for voting deadlines every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Running application voting deadline check...')
    await withCronRetry('APPLICATION-VOTING', runApplicationVotingJob)
  })

  console.log('Application voting cron job initialized (every hour)')
}

/**
 * Manual trigger for testing
 */
export async function runApplicationVotingJob() {
  console.log('[APPLICATION-VOTING] Running job...')
  const result = await processApplicationDeadlines()
  console.log(`[APPLICATION-VOTING] Completed: ${result.approved} approved, ${result.rejected} rejected, ${result.adminNotified} admin notified, ${result.errors} errors`)
  return result
}

/**
 * Process all applications with passed deadlines
 */
async function processApplicationDeadlines(): Promise<{
  approved: number
  rejected: number
  adminNotified: number
  errors: number
}> {
  const now = new Date()
  let approved = 0
  let rejected = 0
  let adminNotified = 0
  let errors = 0

  try {
    // Find all pending applications with passed voting deadlines
    const expiredApplications = await prisma.member.findMany({
      where: {
        status: 'PENDING',
        votingDeadline: {
          not: null,
          lte: now,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        band: {
          select: {
            id: true,
            name: true,
            slug: true,
            memberApprovalThreshold: true,
            memberApprovalQuorum: true,
            whoCanApprove: true,
            members: {
              where: { status: 'ACTIVE' },
              select: { userId: true, role: true },
            },
          },
        },
        applicationVotes: true,
      },
    })

    console.log(`[APPLICATION-VOTING] Found ${expiredApplications.length} applications with expired deadlines`)

    for (const application of expiredApplications) {
      try {
        const result = await processExpiredApplication(application)
        if (result === 'approved') approved++
        else if (result === 'rejected') rejected++
        else if (result === 'admin_notified') adminNotified++
      } catch (error) {
        console.error(`[APPLICATION-VOTING] Error processing application ${application.id}:`, error)
        errors++
      }
    }
  } catch (error) {
    console.error('[APPLICATION-VOTING] Fatal error:', error)
    errors++
  }

  return { approved, rejected, adminNotified, errors }
}

/**
 * Process a single expired application
 */
async function processExpiredApplication(application: any): Promise<'approved' | 'rejected' | 'admin_notified'> {
  const { band, applicationVotes, user } = application

  // Count voting members
  const votingRoles = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']
  const votingMemberCount = band.members.filter(
    (m: any) => votingRoles.includes(m.role)
  ).length

  if (votingMemberCount === 0) {
    // No voting members - notify admins
    return await notifyAdminsQuorumNotMet(application, 'No voting members in band')
  }

  const votes = applicationVotes
  const approveVotes = votes.filter((v: any) => v.vote === 'APPROVE').length
  const rejectVotes = votes.filter((v: any) => v.vote === 'REJECT').length
  const totalVotes = votes.length

  const quorumRequired = Math.ceil((band.memberApprovalQuorum / 100) * votingMemberCount)
  const threshold = band.memberApprovalThreshold

  console.log(`[APPLICATION-VOTING] Application ${application.id}: ${totalVotes} votes, quorum ${quorumRequired}, threshold ${threshold}%`)

  // Check if quorum was met
  if (totalVotes < quorumRequired) {
    return await notifyAdminsQuorumNotMet(
      application,
      `Only ${totalVotes} of ${quorumRequired} required votes (${band.memberApprovalQuorum}% of ${votingMemberCount} voting members)`
    )
  }

  // Calculate approval percentage
  const approvalPercentage = totalVotes > 0 ? (approveVotes / totalVotes) * 100 : 0

  if (approvalPercentage >= threshold) {
    // Approve the application
    await approveApplication(application)
    return 'approved'
  } else {
    // Reject the application
    await rejectApplication(application)
    return 'rejected'
  }
}

/**
 * Notify admins that quorum was not met
 */
async function notifyAdminsQuorumNotMet(application: any, reason: string): Promise<'admin_notified'> {
  const { band, user } = application

  console.log(`[APPLICATION-VOTING] Quorum not met for application ${application.id}: ${reason}`)

  // Get admins (those who can approve)
  const admins = band.members.filter(
    (m: any) => band.whoCanApprove.includes(m.role)
  )

  // Send notifications to admins
  for (const admin of admins) {
    await notificationService.create({
      userId: admin.userId,
      type: 'APPLICATION_QUORUM_NOT_MET',
      title: 'Application Voting Ended - Quorum Not Met',
      message: `The voting period for ${user.name}'s application has ended without reaching quorum. ${reason}. Please review and decide manually.`,
      relatedId: application.id,
      relatedType: 'member',
      actionUrl: `/bands/${band.slug}/applications`,
      priority: 'HIGH',
      bandId: band.id,
    })
  }

  // Don't change status - leave it for manual decision
  // But extend the deadline slightly so it doesn't keep triggering
  await prisma.member.update({
    where: { id: application.id },
    data: {
      notes: application.notes
        ? `${application.notes}\n\n[System: Quorum not met on ${new Date().toISOString()}. ${reason}]`
        : `[System: Quorum not met on ${new Date().toISOString()}. ${reason}]`,
      votingDeadline: null, // Remove deadline - requires manual decision now
    },
  })

  // Log to audit
  await prisma.auditLog.create({
    data: {
      bandId: band.id,
      actorId: null,
      actorType: 'system',
      action: 'APPLICATION_QUORUM_NOT_MET',
      entityType: 'MEMBER',
      entityId: application.id,
      changes: {
        applicantName: user.name,
        reason,
      },
    },
  })

  return 'admin_notified'
}

/**
 * Approve an application after successful vote
 */
async function approveApplication(application: any) {
  const { band, user, applicationVotes } = application

  console.log(`[APPLICATION-VOTING] Approving application ${application.id}`)

  const approveVotes = applicationVotes.filter((v: any) => v.vote === 'APPROVE').length
  const totalVotes = applicationVotes.length

  // Update membership to active
  await prisma.member.update({
    where: { id: application.id },
    data: {
      status: 'ACTIVE',
      role: application.requestedRole || 'VOTING_MEMBER',
    },
  })

  // Notify applicant
  await notificationService.create({
    userId: user.id,
    type: 'BAND_APPLICATION_APPROVED',
    actionUrl: `/bands/${band.slug}`,
    priority: 'HIGH',
    metadata: {
      bandName: band.name,
      bandSlug: band.slug,
      approvedByVote: true,
      voteResult: `${approveVotes}/${totalVotes} approved`,
    },
    relatedId: band.id,
    relatedType: 'BAND',
  })

  // Notify all band members
  for (const member of band.members) {
    if (member.userId !== user.id) {
      await notificationService.create({
        userId: member.userId,
        type: 'BAND_MEMBER_JOINED',
        actionUrl: `/bands/${band.slug}/members`,
        priority: 'LOW',
        metadata: {
          userName: user.name,
          bandName: band.name,
          bandSlug: band.slug,
          approvedByVote: true,
        },
        relatedId: band.id,
        relatedType: 'BAND',
      })
    }
  }

  // Check band activation and billing
  await checkAndSetBandActivation(band.id)
  await memberBillingTriggers.onMemberActivated(band.id)

  // Webhooks for external website
  webhookService.memberJoined(band.id, {
    name: user.name,
    role: application.requestedRole || 'VOTING_MEMBER',
    joinedAt: new Date(),
  }).catch(err => console.error('Webhook error:', err))
  webhookService.syncMembersWithParent(band.id)

  // Log to audit
  await prisma.auditLog.create({
    data: {
      bandId: band.id,
      actorId: null,
      actorType: 'system',
      action: 'APPLICATION_APPROVED_BY_VOTE',
      entityType: 'MEMBER',
      entityId: application.id,
      changes: {
        applicantName: user.name,
        voteResult: `${approveVotes}/${totalVotes} approved`,
      },
    },
  })
}

/**
 * Reject an application after vote
 */
async function rejectApplication(application: any) {
  const { band, user, applicationVotes } = application

  console.log(`[APPLICATION-VOTING] Rejecting application ${application.id}`)

  const approveVotes = applicationVotes.filter((v: any) => v.vote === 'APPROVE').length
  const rejectVotes = applicationVotes.filter((v: any) => v.vote === 'REJECT').length
  const totalVotes = applicationVotes.length

  // Update membership to rejected
  await prisma.member.update({
    where: { id: application.id },
    data: { status: 'REJECTED' },
  })

  // Notify applicant
  await notificationService.create({
    userId: user.id,
    type: 'BAND_APPLICATION_REJECTED',
    actionUrl: `/bands`,
    priority: 'LOW',
    metadata: {
      bandName: band.name,
      bandSlug: band.slug,
      rejectedByVote: true,
      voteResult: `${approveVotes} approve, ${rejectVotes} reject`,
    },
    relatedId: band.id,
    relatedType: 'BAND',
  })

  // Log to audit
  await prisma.auditLog.create({
    data: {
      bandId: band.id,
      actorId: null,
      actorType: 'system',
      action: 'APPLICATION_REJECTED_BY_VOTE',
      entityType: 'MEMBER',
      entityId: application.id,
      changes: {
        applicantName: user.name,
        voteResult: `${approveVotes} approve, ${rejectVotes} reject`,
      },
    },
  })
}
