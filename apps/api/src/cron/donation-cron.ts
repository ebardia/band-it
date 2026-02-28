import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { notificationService } from '../services/notification.service'
import { withCronRetry } from '../lib/retry'

/**
 * Calculate the next due date based on frequency
 */
function calculateNextDueDate(
  currentDate: Date,
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): Date {
  const nextDate = new Date(currentDate)

  switch (frequency) {
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1)
      if (dayOfMonth) {
        nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()))
      }
      break
    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + 3)
      if (dayOfMonth) {
        nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()))
      }
      break
    case 'YEARLY':
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
  }

  return nextDate
}

/**
 * Initialize donation-related cron jobs
 */
export function initDonationCron() {
  // Send donation due reminders - daily at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running donation due reminders...')
    await withCronRetry('DONATION-DUE-REMINDER', sendDueReminders)
  })

  // Send overdue reminders - daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running donation overdue reminders...')
    await withCronRetry('DONATION-OVERDUE-REMINDER', sendOverdueReminders)
  })

  // Mark missed donations and handle auto-cancel - daily at 10 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('[CRON] Running donation missed check...')
    await withCronRetry('DONATION-MISSED-CHECK', processMissedDonations)
  })

  console.log('Donation cron jobs initialized')
}

/**
 * Send reminders for donations coming due in the next 3 days
 */
async function sendDueReminders() {
  try {
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Find EXPECTED donations with expectedDate in the next 3 days
    // that haven't received a reminder yet
    const donationsDue = await prisma.donation.findMany({
      where: {
        status: 'EXPECTED',
        expectedDate: {
          gte: now,
          lte: threeDaysFromNow,
        },
        reminderSentAt: null,
      },
      include: {
        band: { select: { id: true, name: true, slug: true } },
        recurringDonation: true,
      },
    })

    console.log(`[CRON] Found ${donationsDue.length} donations coming due`)

    for (const donation of donationsDue) {
      try {
        // Get donor info
        const donor = await prisma.user.findUnique({
          where: { id: donation.donorId },
          select: { id: true, name: true },
        })

        await notificationService.create({
          userId: donation.donorId,
          type: 'DONATION_DUE',
          title: 'Donation Due Soon',
          message: `Your ${donation.recurringDonation?.frequency?.toLowerCase() || ''} donation of $${(donation.amount / 100).toFixed(2)} to ${donation.band.name} is due${donation.expectedDate ? ` on ${donation.expectedDate.toLocaleDateString()}` : ' soon'}.`,
          actionUrl: `/bands/${donation.band.slug}/billing?tab=my-donations`,
          priority: 'MEDIUM',
          metadata: {
            bandId: donation.bandId,
            bandName: donation.band.name,
            donationId: donation.id,
            amount: donation.amount,
            expectedDate: donation.expectedDate,
          },
          relatedId: donation.id,
          relatedType: 'Donation',
        })

        // Mark as reminded
        await prisma.donation.update({
          where: { id: donation.id },
          data: { reminderSentAt: now },
        })

        console.log(`[CRON] Sent due reminder for donation ${donation.id}`)
      } catch (error) {
        console.error(`[CRON] Error sending due reminder for donation ${donation.id}:`, error)
      }
    }

    console.log(`[CRON] Processed ${donationsDue.length} due reminders`)
  } catch (error) {
    console.error('[CRON] Error in sendDueReminders:', error)
  }
}

/**
 * Send reminders for donations that are overdue but not yet missed
 */
