import cron from 'node-cron'
import { subDays } from 'date-fns'
import { prisma } from '../lib/prisma'
import { notificationService } from '../services/notification.service'
import { withCronRetry } from '../lib/retry'

// Escalation thresholds (in days)
const REMINDER_THRESHOLD_DAYS = 3
const ESCALATION_THRESHOLD_DAYS = 5
const AUTO_CONFIRM_THRESHOLD_DAYS = 7

/**
 * Initialize the task escalation cron job
 * Runs daily at 9 AM UTC (after digest emails)
 */
export function initTaskEscalationCron() {
  // Check for tasks and checklist items needing escalation daily at 9 AM UTC
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running task and checklist escalation job...')
    await withCronRetry('TASK-ESCALATION', runTaskEscalationJob)
    await withCronRetry('CHECKLIST-ESCALATION', runChecklistEscalationJob)
  })

  console.log('Task escalation cron job initialized (9 AM UTC)')
}

/**
 * Manual trigger for testing tasks
 */
export async function runTaskEscalationJob() {
  console.log('[TASK-ESCALATION] Running job...')
  const result = await processTaskEscalations()
  console.log(`[TASK-ESCALATION] Completed: ${result.reminders} reminders, ${result.escalations} escalations, ${result.autoConfirmed} auto-confirmed`)
  return result
}

/**
 * Manual trigger for testing checklist items
 */
export async function runChecklistEscalationJob() {
  console.log('[CHECKLIST-ESCALATION] Running job...')
  const result = await processChecklistEscalations()
  console.log(`[CHECKLIST-ESCALATION] Completed: ${result.reminders} reminders, ${result.escalations} escalations, ${result.autoConfirmed} auto-confirmed`)
  return result
}

/**
 * Process all tasks needing escalation
 */
async function processTaskEscalations(): Promise<{
  reminders: number
  escalations: number
  autoConfirmed: number
  errors: number
}> {
  const now = new Date()
  const reminderThreshold = subDays(now, REMINDER_THRESHOLD_DAYS)
  const escalationThreshold = subDays(now, ESCALATION_THRESHOLD_DAYS)
  const autoConfirmThreshold = subDays(now, AUTO_CONFIRM_THRESHOLD_DAYS)

  let reminders = 0
  let escalations = 0
  let autoConfirmed = 0
  let errors = 0

  try {
    // Find all tasks in IN_REVIEW status
    const tasksInReview = await prisma.task.findMany({
      where: {
        status: 'IN_REVIEW',
        verificationStatus: 'PENDING',
        completedAt: { not: null },
        band: { dissolvedAt: null },
      },
      include: {
        project: { select: { id: true, name: true } },
        band: {
          select: {
            id: true,
            name: true,
            slug: true,
            members: {
              where: { status: 'ACTIVE' },
              select: { userId: true, role: true },
            },
          },
        },
        assignee: { select: { id: true, name: true } },
      },
    })

    console.log(`[TASK-ESCALATION] Found ${tasksInReview.length} tasks in review`)

    for (const task of tasksInReview) {
      try {
        const submittedAt = task.completedAt!
        const daysSinceSubmission = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24)

        // 1. Auto-confirm after 7 days
        if (submittedAt <= autoConfirmThreshold) {
          await autoConfirmTask(task)
          autoConfirmed++
          continue
        }

        // 2. Escalate after 5 days (if not already escalated)
        if (submittedAt <= escalationThreshold && !task.escalatedAt) {
          await escalateTask(task)
          escalations++
          continue
        }

        // 3. Send reminder after 3 days (if not already sent)
        if (submittedAt <= reminderThreshold && !task.reminderSentAt) {
          await sendReminderForTask(task)
          reminders++
        }
      } catch (error) {
        console.error(`[TASK-ESCALATION] Error processing task ${task.id}:`, error)
        errors++
      }
    }
  } catch (error) {
    console.error('[TASK-ESCALATION] Fatal error:', error)
    errors++
  }

  return { reminders, escalations, autoConfirmed, errors }
}

/**
 * Send reminder notification to verifiers for a task
 */
async function sendReminderForTask(task: any) {
  console.log(`[TASK-ESCALATION] Sending reminder for task ${task.id}`)

  // Get Moderators and above who can verify
  const verifiers = task.band.members.filter(
    (m: any) => ['FOUNDER', 'GOVERNOR', 'MODERATOR'].includes(m.role)
  )

  // Update task to mark reminder sent
  await prisma.task.update({
    where: { id: task.id },
    data: { reminderSentAt: new Date() },
  })

  // Send notifications
  const notificationPromises = verifiers.map((v: any) =>
    notificationService.create({
      userId: v.userId,
      type: 'TASK_REMINDER',
      title: 'Task Awaiting Verification',
      message: `"${task.name}" has been waiting for verification for 3 days`,
      relatedId: task.id,
      relatedType: 'task',
      actionUrl: `/bands/${task.band.slug}/projects/${task.projectId}?task=${task.id}`,
      priority: 'HIGH',
      bandId: task.bandId,
    })
  )

  await Promise.all(notificationPromises)
}

