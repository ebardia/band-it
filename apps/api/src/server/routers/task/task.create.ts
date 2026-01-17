import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../../services/notification.service'
import { setAuditFlags, clearAuditFlags } from '../../../lib/auditContext'

// Roles that can create tasks
const CAN_CREATE_TASK = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const createTask = publicProcedure
  .input(z.object({
    projectId: z.string(),
    name: z.string().min(1, 'Task name is required').max(200),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
    assigneeId: z.string().optional(),
    assigneeType: z.enum(['MEMBER', 'BANDINO', 'VENDOR']).optional().default('MEMBER'),
    dueDate: z.string().datetime().optional(),
    estimatedHours: z.number().int().positive().optional(),
    estimatedCost: z.number().positive().optional(),
    requiresVerification: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional(),
    orderIndex: z.number().int().optional(),
    userId: z.string(),
    aiGenerated: z.boolean().optional().default(false),
    // Integrity Guard flags - set when user proceeds despite warnings
    proceedWithFlags: z.boolean().optional(),
    flagReasons: z.array(z.string()).optional(),
    flagDetails: z.any().optional(),
  }))
  .mutation(async ({ input }) => {
    const {
      projectId, name, description, priority, assigneeId, assigneeType,
      dueDate, estimatedHours, estimatedCost, requiresVerification,
      tags, orderIndex, userId, aiGenerated,
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

    // Validate due date is not in the past
    if (dueDate) {
      const dueDateObj = new Date(dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Start of today
      if (dueDateObj < today) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Due date cannot be in the past'
        })
      }
    }

    // Get project with band info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              include: { user: true }
            }
          }
        }
      }
    })

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found'
      })
    }

    // Check user is a member with permission
    const member = project.band.members.find(m => m.userId === userId)
    if (!member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member to create tasks'
      })
    }

    if (!CAN_CREATE_TASK.includes(member.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to create tasks'
      })
    }

    // If assigneeId provided and type is MEMBER, verify they are a band member
    if (assigneeId && assigneeType === 'MEMBER') {
      const assigneeMember = project.band.members.find(m => m.userId === assigneeId)
      if (!assigneeMember) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Assignee must be a band member'
        })
      }
    }

    // Get current max orderIndex if not provided
    let finalOrderIndex = orderIndex
    if (finalOrderIndex === undefined) {
      const maxOrder = await prisma.task.aggregate({
        where: { projectId },
        _max: { orderIndex: true }
      })
      finalOrderIndex = (maxOrder._max.orderIndex ?? -1) + 1
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        projectId,
        bandId: project.bandId,
        name,
        description,
        priority,
        assigneeId,
        assigneeType,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours,
        estimatedCost,
        requiresVerification,
        tags: tags || [],
        orderIndex: finalOrderIndex,
        createdById: userId,
        aiGenerated,
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Clear flags immediately after task creation so the project update isn't flagged
    clearAuditFlags()

    // Update project task count (this is just a counter, shouldn't be flagged)
    await prisma.project.update({
      where: { id: projectId },
      data: {
        totalTasks: { increment: 1 }
      }
    })

    // Notify assignee if assigned
    if (assigneeId && assigneeId !== userId) {
      await notificationService.create({
        userId: assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'Task Assigned to You',
        message: `You've been assigned "${name}" in project "${project.name}"`,
        relatedId: task.id,
        relatedType: 'task',
        actionUrl: `/bands/${project.band.slug}/projects/${projectId}?task=${task.id}`,
      })
    }

    return { task }
  })