import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'

// Roles that can delete tasks
const CAN_DELETE_TASK = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const deleteTask = publicProcedure
  .input(z.object({
    taskId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { taskId, userId } = input

    // Get the task with project and band info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            band: {
              include: {
                members: {
                  where: { userId, status: 'ACTIVE' },
                },
              },
            },
          },
        },
      },
    })

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found',
      })
    }

    // Check if user is a member with permission to delete
    const membership = task.project.band.members[0]
    if (!membership || !CAN_DELETE_TASK.includes(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete tasks',
      })
    }

    // Delete the task (cascades to checklist items, files, etc. based on schema)
    await prisma.task.delete({
      where: { id: taskId },
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        bandId: task.project.band.id,
        actorId: userId,
        action: 'TASK_DELETED',
        entityType: 'Task',
        entityId: taskId,
        entityName: task.name,
        changes: {
          taskName: task.name,
          projectId: task.projectId,
          projectName: task.project.name,
        },
      },
    })

    return {
      success: true,
      message: 'Task deleted successfully',
    }
  })