/**
 * Escalate task to Governors
 */
async function escalateTask(task: any) {
  console.log(`[TASK-ESCALATION] Escalating task ${task.id}`)

  // Get Governors and Founders
  const leadership = task.band.members.filter(
    (m: any) => ['FOUNDER', 'GOVERNOR'].includes(m.role)
  )

  // Update task to mark escalated
  await prisma.task.update({
    where: { id: task.id },
    data: { escalatedAt: new Date() },
  })

  // Send escalation notifications
  const notificationPromises = leadership.map((v: any) =>
    notificationService.create({
      userId: v.userId,
      type: 'TASK_ESCALATED',
      title: 'Task Escalated',
      message: `"${task.name}" has been awaiting verification for 5 days and needs attention`,
      relatedId: task.id,
      relatedType: 'task',
      actionUrl: `/bands/${task.band.slug}/projects/${task.projectId}?task=${task.id}`,
      priority: 'HIGH',
      bandId: task.bandId,
    })
  )

  await Promise.all(notificationPromises)

  // Log to audit
  await prisma.auditLog.create({
    data: {
      bandId: task.bandId,
      actorId: null,
      actorType: 'system',
      action: 'TASK_ESCALATED',
      entityType: 'TASK',
      entityId: task.id,
      changes: {
        taskName: task.name,
        projectName: task.project.name,
        reason: 'Task awaiting verification for 5+ days',
      },
    },
  })
}

/**
 * Auto-confirm a task after 7 days without action
 */
async function autoConfirmTask(task: any) {
  console.log(`[TASK-ESCALATION] Auto-confirming task ${task.id}`)

  // Update task to confirmed/completed
  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: 'COMPLETED',
      verificationStatus: 'APPROVED',
      verifiedAt: new Date(),
      verificationNotes: 'Auto-confirmed after 7 days without review',
    },
  })

  // Update project completed count
  await prisma.project.update({
    where: { id: task.projectId },
    data: { completedTasks: { increment: 1 } },
  })

  // Notify assignee that task was auto-confirmed
  if (task.assigneeId) {
    await notificationService.create({
      userId: task.assigneeId,
      type: 'TASK_VERIFIED',
      title: 'Task Auto-Approved',
      message: `Your task "${task.name}" was automatically approved after 7 days`,
      relatedId: task.id,
      relatedType: 'task',
      actionUrl: `/bands/${task.band.slug}/projects/${task.projectId}?task=${task.id}`,
      priority: 'MEDIUM',
      bandId: task.bandId,
    })
  }

  // Log to audit
  await prisma.auditLog.create({
    data: {
      bandId: task.bandId,
      actorId: null,
      actorType: 'system',
      action: 'TASK_AUTO_CONFIRMED',
      entityType: 'TASK',
      entityId: task.id,
      changes: {
        taskName: task.name,
        projectName: task.project.name,
        reason: 'Auto-confirmed after 7 days without review',
      },
    },
  })
}

// ============================================================
// CHECKLIST ITEM ESCALATION
// ============================================================

/**
 * Process all checklist items needing escalation
 */
async function processChecklistEscalations(): Promise<{
  reminders: number
  escalations: number
  autoConfirmed: number
  errors: number
}> {
  const now = new Date()
  const reminderThreshold = subDays(now, REMINDER_THRESHOLD_DAYS)
  const escalationThreshold = subDays(now, ESCALATION_THRESHOLD_DAYS)
  const autoConfirmThreshold = subDays(now, AUTO_CONFIRM_THRESHOLD_DAYS)

  let reminders = 0
  let escalations = 0
  let autoConfirmed = 0
  let errors = 0

  try {
    // Find all checklist items pending verification
    const itemsInReview = await prisma.checklistItem.findMany({
      where: {
        isCompleted: true,
        verificationStatus: 'PENDING',
        requiresVerification: true,
        completedAt: { not: null },
        task: {
          band: { dissolvedAt: null },
        },
      },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            projectId: true,
            project: { select: { id: true, name: true } },
            band: {
              select: {
                id: true,
                name: true,
                slug: true,
                members: {
                  where: { status: 'ACTIVE' },
                  select: { userId: true, role: true },
                },
              },
            },
          },
        },
        assignee: { select: { id: true, name: true } },
      },
    })

    console.log(`[CHECKLIST-ESCALATION] Found ${itemsInReview.length} items in review`)

    for (const item of itemsInReview) {
      try {
        const submittedAt = item.completedAt!
        const daysSinceSubmission = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24)

        // 1. Auto-confirm after 7 days
        if (submittedAt <= autoConfirmThreshold) {
          await autoConfirmChecklistItem(item)
          autoConfirmed++
          continue
        }

        // 2. Escalate after 5 days (if not already escalated)
        if (submittedAt <= escalationThreshold && !item.escalatedAt) {
          await escalateChecklistItem(item)
          escalations++
          continue
        }

        // 3. Send reminder after 3 days (if not already sent)
        if (submittedAt <= reminderThreshold && !item.reminderSentAt) {
          await sendReminderForChecklistItem(item)
          reminders++
        }
      } catch (error) {
        console.error(`[CHECKLIST-ESCALATION] Error processing item ${item.id}:`, error)
        errors++
      }
    }
  } catch (error) {
    console.error('[CHECKLIST-ESCALATION] Fatal error:', error)
    errors++
  }

  return { reminders, escalations, autoConfirmed, errors }
}

