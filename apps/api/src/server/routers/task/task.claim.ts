import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { requireGoodStanding } from '../../../lib/dues-enforcement'
import { MemberRole } from '@prisma/client'
import { notificationService } from '../../../services/notification.service'

// Role hierarchy for minClaimRole checks
const ROLE_HIERARCHY: Record<MemberRole, number> = {
  FOUNDER: 6,
  GOVERNOR: 5,
  MODERATOR: 4,
  CONDUCTOR: 3,
  VOTING_MEMBER: 2,
  OBSERVER: 1,
}

function canClaimWithRole(userRole: MemberRole, minClaimRole: MemberRole | null): boolean {
  if (!minClaimRole) return true // null means anyone can claim
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minClaimRole]
}

/**
 * Claim an unassigned task
 */
export const claimTask = publicProcedure
  .input(z.object({
    taskId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { taskId, userId } = input

    // Get task with band membership info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: { id: true, name: true, bandId: true }
        },
        band: {
          select: { id: true, name: true, slug: true, dissolvedAt: true }
        },
        assignee: {
          select: { id: true, name: true }
        }
      }
    })

    if (!task) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
    }

    if (task.band.dissolvedAt) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Band has been dissolved' })
    }

    // Check membership
    const membership = await prisma.member.findFirst({
      where: {
        userId,
        bandId: task.bandId,
        status: 'ACTIVE'
      }
    })

    if (!membership) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this band' })
    }

    // Check dues standing
    await requireGoodStanding(task.bandId, userId)

    // Check role requirement
    if (!canClaimWithRole(membership.role, task.minClaimRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This task requires ${task.minClaimRole} role or higher`
      })
    }

    // Check not already claimed by someone else
    if (task.assigneeId && task.assigneeId !== userId) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Task already claimed by ${task.assignee?.name || 'someone else'}`
      })
    }

    // Check task is in a claimable state
    if (task.status === 'COMPLETED' || task.verificationStatus === 'APPROVED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Task is already completed'
      })
    }

    // Claim the task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        assigneeId: userId,
        assigneeType: 'MEMBER',
        assignmentMethod: 'CLAIMED',
        assignedAt: new Date(),
        status: task.status === 'TODO' ? 'IN_PROGRESS' : task.status,
        // Clear any previous rejection state
        verificationStatus: null,
        rejectionReason: null,
        reminderSentAt: null,
        escalatedAt: null,
      },
      include: {
        project: { select: { id: true, name: true } },
        band: { select: { id: true, name: true, slug: true } },
        assignee: { select: { id: true, name: true } }
      }
    })

    // Log to audit
    await prisma.auditLog.create({
      data: {
        bandId: task.bandId,
        actorId: userId,
        action: 'TASK_CLAIMED',
        entityType: 'TASK',
        entityId: taskId,
        changes: {
          taskName: task.name,
          projectName: task.project.name
        }
      }
    })

    // Notify task creator if different from claimer
    if (task.createdById && task.createdById !== userId) {
      await notificationService.create({
        userId: task.createdById,
        type: 'TASK_CLAIMED',
        title: 'Task Claimed',
        message: `${updatedTask.assignee?.name || 'Someone'} claimed "${task.name}" in ${task.project.name}`,
        relatedId: task.id,
        relatedType: 'task',
        actionUrl: `/bands/${updatedTask.band.slug}/projects/${task.projectId}?task=${task.id}`,
        priority: 'LOW',
        bandId: task.bandId,
      })
    }

    return { task: updatedTask }
  })

/**
 * Unclaim a task you've claimed
 */
