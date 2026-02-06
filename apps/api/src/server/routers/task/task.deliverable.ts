import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { requireGoodStanding, getBandIdFromTask } from '../../../lib/dues-enforcement'

// Link schema for deliverable links
const linkSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(100),
})

export const updateDeliverable = publicProcedure
  .input(z.object({
    taskId: z.string(),
    userId: z.string(),
    summary: z.string().min(30, 'Summary must be at least 30 characters').max(5000),
    links: z.array(linkSchema).optional(),
    nextSteps: z.string().max(2000).optional().nullable(),
  }))
  .mutation(async ({ input }) => {
    const { taskId, userId, summary, links, nextSteps } = input

    // Check dues standing
    const enforcementBandId = await getBandIdFromTask(taskId)
    await requireGoodStanding(enforcementBandId, userId)

    // Get task with band members and existing deliverable
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        deliverable: true,
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

    // Only assignee can create/update deliverable
    if (task.assigneeId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the task assignee can update the deliverable'
      })
    }

    // Check if task is in a state where deliverable can be edited
    // Can edit: before verification review, or after rejection
    const allowedStatuses = ['TODO', 'IN_PROGRESS', 'BLOCKED']
    const isRejected = task.verificationStatus === 'REJECTED'

    if (!allowedStatuses.includes(task.status) && !isRejected) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Deliverable can only be edited before submission or after rejection'
      })
    }

    // Create or update deliverable
    const deliverable = await prisma.taskDeliverable.upsert({
      where: { taskId },
      create: {
        taskId,
        summary,
        links: links || [],
        nextSteps,
        createdById: userId,
      },
      update: {
        summary,
        links: links || [],
        nextSteps,
      },
      include: {
        files: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            url: true,
            category: true,
          }
        }
      }
    })

    return { deliverable }
  })

export const getDeliverable = publicProcedure
  .input(z.object({
    taskId: z.string(),
  }))
  .query(async ({ input }) => {
    const { taskId } = input

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        deliverable: {
          include: {
            files: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                mimeType: true,
                size: true,
                url: true,
                category: true,
              }
            },
            createdBy: {
              select: { id: true, name: true }
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

    return {
      deliverable: task.deliverable,
      requiresDeliverable: task.requiresDeliverable,
      taskStatus: task.status,
      verificationStatus: task.verificationStatus,
    }
  })

export const attachFileToDeliverable = publicProcedure
  .input(z.object({
    deliverableId: z.string(),
    fileId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { deliverableId, fileId, userId } = input

    // Get deliverable with task
    const deliverable = await prisma.taskDeliverable.findUnique({
      where: { id: deliverableId },
      include: {
        task: {
          include: {
            band: {
              include: {
                members: { where: { status: 'ACTIVE' } }
              }
            }
          }
        }
      }
    })

    if (!deliverable) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Deliverable not found'
      })
    }

    // Check dues standing
    await requireGoodStanding(deliverable.task.bandId, userId)

    // Only assignee can attach files
    if (deliverable.task.assigneeId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the task assignee can attach files to the deliverable'
      })
    }

    // Get file and verify it belongs to the user
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    })

    if (!file) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'File not found'
      })
    }

    if (file.uploadedById !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only attach files you uploaded'
      })
    }

    // Update file to point to this deliverable
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: { deliverableId }
    })

    return { file: updatedFile }
  })

export const removeFileFromDeliverable = publicProcedure
  .input(z.object({
    fileId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { fileId, userId } = input

    // Get file with deliverable and task
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        deliverable: {
          include: {
            task: true
          }
        }
      }
    })

    if (!file || !file.deliverable) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'File not found or not attached to a deliverable'
      })
    }

    // Check dues standing
    await requireGoodStanding(file.deliverable.task.bandId, userId)

    // Only assignee can remove files
    if (file.deliverable.task.assigneeId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the task assignee can remove files from the deliverable'
      })
    }

    // Remove file from deliverable (set deliverableId to null)
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: { deliverableId: null }
    })

    return { file: updatedFile }
  })
