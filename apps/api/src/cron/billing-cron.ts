import cron from 'node-cron'
import { bandBillingService } from '../server/services/band-billing.service'
import { notificationService } from '../services/notification.service'
import { prisma } from '../lib/prisma'
import { emailService } from '../server/services/email.service'

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

  // Auto-confirm manual payments after 7 days - daily at 5 AM
  cron.schedule('0 5 * * *', async () => {
    console.log('[CRON] Running manual payment auto-confirm...')
    await processAutoConfirms()
  })

  // Send 2-day warning for manual payments - daily at 6 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('[CRON] Running manual payment warning check...')
    await sendAutoConfirmWarnings()
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

/**
 * Auto-confirm manual payments that have passed their autoConfirmAt date
 */
async function processAutoConfirms() {
  try {
    const now = new Date()

    // Find PENDING payments where autoConfirmAt <= now
    const paymentsToAutoConfirm = await prisma.manualPayment.findMany({
      where: {
        status: 'PENDING',
        autoConfirmAt: { lte: now },
      },
      include: {
        band: { select: { id: true, name: true, slug: true } },
        member: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        initiatedBy: { select: { id: true, name: true, email: true } },
      },
    })

    console.log(`[CRON] Found ${paymentsToAutoConfirm.length} payments to auto-confirm`)

    for (const payment of paymentsToAutoConfirm) {
      try {
        // Update payment status to AUTO_CONFIRMED
        await prisma.manualPayment.update({
          where: { id: payment.id },
          data: {
            status: 'AUTO_CONFIRMED',
            confirmedAt: now,
          },
        })

        // Update BandMemberBilling
        await prisma.bandMemberBilling.upsert({
          where: {
            bandId_memberUserId: {
              bandId: payment.bandId,
              memberUserId: payment.memberUserId,
            },
          },
          create: {
            bandId: payment.bandId,
            memberUserId: payment.memberUserId,
            status: 'ACTIVE',
            lastPaymentAt: payment.paymentDate,
          },
          update: {
            status: 'ACTIVE',
            lastPaymentAt: payment.paymentDate,
          },
        })

        // Notify both parties
        const notifyUserIds = new Set([payment.initiatedById, payment.memberUserId])
        for (const userId of notifyUserIds) {
          await notificationService.create({
            userId,
            type: 'MANUAL_PAYMENT_CONFIRMED',
            title: 'Payment Auto-Confirmed',
            message: `The payment of $${(payment.amount / 100).toFixed(2)} was automatically confirmed after 7 days.`,
            actionUrl: `/bands/${payment.band.slug}/billing?tab=manual`,
            priority: 'LOW',
            metadata: {
              bandId: payment.bandId,
              bandName: payment.band.name,
              paymentId: payment.id,
              amount: payment.amount,
              autoConfirmed: true,
            },
            relatedId: payment.id,
            relatedType: 'ManualPayment',
          })
        }

        console.log(`[CRON] Auto-confirmed payment ${payment.id}`)
      } catch (error) {
        console.error(`[CRON] Error auto-confirming payment ${payment.id}:`, error)
      }
    }

    console.log(`[CRON] Processed ${paymentsToAutoConfirm.length} auto-confirms`)
  } catch (error) {
    console.error('[CRON] Error in processAutoConfirms:', error)
  }
}

/**
 * Send warning notifications for payments that will auto-confirm in 2-3 days
 */
