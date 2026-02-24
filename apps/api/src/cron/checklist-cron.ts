import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { notificationService } from '../services/notification.service'
import { withCronRetry } from '../lib/retry'
import { addDays } from 'date-fns'

// Auto-confirm reimbursements after 7 days
const AUTO_CONFIRM_DAYS = 7

/**
 * Initialize all checklist-related cron jobs
 */
export function initChecklistCron() {
  // Auto-confirm reimbursements after 7 days - daily at 7 AM
  cron.schedule('0 7 * * *', async () => {
    console.log('[CRON] Running reimbursement auto-confirm...')
    await withCronRetry('CHECKLIST-AUTO-CONFIRM', processReimbursementAutoConfirms)
  })

  // Send 2-day warning for reimbursements - daily at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running reimbursement auto-confirm warning...')
    await withCronRetry('CHECKLIST-WARNING', sendReimbursementAutoConfirmWarnings)
  })

  console.log('Checklist cron jobs initialized')
}

/**
 * Auto-confirm reimbursements that have been marked as REIMBURSED for 7+ days
 */
async function processReimbursementAutoConfirms() {
  try {
    const now = new Date()
    const cutoffDate = addDays(now, -AUTO_CONFIRM_DAYS)

    // Find items with REIMBURSED status where reimbursedAt <= cutoffDate
    const itemsToAutoConfirm = await prisma.checklistItem.findMany({
      where: {
        reimbursementStatus: 'REIMBURSED',
        reimbursedAt: { lte: cutoffDate },
      },
      include: {
        assignee: { select: { id: true, name: true } },
        reimbursedBy: { select: { id: true, name: true } },
        task: {
          include: {
            band: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    })

    console.log(`[CRON] Found ${itemsToAutoConfirm.length} reimbursements to auto-confirm`)

    for (const item of itemsToAutoConfirm) {
      try {
        // Update to CONFIRMED
        await prisma.checklistItem.update({
          where: { id: item.id },
          data: {
            reimbursementStatus: 'CONFIRMED',
            reimbursementConfirmedAt: now,
            reimbursementNote: item.reimbursementNote
              ? `${item.reimbursementNote}\n[Auto-confirmed after ${AUTO_CONFIRM_DAYS} days]`
              : `[Auto-confirmed after ${AUTO_CONFIRM_DAYS} days]`,
          },
        })

        // Format amount for display
        const formattedAmount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: (item.expenseCurrency || 'usd').toUpperCase(),
        }).format((item.expenseAmount || 0) / 100)

        // Notify both parties
        const notifyUserIds = new Set<string>()
        if (item.assigneeId) notifyUserIds.add(item.assigneeId)
        if (item.reimbursedById) notifyUserIds.add(item.reimbursedById)

        for (const userId of notifyUserIds) {
          await notificationService.create({
            userId,
            type: 'REIMBURSEMENT_CONFIRMED',
            title: 'Reimbursement Auto-Confirmed',
            message: `The reimbursement of ${formattedAmount} for "${item.description}" was automatically confirmed after ${AUTO_CONFIRM_DAYS} days.`,
            relatedId: item.id,
            relatedType: 'checklist_item',
            actionUrl: `/bands/${item.task.band.slug}/tasks/${item.taskId}/checklist/${item.id}`,
            priority: 'LOW',
            bandId: item.task.band.id,
          })
        }

        // Log to audit
        await prisma.auditLog.create({
          data: {
            bandId: item.task.band.id,
            actorId: 'SYSTEM',
            action: 'CHECKLIST_REIMBURSEMENT_AUTO_CONFIRMED',
            entityType: 'CHECKLIST_ITEM',
            entityId: item.id,
            entityName: item.description,
            changes: {
              taskId: item.taskId,
              expenseAmount: item.expenseAmount,
              autoConfirmedAfterDays: AUTO_CONFIRM_DAYS,
            },
          },
        })

        console.log(`[CRON] Auto-confirmed reimbursement for item ${item.id}`)
      } catch (error) {
        console.error(`[CRON] Error auto-confirming reimbursement for item ${item.id}:`, error)
      }
    }

    console.log(`[CRON] Processed ${itemsToAutoConfirm.length} reimbursement auto-confirms`)
  } catch (error) {
    console.error('[CRON] Error in processReimbursementAutoConfirms:', error)
  }
}

/**
 * Send warning notifications for reimbursements that will auto-confirm in 2-3 days
 */
async function sendReimbursementAutoConfirmWarnings() {
  try {
    const now = new Date()
    // Items reimbursed 5 days ago will auto-confirm in 2 days
    const fiveDaysAgo = addDays(now, -(AUTO_CONFIRM_DAYS - 2))
    const fourDaysAgo = addDays(now, -(AUTO_CONFIRM_DAYS - 3))

    // Find items where reimbursedAt is between 4-5 days ago (will auto-confirm in 2-3 days)
    const itemsToWarn = await prisma.checklistItem.findMany({
      where: {
        reimbursementStatus: 'REIMBURSED',
        reimbursedAt: {
          gte: fiveDaysAgo,
          lte: fourDaysAgo,
        },
        // Only warn once - check if note already contains warning
        NOT: {
          reimbursementNote: { contains: '[Warning sent]' },
        },
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        reimbursedBy: { select: { id: true, name: true } },
        task: {
          include: {
            band: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    })

    console.log(`[CRON] Found ${itemsToWarn.length} reimbursements to warn about`)

    for (const item of itemsToWarn) {
      try {
        if (!item.assigneeId) continue

        // Format amount for display
        const formattedAmount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: (item.expenseCurrency || 'usd').toUpperCase(),
        }).format((item.expenseAmount || 0) / 100)

        // Warn the assignee (person who should confirm)
        await notificationService.create({
          userId: item.assigneeId,
          type: 'REIMBURSEMENT_AUTO_CONFIRM_WARNING',
          title: 'Reimbursement Auto-Confirm Warning',
          message: `Your reimbursement of ${formattedAmount} for "${item.description}" will auto-confirm in 2 days. Please confirm or dispute if there's an issue.`,
          relatedId: item.id,
          relatedType: 'checklist_item',
          actionUrl: `/bands/${item.task.band.slug}/tasks/${item.taskId}/checklist/${item.id}`,
          priority: 'MEDIUM',
          bandId: item.task.band.id,
        })

        // Mark as warned by updating note
        await prisma.checklistItem.update({
          where: { id: item.id },
          data: {
            reimbursementNote: item.reimbursementNote
              ? `${item.reimbursementNote}\n[Warning sent]`
              : '[Warning sent]',
          },
        })

        console.log(`[CRON] Sent warning for reimbursement ${item.id}`)
      } catch (error) {
        console.error(`[CRON] Error sending warning for reimbursement ${item.id}:`, error)
      }
    }

    console.log(`[CRON] Processed ${itemsToWarn.length} reimbursement warnings`)
  } catch (error) {
    console.error('[CRON] Error in sendReimbursementAutoConfirmWarnings:', error)
  }
}

/**
 * Manually trigger reimbursement auto-confirm processing
 */
export async function runReimbursementAutoConfirms() {
  console.log('[MANUAL] Running reimbursement auto-confirm...')
  await processReimbursementAutoConfirms()
}

/**
 * Manually trigger reimbursement auto-confirm warnings
 */
export async function runReimbursementAutoConfirmWarnings() {
  console.log('[MANUAL] Running reimbursement warning check...')
  await sendReimbursementAutoConfirmWarnings()
}