export const unclaimTask = publicProcedure
  .input(z.object({
    taskId: z.string(),
    userId: z.string(),
    reason: z.string().max(500).optional(),
  }))
  .mutation(async ({ input }) => {
    const { taskId, userId, reason } = input

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, name: true } },
        band: { select: { id: true, name: true, slug: true } }
      }
    })

    if (!task) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
    }

    // Must be the current assignee
    if (task.assigneeId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You have not claimed this task'
      })
    }

    // Reset task to unassigned
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        assigneeId: null,
        assignmentMethod: null,
        assignedAt: null,
        status: 'TODO',
        completedAt: null,
        verificationStatus: null,
        verificationNotes: null,
        rejectionReason: null,
        reminderSentAt: null,
        escalatedAt: null,
      },
      include: {
        project: { select: { id: true, name: true } },
        band: { select: { id: true, name: true, slug: true } }
      }
    })

    // Log to audit
    await prisma.auditLog.create({
      data: {
        bandId: task.bandId,
        actorId: userId,
        action: 'TASK_UNCLAIMED',
        entityType: 'TASK',
        entityId: taskId,
        changes: {
          taskName: task.name,
          projectName: task.project.name,
          reason
        }
      }
    })

    // Get user name for notification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })

    // Notify task creator if different from unclaimer
    if (task.createdById && task.createdById !== userId) {
      await notificationService.create({
        userId: task.createdById,
        type: 'TASK_UNCLAIMED',
        title: 'Task Unclaimed',
        message: `${user?.name || 'Someone'} unclaimed "${task.name}" - it's available again`,
        relatedId: task.id,
        relatedType: 'task',
        actionUrl: `/bands/${updatedTask.band.slug}/projects/${task.projectId}?task=${task.id}`,
        priority: 'LOW',
        bandId: task.bandId,
      })
    }

    return { task: updatedTask }
  })

/**
 * Retry a rejected task (resubmit for verification)
 */
export const retryTask = publicProcedure
  .input(z.object({
    taskId: z.string(),
    userId: z.string(),
    note: z.string().max(1000).optional(),
  }))
  .mutation(async ({ input }) => {
    const { taskId, userId, note } = input

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, name: true } },
        band: { select: { id: true, name: true, slug: true } }
      }
    })

    if (!task) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
    }

    // Must be the assignee
    if (task.assigneeId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not assigned to this task' })
    }

    // Must be rejected
    if (task.verificationStatus !== 'REJECTED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Task was not rejected'
      })
    }

    // Resubmit for verification
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'IN_REVIEW',
        verificationStatus: 'PENDING',
        verificationNotes: note || task.verificationNotes,
        completedAt: new Date(),
        rejectionReason: null,
        reminderSentAt: null,
        escalatedAt: null,
      },
      include: {
        project: { select: { id: true, name: true } },
        band: { select: { id: true, name: true, slug: true } },
        assignee: { select: { id: true, name: true } }
      }
    })

    // Log to audit
    await prisma.auditLog.create({
      data: {
        bandId: task.bandId,
        actorId: userId,
        action: 'TASK_RETRIED',
        entityType: 'TASK',
        entityId: taskId,
        changes: {
          taskName: task.name,
          projectName: task.project.name,
          note
        }
      }
    })

    // Get band members who can verify (Founders, Governors, Moderators)
    const verifiers = await prisma.member.findMany({
      where: {
        bandId: task.bandId,
        status: 'ACTIVE',
        role: { in: ['FOUNDER', 'GOVERNOR', 'MODERATOR'] },
        userId: { not: userId },
      },
      select: { userId: true },
    })

    // Notify verifiers that task was resubmitted
    const notificationPromises = verifiers.map(v =>
      notificationService.create({
        userId: v.userId,
        type: 'TASK_VERIFICATION_NEEDED',
        title: 'Task Resubmitted for Review',
        message: `"${task.name}" has been resubmitted for verification in ${task.project.name}`,
        relatedId: task.id,
        relatedType: 'task',
        actionUrl: `/bands/${updatedTask.band.slug}/projects/${task.projectId}?task=${task.id}`,
        priority: 'MEDIUM',
        bandId: task.bandId,
      })
    )
    await Promise.all(notificationPromises)

    return { task: updatedTask }
  })

/**
 * Update task context (Conductor+)
 */
export const updateTaskContext = publicProcedure
  .input(z.object({
    taskId: z.string(),
    userId: z.string(),
    contextPhone: z.boolean().optional(),
    contextComputer: z.boolean().optional(),
    contextTravel: z.boolean().optional(),
    contextTimeMinutes: z.number().min(1).max(480).optional(),
  }))
  .mutation(async ({ input }) => {
    const { taskId, userId, ...contextUpdates } = input

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        band: {
          include: {
            members: { where: { status: 'ACTIVE' } }
          }
        }
      }
    })

    if (!task) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
    }

    // Check role (Conductor+)
    const membership = task.band.members.find(m => m.userId === userId)
    const canEdit = membership && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(membership.role)

    if (!canEdit) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only Conductor or higher can edit task context'
      })
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: contextUpdates
    })

    return { task: updatedTask }
  })
