import cron from 'node-cron'
import { bandBillingService } from '../server/services/band-billing.service'
import { notificationService } from '../services/notification.service'
import { prisma } from '../lib/prisma'

/**
 * Initialize all billing-related cron jobs
 */
export function initBillingCron() {
  // Check grace periods daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Running grace period check...')
    await checkGracePeriods()
  })

  // Check for bands needing billing owner (no owner, subscription active) daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[CRON] Running billing owner check...')
    await checkBillingOwnerNeeded()
  })

  // Check for bands with low member count (subscription active but <3 members) daily at 4 AM
  cron.schedule('0 4 * * *', async () => {
    console.log('[CRON] Running low member count check...')
    await checkLowMemberCount()
  })

  console.log('Billing cron jobs initialized')
}

/**
 * Check and deactivate bands past grace period
 */
async function checkGracePeriods() {
  try {
    const deactivatedBandIds = await bandBillingService.checkGracePeriods()

    if (deactivatedBandIds.length > 0) {
      console.log(`[CRON] Deactivated ${deactivatedBandIds.length} bands: ${deactivatedBandIds.join(', ')}`)

      // Notify members of each deactivated band
      for (const bandId of deactivatedBandIds) {
        const band = await prisma.band.findUnique({
          where: { id: bandId },
          include: {
            members: {
              where: { status: 'ACTIVE' },
              select: { userId: true }
            }
          }
        })

        if (band) {
          for (const member of band.members) {
            await notificationService.create({
              userId: member.userId,
              type: 'BILLING_BAND_DEACTIVATED',
              title: 'Band Deactivated',
              message: `${band.name} has been deactivated due to payment failure. Please update payment to reactivate.`,
              actionUrl: `/bands/${band.slug}`,
              priority: 'URGENT',
              metadata: { bandId: band.id, bandName: band.name },
              relatedId: band.id,
              relatedType: 'Band',
            })
          }
        }
      }
    } else {
      console.log('[CRON] No bands past grace period')
    }
  } catch (error) {
    console.error('[CRON] Error checking grace periods:', error)
  }
}

/**
 * Check for bands that need a billing owner assigned
 * (have active subscription but no billing owner)
 */
async function checkBillingOwnerNeeded() {
  try {
    const bandsNeedingOwner = await prisma.band.findMany({
      where: {
        billingOwnerId: null,
        billingStatus: 'ACTIVE',
      },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          select: { userId: true }
        }
      }
    })

    for (const band of bandsNeedingOwner) {
      console.log(`[CRON] Band ${band.name} needs a billing owner`)

      // Notify all members
      for (const member of band.members) {
        await notificationService.create({
          userId: member.userId,
          type: 'BILLING_OWNER_LEFT',
          title: 'Billing Owner Needed',
          message: `${band.name} needs a billing owner. Please claim ownership to manage payments.`,
          actionUrl: `/bands/${band.slug}/settings`,
          priority: 'HIGH',
          metadata: { bandId: band.id, bandName: band.name },
          relatedId: band.id,
          relatedType: 'Band',
        })
      }
    }

    if (bandsNeedingOwner.length > 0) {
      console.log(`[CRON] Notified ${bandsNeedingOwner.length} bands needing billing owner`)
    } else {
      console.log('[CRON] All bands have billing owners')
    }
  } catch (error) {
    console.error('[CRON] Error checking billing owners:', error)
  }
}

/**
 * Check for bands with active subscription but fewer than 3 members
 * These bands will be deactivated at the end of their billing cycle
 */
async function checkLowMemberCount() {
  try {
    const bandsWithSubscription = await prisma.band.findMany({
      where: {
        billingStatus: 'ACTIVE',
        stripeSubscriptionId: { not: null },
      },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          select: { userId: true }
        },
        billingOwner: {
          select: { id: true, name: true }
        }
      }
    })

    const lowMemberBands = bandsWithSubscription.filter(b => b.members.length < 3)

    for (const band of lowMemberBands) {
      console.log(`[CRON] Band ${band.name} has ${band.members.length} members (below minimum)`)

      // Notify billing owner (if exists) about low member count
      if (band.billingOwnerId) {
        await notificationService.create({
          userId: band.billingOwnerId,
          type: 'BAND_STATUS_CHANGED',
          title: 'Low Member Count Warning',
          message: `${band.name} has fewer than 3 members. The band will be deactivated at the end of the billing cycle unless more members join.`,
          actionUrl: `/bands/${band.slug}`,
          priority: 'HIGH',
          metadata: { bandId: band.id, bandName: band.name, memberCount: band.members.length },
          relatedId: band.id,
          relatedType: 'Band',
        })
      }
    }

    if (lowMemberBands.length > 0) {
      console.log(`[CRON] Found ${lowMemberBands.length} bands with low member count`)
    } else {
      console.log('[CRON] All active bands have sufficient members')
    }
  } catch (error) {
    console.error('[CRON] Error checking low member counts:', error)
  }
}

/**
 * Manually trigger grace period check (for testing or manual intervention)
 */
export async function runGracePeriodCheck() {
  console.log('[MANUAL] Running grace period check...')
  await checkGracePeriods()
}

/**
 * Manually trigger billing owner check
 */
export async function runBillingOwnerCheck() {
  console.log('[MANUAL] Running billing owner check...')
  await checkBillingOwnerNeeded()
}

/**
 * Manually trigger low member count check
 */
export async function runLowMemberCountCheck() {
  console.log('[MANUAL] Running low member count check...')
  await checkLowMemberCount()
}
