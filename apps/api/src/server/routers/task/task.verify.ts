import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../../services/notification.service'
import { requireGoodStanding, getBandIdFromTask } from '../../../lib/dues-enforcement'

// Roles that can verify tasks
const CAN_VERIFY_TASK = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

export const submitForVerification = publicProcedure
  .input(z.object({
    taskId: z.string(),
    userId: z.string(),
    proofDescription: z.string().optional(),
    attachments: z.array(z.string()).optional(),
    receiptUrls: z.array(z.string()).optional(),
  }))
  .mutation(async ({ input }) => {
    const { taskId, userId, proofDescription, attachments, receiptUrls } = input

    // Get task with deliverable
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: { id: true, name: true, leadId: true, createdById: true }
        },
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' }
            }
          }
        },
        deliverable: true
      }
    })

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found'
      })
    }

    // Only assignee or admin can submit for verification
    const member = task.band.members.find(m => m.userId === userId)
    const isAssignee = task.assigneeId === userId
    const isAdmin = member && CAN_VERIFY_TASK.includes(member.role)

    if (!isAssignee && !isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the assignee can submit this task for verification'
      })
    }

    // Task must require verification
    if (!task.requiresVerification) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This task does not require verification. Just mark it as completed.'
      })
    }

    // All checklist items must be completed before submitting for review
    const incompleteItems = await prisma.checklistItem.count({
      where: { taskId, isCompleted: false },
    })
    if (incompleteItems > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot submit for review: ${incompleteItems} checklist item${incompleteItems === 1 ? ' is' : 's are'} still incomplete.`,
      })
    }

    // If task requires a deliverable, ensure one exists with minimum summary
    if (task.requiresDeliverable && !task.deliverable) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This task requires a deliverable summary before submission. Please add a summary of what was accomplished.',
      })
    }

    // Validate deliverable summary meets minimum length if it exists
    if (task.deliverable && task.deliverable.summary.length < 30) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Deliverable summary must be at least 30 characters.',
      })
    }

    // Update task to IN_REVIEW
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'IN_REVIEW',
        verificationStatus: 'PENDING',
        proofDescription: proofDescription || task.proofDescription,
        attachments: attachments || task.attachments,
        receiptUrls: receiptUrls || task.receiptUrls,
        completedAt: new Date(),
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
        band: {
          select: { id: true, slug: true }
        },
        assignee: {
          select: { id: true, name: true }
        }
      }
    })

    // Notify verifiers (project lead, or founders/governors)
    const verifiersToNotify: string[] = []
    
    // Add project lead if exists
    if (task.project.leadId && task.project.leadId !== userId) {
      verifiersToNotify.push(task.project.leadId)
    }
    
    // Add founders/governors
    task.band.members
      .filter(m => CAN_VERIFY_TASK.includes(m.role) && m.userId !== userId && !verifiersToNotify.includes(m.userId))
      .forEach(m => verifiersToNotify.push(m.userId))

    const notificationPromises = verifiersToNotify.map(verifierId =>
      notificationService.create({
        userId: verifierId,
        type: 'TASK_VERIFICATION_NEEDED',
        title: 'Task Needs Verification',
        message: `"${task.name}" is ready for review in project "${task.project.name}"`,
        relatedId: task.id,
        relatedType: 'task',
        actionUrl: `/bands/${updatedTask.band.slug}/projects/${task.projectId}?task=${task.id}`,
        priority: 'HIGH',
      })
    )

    await Promise.all(notificationPromises)

    return { task: updatedTask }
  })

export const verifyTask = publicProcedure
  .input(z.object({
    taskId: z.string(),
    userId: z.string(),
    approved: z.boolean(),
    verificationNotes: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    // Check dues standing
    const enforcementBandId = await getBandIdFromTask(input.taskId)
    await requireGoodStanding(enforcementBandId, input.userId)

    const { taskId, userId, approved, verificationNotes } = input

    // Get task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: { id: true, name: true }
        },
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    })

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found'
      })
    }

    // Check user can verify
    const member = task.band.members.find(m => m.userId === userId)
    if (!member || !CAN_VERIFY_TASK.includes(member.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to verify tasks'
      })
    }

    // Task must be in review
    if (task.status !== 'IN_REVIEW') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Task must be in review to verify'
      })
    }

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: approved ? 'COMPLETED' : 'IN_PROGRESS',
        verificationStatus: approved ? 'APPROVED' : 'REJECTED',
        verifiedById: userId,
        verifiedAt: new Date(),
        verificationNotes,
        // Save rejection reason if rejected
        rejectionReason: approved ? null : verificationNotes,
        // Clear completedAt if rejected
        completedAt: approved ? task.completedAt : null,
        // Clear escalation tracking
        reminderSentAt: null,
        escalatedAt: null,
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
        band: {
          select: { id: true, slug: true }
        },
        assignee: {
          select: { id: true, name: true }
        },
        verifiedBy: {
          select: { id: true, name: true }
        }
      }
    })

    // Update project completed count if approved
    if (approved) {
      await prisma.project.update({
        where: { id: task.projectId },
        data: { completedTasks: { increment: 1 } }
      })
    }

    // Notify assignee
    if (task.assigneeId) {
      await notificationService.create({
        userId: task.assigneeId,
        type: approved ? 'TASK_VERIFIED' : 'TASK_REJECTED',
        title: approved ? 'Task Approved!' : 'Task Needs Revision',
        message: approved 
          ? `Your task "${task.name}" has been approved`
          : `Your task "${task.name}" needs revision${verificationNotes ? `: ${verificationNotes}` : ''}`,
        relatedId: task.id,
        relatedType: 'task',
        actionUrl: `/bands/${updatedTask.band.slug}/projects/${task.projectId}?task=${task.id}`,
        priority: approved ? 'MEDIUM' : 'HIGH',
      })
    }

    return { task: updatedTask }
  })