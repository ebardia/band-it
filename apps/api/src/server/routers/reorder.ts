import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'

// Roles that can reorder items
const CAN_REORDER = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const reorderRouter = router({
  // Reorder a project within a band
  reorderProject: publicProcedure
    .input(z.object({
      projectId: z.string(),
      direction: z.enum(['up', 'down']),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { projectId, direction, userId } = input

      // Get the project with band info
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          band: {
            include: {
              members: {
                where: { userId, status: 'ACTIVE' },
              },
            },
          },
        },
      })

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
      }

      // Check permissions
      const membership = project.band.members[0]
      if (!membership || !CAN_REORDER.includes(membership.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to reorder projects' })
      }

      // Get all projects in this band sorted by orderIndex
      const projects = await prisma.project.findMany({
        where: { bandId: project.bandId },
        orderBy: { orderIndex: 'asc' },
        select: { id: true, orderIndex: true },
      })

      const currentIndex = projects.findIndex(p => p.id === projectId)
      if (currentIndex === -1) return { success: true }

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (swapIndex < 0 || swapIndex >= projects.length) {
        return { success: true } // Already at the edge
      }

      // Swap orderIndex values
      const currentProject = projects[currentIndex]
      const swapProject = projects[swapIndex]

      await prisma.$transaction([
        prisma.project.update({
          where: { id: currentProject.id },
          data: { orderIndex: swapProject.orderIndex },
        }),
        prisma.project.update({
          where: { id: swapProject.id },
          data: { orderIndex: currentProject.orderIndex },
        }),
      ])

      return { success: true }
    }),

  // Reorder a task within a project
  reorderTask: publicProcedure
    .input(z.object({
      taskId: z.string(),
      direction: z.enum(['up', 'down']),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { taskId, direction, userId } = input

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
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      }

      // Check permissions
      const membership = task.project.band.members[0]
      if (!membership || !CAN_REORDER.includes(membership.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to reorder tasks' })
      }

      // Get all tasks in this project sorted by orderIndex
      const tasks = await prisma.task.findMany({
        where: { projectId: task.projectId },
        orderBy: { orderIndex: 'asc' },
        select: { id: true, orderIndex: true },
      })

      const currentIndex = tasks.findIndex(t => t.id === taskId)
      if (currentIndex === -1) return { success: true }

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (swapIndex < 0 || swapIndex >= tasks.length) {
        return { success: true } // Already at the edge
      }

      // Swap orderIndex values
      const currentTask = tasks[currentIndex]
      const swapTask = tasks[swapIndex]

      await prisma.$transaction([
        prisma.task.update({
          where: { id: currentTask.id },
          data: { orderIndex: swapTask.orderIndex },
        }),
        prisma.task.update({
          where: { id: swapTask.id },
          data: { orderIndex: currentTask.orderIndex },
        }),
      ])

      return { success: true }
    }),

  // Reorder a checklist item within a task
  reorderChecklistItem: publicProcedure
    .input(z.object({
      itemId: z.string(),
      direction: z.enum(['up', 'down']),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { itemId, direction, userId } = input

      // Get the checklist item with task and band info
      const item = await prisma.checklistItem.findUnique({
        where: { id: itemId },
        include: {
          task: {
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

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
      }

      // Check permissions - allow assignee or those with reorder permission
      const membership = item.task.band.members[0]
      const isAssignee = item.assigneeId === userId
      if (!membership || (!isAssignee && !CAN_REORDER.includes(membership.role))) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to reorder checklist items' })
      }

      // Get all checklist items in this task sorted by orderIndex
      const items = await prisma.checklistItem.findMany({
        where: { taskId: item.taskId },
        orderBy: { orderIndex: 'asc' },
        select: { id: true, orderIndex: true },
      })

      const currentIndex = items.findIndex(i => i.id === itemId)
      if (currentIndex === -1) return { success: true }

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (swapIndex < 0 || swapIndex >= items.length) {
        return { success: true } // Already at the edge
      }

      // Swap orderIndex values
      const currentItem = items[currentIndex]
      const swapItem = items[swapIndex]

      await prisma.$transaction([
        prisma.checklistItem.update({
          where: { id: currentItem.id },
          data: { orderIndex: swapItem.orderIndex },
        }),
        prisma.checklistItem.update({
          where: { id: swapItem.id },
          data: { orderIndex: currentItem.orderIndex },
        }),
      ])

      return { success: true }
    }),
})