/**
 * Send reminder notification to verifiers for a checklist item
 */
async function sendReminderForChecklistItem(item: any) {
  console.log(`[CHECKLIST-ESCALATION] Sending reminder for item ${item.id}`)

  // Get Moderators and above who can verify
  const verifiers = item.task.band.members.filter(
    (m: any) => ['FOUNDER', 'GOVERNOR', 'MODERATOR'].includes(m.role)
  )

  // Update item to mark reminder sent
  await prisma.checklistItem.update({
    where: { id: item.id },
    data: { reminderSentAt: new Date() },
  })

  // Send notifications
  const notificationPromises = verifiers.map((v: any) =>
    notificationService.create({
      userId: v.userId,
      type: 'CHECKLIST_REMINDER',
      title: 'Checklist Item Awaiting Verification',
      message: `"${item.description.substring(0, 50)}..." has been waiting for verification for 3 days`,
      relatedId: item.id,
      relatedType: 'checklist_item',
      actionUrl: `/bands/${item.task.band.slug}/tasks/${item.taskId}?checklist=${item.id}`,
      priority: 'HIGH',
      bandId: item.task.band.id,
    })
  )

  await Promise.all(notificationPromises)
}

/**
 * Escalate checklist item to Governors
 */
async function escalateChecklistItem(item: any) {
  console.log(`[CHECKLIST-ESCALATION] Escalating item ${item.id}`)

  // Get Governors and Founders
  const leadership = item.task.band.members.filter(
    (m: any) => ['FOUNDER', 'GOVERNOR'].includes(m.role)
  )

  // Update item to mark escalated
  await prisma.checklistItem.update({
    where: { id: item.id },
    data: { escalatedAt: new Date() },
  })

  // Send escalation notifications
  const notificationPromises = leadership.map((v: any) =>
    notificationService.create({
      userId: v.userId,
      type: 'CHECKLIST_ESCALATED',
      title: 'Checklist Item Escalated',
      message: `"${item.description.substring(0, 50)}..." has been awaiting verification for 5 days`,
      relatedId: item.id,
      relatedType: 'checklist_item',
      actionUrl: `/bands/${item.task.band.slug}/tasks/${item.taskId}?checklist=${item.id}`,
      priority: 'HIGH',
      bandId: item.task.band.id,
    })
  )

  await Promise.all(notificationPromises)

  // Log to audit
  await prisma.auditLog.create({
    data: {
      bandId: item.task.band.id,
      actorId: null,
      actorType: 'system',
      action: 'CHECKLIST_ITEM_ESCALATED',
      entityType: 'CHECKLIST_ITEM',
      entityId: item.id,
      changes: {
        itemDescription: item.description,
        taskName: item.task.name,
        reason: 'Item awaiting verification for 5+ days',
      },
    },
  })
}

/**
 * Auto-confirm a checklist item after 7 days without action
 */
async function autoConfirmChecklistItem(item: any) {
  console.log(`[CHECKLIST-ESCALATION] Auto-confirming item ${item.id}`)

  // Update item to confirmed/completed
  await prisma.checklistItem.update({
    where: { id: item.id },
    data: {
      verificationStatus: 'APPROVED',
      verifiedAt: new Date(),
      verificationNotes: 'Auto-confirmed after 7 days without review',
    },
  })

  // Notify assignee that item was auto-confirmed
  if (item.assigneeId) {
    await notificationService.create({
      userId: item.assigneeId,
      type: 'CHECKLIST_VERIFIED',
      title: 'Item Auto-Approved',
      message: `Your checklist item "${item.description.substring(0, 50)}..." was automatically approved after 7 days`,
      relatedId: item.id,
      relatedType: 'checklist_item',
      actionUrl: `/bands/${item.task.band.slug}/tasks/${item.taskId}?checklist=${item.id}`,
      priority: 'MEDIUM',
      bandId: item.task.band.id,
    })
  }

  // Log to audit
  await prisma.auditLog.create({
    data: {
      bandId: item.task.band.id,
      actorId: null,
      actorType: 'system',
      action: 'CHECKLIST_ITEM_AUTO_CONFIRMED',
      entityType: 'CHECKLIST_ITEM',
      entityId: item.id,
      changes: {
        itemDescription: item.description,
        taskName: item.task.name,
        reason: 'Auto-confirmed after 7 days without review',
      },
    },
  })
}
