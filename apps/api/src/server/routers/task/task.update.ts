import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../../services/notification.service'
import { setAuditFlags, clearAuditFlags } from '../../../lib/auditContext'

// Roles that can update any task
const CAN_UPDATE_ANY_TASK = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const updateTask = publicProcedure
  .input(z.object({
    taskId: z.string(),
    userId: z.string(),
    // Optional fields to update
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional().nullable(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    assigneeId: z.string().optional().nullable(),
    assigneeType: z.enum(['MEMBER', 'BANDINO', 'VENDOR']).optional(),
    dueDate: z.string().datetime().optional().nullable(),
    estimatedHours: z.number().int().positive().optional().nullable(),
    actualHours: z.number().int().positive().optional().nullable(),
    estimatedCost: z.number().positive().optional().nullable(),
    actualCost: z.number().positive().optional().nullable(),
    requiresVerification: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    orderIndex: z.number().int().optional(),
    // Integrity Guard flags
    proceedWithFlags: z.boolean().optional(),
    flagReasons: z.array(z.string()).optional(),
    flagDetails: z.any().optional(),
  }))
  .mutation(async ({ input }) => {
    const {
      taskId, userId, name, description, status, priority,
      assigneeId, assigneeType, dueDate, estimatedHours, actualHours,
      estimatedCost, actualCost, requiresVerification, tags, orderIndex,
      proceedWithFlags, flagReasons, flagDetails
    } = input

    // Set integrity flags in audit context if user proceeded with warnings
    if (proceedWithFlags && flagReasons && flagReasons.length > 0) {
      setAuditFlags({
        flagged: true,
        flagReasons,
        flagDetails,
      })
    }

    // Get task with band members
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
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

    // Check user has permission (either admin role or is assignee)
    const member = task.band.members.find(m => m.userId === userId)
    const isAssignee = task.assigneeId === userId
    const canUpdateAny = member && CAN_UPDATE_ANY_TASK.includes(member.role)
    
    if (!member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member to update tasks'
      })
    }

    // Assignees can only update certain fields
    if (!canUpdateAny && !isAssignee) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this task'
      })
    }

    // If assignee but not admin, restrict what they can change
    if (isAssignee && !canUpdateAny) {
      // Assignees can only update: status, actualHours, actualCost, description
      if (name !== undefined || priority !== undefined || assigneeId !== undefined || 
          dueDate !== undefined || estimatedHours !== undefined || estimatedCost !== undefined ||
          requiresVerification !== undefined || tags !== undefined || orderIndex !== undefined) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update status, actual hours, actual cost, and description'
        })
      }
    }

    // If changing assignee, verify they are a band member
    if (assigneeId && assigneeType === 'MEMBER') {
      const assigneeMember = task.band.members.find(m => m.userId === assigneeId)
      if (!assigneeMember) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Assignee must be a band member'
        })
      }
    }

    const oldStatus = task.status
    const oldAssigneeId = task.assigneeId

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (priority !== undefined) updateData.priority = priority
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId
    if (assigneeType !== undefined) updateData.assigneeType = assigneeType
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours
    if (actualHours !== undefined) updateData.actualHours = actualHours
    if (estimatedCost !== undefined) updateData.estimatedCost = estimatedCost
    if (actualCost !== undefined) updateData.actualCost = actualCost
    if (requiresVerification !== undefined) updateData.requiresVerification = requiresVerification
    if (tags !== undefined) updateData.tags = tags
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex

    // Handle status changes
    if (status !== undefined) {
      updateData.status = status
      
      // Set startedAt when moving to IN_PROGRESS
      if (status === 'IN_PROGRESS' && !task.startedAt) {
        updateData.startedAt = new Date()
      }
      
      // Set completedAt when moving to COMPLETED
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
      } else if (task.status === 'COMPLETED' && status !== 'COMPLETED') {
        // Clear completedAt if moving away from completed
        updateData.completedAt = null
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true }
        },
        band: {
          select: { id: true, slug: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        },
        verifiedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Update project completed count if status changed to/from COMPLETED
    if (status !== undefined && oldStatus !== status) {
      if (status === 'COMPLETED') {
        await prisma.project.update({
          where: { id: task.projectId },
          data: { completedTasks: { increment: 1 } }
        })
      } else if (oldStatus === 'COMPLETED') {
        await prisma.project.update({
          where: { id: task.projectId },
          data: { completedTasks: { decrement: 1 } }
        })
      }
    }

    // Notify new assignee if changed
    if (assigneeId !== undefined && assigneeId !== oldAssigneeId && assigneeId !== userId) {
      await notificationService.create({
        userId: assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'Task Assigned to You',
        message: `You've been assigned "${updatedTask.name}" in project "${updatedTask.project.name}"`,
        relatedId: task.id,
        relatedType: 'task',
        actionUrl: `/bands/${updatedTask.band.slug}/projects/${task.projectId}?task=${task.id}`,
      })
    }

    // Notify about status change
    if (status !== undefined && oldStatus !== status && status === 'COMPLETED') {
      // Notify project lead or creator
      const project = await prisma.project.findUnique({
        where: { id: task.projectId },
        select: { leadId: true, createdById: true }
      })
      
      const notifyUserId = project?.leadId || project?.createdById
      if (notifyUserId && notifyUserId !== userId) {
        await notificationService.create({
          userId: notifyUserId,
          type: 'TASK_COMPLETED',
          title: 'Task Completed',
          message: `Task "${updatedTask.name}" has been marked as completed`,
          relatedId: task.id,
          relatedType: 'task',
          actionUrl: `/bands/${updatedTask.band.slug}/projects/${task.projectId}?task=${task.id}`,
        })
      }
    }

    // Clear flags to prevent leaking to other operations
    clearAuditFlags()

    return { task: updatedTask }
  })