async function sendOverdueReminders() {
  try {
    const now = new Date()

    // Find EXPECTED donations where expectedDate has passed
    // but they're still within the due window
    const overdueeDonations = await prisma.donation.findMany({
      where: {
        status: 'EXPECTED',
        expectedDate: { lt: now },
        overdueReminderSentAt: null,
      },
      include: {
        band: { select: { id: true, name: true, slug: true } },
        recurringDonation: true,
      },
    })

    console.log(`[CRON] Found ${overdueeDonations.length} overdue donations`)

    for (const donation of overdueeDonations) {
      try {
        // Check if still within due window
        const dueWindowEnd = new Date(donation.expectedDate!.getTime() + donation.dueWindowDays * 24 * 60 * 60 * 1000)
        if (now >= dueWindowEnd) {
          // Will be handled by processMissedDonations
          continue
        }

        await notificationService.create({
          userId: donation.donorId,
          type: 'DONATION_OVERDUE',
          title: 'Donation Overdue',
          message: `Your donation of $${(donation.amount / 100).toFixed(2)} to ${donation.band.name} is overdue. Please submit payment soon.`,
          actionUrl: `/bands/${donation.band.slug}/billing?tab=my-donations`,
          priority: 'HIGH',
          metadata: {
            bandId: donation.bandId,
            bandName: donation.band.name,
            donationId: donation.id,
            amount: donation.amount,
            expectedDate: donation.expectedDate,
          },
          relatedId: donation.id,
          relatedType: 'Donation',
        })

        // Mark as overdue reminded
        await prisma.donation.update({
          where: { id: donation.id },
          data: { overdueReminderSentAt: now },
        })

        console.log(`[CRON] Sent overdue reminder for donation ${donation.id}`)
      } catch (error) {
        console.error(`[CRON] Error sending overdue reminder for donation ${donation.id}:`, error)
      }
    }

    console.log(`[CRON] Processed ${overdueeDonations.length} overdue reminders`)
  } catch (error) {
    console.error('[CRON] Error in sendOverdueReminders:', error)
  }
}

/**
 * Mark donations as missed after due window expires
 * Auto-cancel recurring donations after 3 consecutive misses
 */
