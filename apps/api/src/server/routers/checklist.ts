import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'

export const checklistRouter = router({
  // Get checklist items for a task
  getByTask: publicProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .query(async ({ input }) => {
      const { taskId } = input

      const items = await prisma.checklistItem.findMany({
        where: { taskId },
        include: {
          completedBy: {
            select: { id: true, name: true }
          }
        },
        orderBy: { orderIndex: 'asc' }
      })

      return { items }
    }),

  // Create a checklist item
  create: publicProcedure
    .input(z.object({
      taskId: z.string(),
      description: z.string().min(1, 'Description is required'),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { taskId, description, userId } = input

      // Verify task exists
      const task = await prisma.task.findUnique({ where: { id: taskId } })
      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      }

      // Get max order index
      const maxOrder = await prisma.checklistItem.findFirst({
        where: { taskId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true }
      })

      const item = await prisma.checklistItem.create({
        data: {
          taskId,
          description,
          orderIndex: (maxOrder?.orderIndex ?? -1) + 1,
        },
        include: {
          completedBy: {
            select: { id: true, name: true }
          }
        }
      })

      return { item }
    }),

  // Update a checklist item
  update: publicProcedure
    .input(z.object({
      itemId: z.string(),
      description: z.string().min(1).optional(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { itemId, description } = input

      const item = await prisma.checklistItem.findUnique({ where: { id: itemId } })
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
      }

      const updatedItem = await prisma.checklistItem.update({
        where: { id: itemId },
        data: { description },
        include: {
          completedBy: {
            select: { id: true, name: true }
          }
        }
      })

      return { item: updatedItem }
    }),

  // Toggle completion
  toggle: publicProcedure
    .input(z.object({
      itemId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { itemId, userId } = input

      const item = await prisma.checklistItem.findUnique({ where: { id: itemId } })
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
      }

      const updatedItem = await prisma.checklistItem.update({
        where: { id: itemId },
        data: {
          isCompleted: !item.isCompleted,
          completedById: !item.isCompleted ? userId : null,
          completedAt: !item.isCompleted ? new Date() : null,
        },
        include: {
          completedBy: {
            select: { id: true, name: true }
          }
        }
      })

      return { item: updatedItem }
    }),

  // Delete a checklist item
  delete: publicProcedure
    .input(z.object({
      itemId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { itemId } = input

      const item = await prisma.checklistItem.findUnique({ where: { id: itemId } })
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
      }

      await prisma.checklistItem.delete({ where: { id: itemId } })

      return { success: true }
    }),

  // Reorder checklist items
  reorder: publicProcedure
    .input(z.object({
      taskId: z.string(),
      itemIds: z.array(z.string()),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { taskId, itemIds } = input

      // Update order for each item
      await Promise.all(
        itemIds.map((id, index) =>
          prisma.checklistItem.update({
            where: { id },
            data: { orderIndex: index }
          })
        )
      )

      const items = await prisma.checklistItem.findMany({
        where: { taskId },
        include: {
          completedBy: {
            select: { id: true, name: true }
          }
        },
        orderBy: { orderIndex: 'asc' }
      })

      return { items }
    }),
})