async function sendAutoConfirmWarnings() {
  try {
    const now = new Date()
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Find PENDING payments where autoConfirmAt is 2-3 days away AND not yet warned
    const paymentsToWarn = await prisma.manualPayment.findMany({
      where: {
        status: 'PENDING',
        autoConfirmWarned: false,
        autoConfirmAt: {
          gte: twoDaysFromNow,
          lte: threeDaysFromNow,
        },
      },
      include: {
        band: { select: { id: true, name: true, slug: true } },
        member: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        initiatedBy: { select: { id: true, name: true, email: true } },
      },
    })

    console.log(`[CRON] Found ${paymentsToWarn.length} payments to warn about`)

    for (const payment of paymentsToWarn) {
      try {
        // Determine who to warn (the counterparty)
        let counterpartyUserId: string
        let counterpartyEmail: string
        let counterpartyName: string

        if (payment.initiatedByRole === 'MEMBER') {
          // Member initiated, warn the treasurers
          // For simplicity, we'll warn the founder (or first treasurer) via notification
          // In the email service, we'd send to all treasurers
          const treasurers = await prisma.member.findMany({
            where: {
              bandId: payment.bandId,
              status: 'ACTIVE',
              OR: [{ isTreasurer: true }, { role: 'FOUNDER' }],
            },
            include: { user: { select: { id: true, name: true, email: true } } },
            take: 5,
          })

          for (const treasurer of treasurers) {
            await notificationService.create({
              userId: treasurer.userId,
              type: 'MANUAL_PAYMENT_AUTO_CONFIRM_WARNING',
              title: 'Payment Auto-Confirm Warning',
              message: `A payment of $${(payment.amount / 100).toFixed(2)} from ${payment.member.user.name} will auto-confirm in 2 days if not reviewed.`,
              actionUrl: `/bands/${payment.band.slug}/billing?tab=manual`,
              priority: 'HIGH',
              metadata: {
                bandId: payment.bandId,
                bandName: payment.band.name,
                paymentId: payment.id,
                amount: payment.amount,
                autoConfirmAt: payment.autoConfirmAt,
              },
              relatedId: payment.id,
              relatedType: 'ManualPayment',
            })

            // Send email
            await emailService.sendManualPaymentAutoConfirmWarningEmail({
              email: treasurer.user.email,
              userName: treasurer.user.name,
              bandName: payment.band.name,
              bandSlug: payment.band.slug,
              payerName: payment.member.user.name,
              amount: payment.amount,
              paymentMethod: payment.paymentMethod,
              autoConfirmAt: payment.autoConfirmAt!,
            })
          }
        } else {
          // Treasurer initiated, warn the member
          counterpartyUserId = payment.memberUserId
          counterpartyEmail = payment.member.user.email
          counterpartyName = payment.member.user.name

          await notificationService.create({
            userId: counterpartyUserId,
            type: 'MANUAL_PAYMENT_AUTO_CONFIRM_WARNING',
            title: 'Payment Auto-Confirm Warning',
            message: `A payment of $${(payment.amount / 100).toFixed(2)} recorded on your behalf will auto-confirm in 2 days if not reviewed.`,
            actionUrl: `/bands/${payment.band.slug}/billing?tab=manual`,
            priority: 'HIGH',
            metadata: {
              bandId: payment.bandId,
              bandName: payment.band.name,
              paymentId: payment.id,
              amount: payment.amount,
              autoConfirmAt: payment.autoConfirmAt,
            },
            relatedId: payment.id,
            relatedType: 'ManualPayment',
          })

          // Send email
          await emailService.sendManualPaymentAutoConfirmWarningEmail({
            email: counterpartyEmail,
            userName: counterpartyName,
            bandName: payment.band.name,
            bandSlug: payment.band.slug,
            payerName: payment.member.user.name,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            autoConfirmAt: payment.autoConfirmAt!,
          })
        }

        // Mark as warned
        await prisma.manualPayment.update({
          where: { id: payment.id },
          data: { autoConfirmWarned: true },
        })

        console.log(`[CRON] Sent warning for payment ${payment.id}`)
      } catch (error) {
        console.error(`[CRON] Error sending warning for payment ${payment.id}:`, error)
      }
    }

    console.log(`[CRON] Processed ${paymentsToWarn.length} auto-confirm warnings`)
  } catch (error) {
    console.error('[CRON] Error in sendAutoConfirmWarnings:', error)
  }
}

/**
 * Manually trigger auto-confirm processing
 */
export async function runAutoConfirms() {
  console.log('[MANUAL] Running manual payment auto-confirm...')
  await processAutoConfirms()
}

/**
 * Manually trigger auto-confirm warnings
 */
export async function runAutoConfirmWarnings() {
  console.log('[MANUAL] Running manual payment warning check...')
  await sendAutoConfirmWarnings()
}