async function processMissedDonations() {
  try {
    const now = new Date()

    // Find EXPECTED donations where the due window has passed
    const expectedDonations = await prisma.donation.findMany({
      where: {
        status: 'EXPECTED',
        expectedDate: { not: null },
      },
      include: {
        band: { select: { id: true, name: true, slug: true } },
        recurringDonation: true,
      },
    })

    let missedCount = 0
    let autoCancelledCount = 0

    for (const donation of expectedDonations) {
      try {
        // Calculate due window end
        const dueWindowEnd = new Date(donation.expectedDate!.getTime() + donation.dueWindowDays * 24 * 60 * 60 * 1000)

        if (now < dueWindowEnd) {
          // Still within window
          continue
        }

        // Mark donation as MISSED
        await prisma.donation.update({
          where: { id: donation.id },
          data: {
            status: 'MISSED',
            missedAt: now,
          },
        })
        missedCount++

        // Notify donor
        await notificationService.create({
          userId: donation.donorId,
          type: 'DONATION_MISSED',
          title: 'Donation Marked as Missed',
          message: `Your donation of $${(donation.amount / 100).toFixed(2)} to ${donation.band.name} was not received and has been marked as missed.`,
          actionUrl: `/bands/${donation.band.slug}/billing?tab=my-donations`,
          priority: 'HIGH',
          metadata: {
            bandId: donation.bandId,
            bandName: donation.band.name,
            donationId: donation.id,
            amount: donation.amount,
          },
          relatedId: donation.id,
          relatedType: 'Donation',
        })

        // Handle recurring donation
        if (donation.recurringDonation && donation.recurringDonation.status === 'ACTIVE') {
          const newMissedCount = donation.recurringDonation.missedCount + 1

          if (newMissedCount >= 3) {
            // Auto-cancel after 3 missed
            await prisma.recurringDonation.update({
              where: { id: donation.recurringDonation.id },
              data: {
                status: 'AUTO_CANCELLED',
                autoCancelledAt: now,
                missedCount: newMissedCount,
              },
            })
            autoCancelledCount++

            // Get donor info
            const donor = await prisma.user.findUnique({
              where: { id: donation.donorId },
              select: { name: true },
            })

            // Notify donor about auto-cancel
            await notificationService.create({
              userId: donation.donorId,
              type: 'RECURRING_DONATION_AUTO_CANCELLED',
              title: 'Recurring Donation Auto-Cancelled',
              message: `Your recurring donation to ${donation.band.name} has been automatically cancelled after 3 consecutive missed payments.`,
              actionUrl: `/bands/${donation.band.slug}/billing?tab=my-donations`,
              priority: 'HIGH',
              metadata: {
                bandId: donation.bandId,
                bandName: donation.band.name,
                recurringDonationId: donation.recurringDonation.id,
                amount: donation.recurringDonation.amount,
              },
              relatedId: donation.recurringDonation.id,
              relatedType: 'RecurringDonation',
            })

            // Notify treasurers
            const treasurers = await prisma.member.findMany({
              where: {
                bandId: donation.bandId,
                status: 'ACTIVE',
                OR: [{ isTreasurer: true }, { role: 'FOUNDER' }],
              },
              select: { userId: true },
              take: 5,
            })

            for (const treasurer of treasurers) {
              await notificationService.create({
                userId: treasurer.userId,
                type: 'RECURRING_DONATION_AUTO_CANCELLED',
                title: 'Recurring Donation Auto-Cancelled',
                message: `${donor?.name || 'A member'}'s recurring donation of $${(donation.recurringDonation.amount / 100).toFixed(2)} has been auto-cancelled after 3 missed payments.`,
                actionUrl: `/bands/${donation.band.slug}/billing?tab=donations`,
                priority: 'MEDIUM',
                metadata: {
                  bandId: donation.bandId,
                  bandName: donation.band.name,
                  recurringDonationId: donation.recurringDonation.id,
                  amount: donation.recurringDonation.amount,
                  donorName: donor?.name,
                },
                relatedId: donation.recurringDonation.id,
                relatedType: 'RecurringDonation',
              })
            }

            console.log(`[CRON] Auto-cancelled recurring donation ${donation.recurringDonation.id}`)
          } else {
            // Increment missed count and create next EXPECTED donation
            const nextDueDate = calculateNextDueDate(
              donation.recurringDonation.nextDueDate,
              donation.recurringDonation.frequency,
              donation.recurringDonation.dayOfWeek,
              donation.recurringDonation.dayOfMonth
            )

            await prisma.recurringDonation.update({
              where: { id: donation.recurringDonation.id },
              data: {
                missedCount: newMissedCount,
                nextDueDate,
              },
            })

            // Get settings for due window
            const settings = await prisma.bandFinanceSettings.findUnique({
              where: { bandId: donation.bandId },
            })
            const dueWindowDays = settings?.donationDueWindowDays ?? 7

            // Create next EXPECTED donation
            await prisma.donation.create({
              data: {
                bandId: donation.bandId,
                donorId: donation.donorId,
                amount: donation.recurringDonation.amount,
                paymentMethod: donation.recurringDonation.paymentMethod,
                paymentMethodOther: donation.recurringDonation.paymentMethodOther,
                recurringDonationId: donation.recurringDonation.id,
                status: 'EXPECTED',
                expectedDate: nextDueDate,
                dueWindowDays,
              },
            })

            console.log(`[CRON] Created next expected donation for recurring ${donation.recurringDonation.id}`)
          }
        }

        console.log(`[CRON] Marked donation ${donation.id} as missed`)
      } catch (error) {
        console.error(`[CRON] Error processing missed donation ${donation.id}:`, error)
      }
    }

    console.log(`[CRON] Processed ${missedCount} missed donations, ${autoCancelledCount} auto-cancelled`)
  } catch (error) {
    console.error('[CRON] Error in processMissedDonations:', error)
  }
}

/**
 * Manually trigger due reminders
 */
export async function runDueReminders() {
  console.log('[MANUAL] Running donation due reminders...')
  await sendDueReminders()
}

/**
 * Manually trigger overdue reminders
 */
export async function runOverdueReminders() {
  console.log('[MANUAL] Running donation overdue reminders...')
  await sendOverdueReminders()
}

/**
 * Manually trigger missed donation processing
 */
export async function runMissedDonations() {
  console.log('[MANUAL] Running donation missed check...')
  await processMissedDonations()
}
