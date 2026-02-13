import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import {
  storageService,
  isAllowedType,
  getFileSizeLimit,
  getCategoryFromMimeType
} from '../../services/storage.service'
import { requireGoodStanding } from '../../lib/dues-enforcement'

export const fileRouter = router({
  upload: publicProcedure
    .input(z.object({
      fileName: z.string(),
      mimeType: z.string(),
      base64Data: z.string(),
      userId: z.string(),
      bandId: z.string().optional(),
      proposalId: z.string().optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
      checklistItemId: z.string().optional(),
      eventId: z.string().optional(),
      manualPaymentId: z.string().optional(),
      feedbackId: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(['IMAGE', 'DOCUMENT', 'RECEIPT', 'OTHER']).optional(),
    }))
    .mutation(async ({ input }) => {
      const {
        fileName, mimeType, base64Data, userId,
        bandId, proposalId, projectId, taskId, checklistItemId, eventId, manualPaymentId, feedbackId,
        description, category
      } = input

      if (!isAllowedType(mimeType)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `File type not allowed: ${mimeType}`,
        })
      }

      const buffer = Buffer.from(base64Data, 'base64')
      
      const sizeLimit = getFileSizeLimit(mimeType)
      if (buffer.length > sizeLimit) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `File too large. Maximum size: ${Math.round(sizeLimit / 1024 / 1024)}MB`,
        })
      }

      // Check dues standing (if uploading to a band context)
      if (bandId) {
        await requireGoodStanding(bandId, userId)
      }

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      if (bandId) {
        const band = await prisma.band.findUnique({ where: { id: bandId } })
        if (!band) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Band not found' })
        }
      }
      if (proposalId) {
        const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } })
        if (!proposal) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposal not found' })
        }
      }
      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } })
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
        }
      }
      if (taskId) {
        const task = await prisma.task.findUnique({ where: { id: taskId } })
        if (!task) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
        }
      }
      if (checklistItemId) {
        const checklistItem = await prisma.checklistItem.findUnique({ where: { id: checklistItemId } })
        if (!checklistItem) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
        }
      }
      if (eventId) {
        const event = await prisma.event.findUnique({ where: { id: eventId } })
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' })
        }
      }
      if (manualPaymentId) {
        const manualPayment = await prisma.manualPayment.findUnique({ where: { id: manualPaymentId } })
        if (!manualPayment) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Manual payment not found' })
        }
      }
      if (feedbackId) {
        const feedback = await prisma.feedback.findUnique({ where: { id: feedbackId } })
        if (!feedback) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Feedback not found' })
        }
      }

      const uploadResult = await storageService.upload(buffer, fileName, mimeType)
      
      const fileCategory = category || getCategoryFromMimeType(mimeType)

      const file = await prisma.file.create({
        data: {
          filename: uploadResult.filename,
          originalName: fileName,
          mimeType,
          size: buffer.length,
          category: fileCategory,
          storageKey: uploadResult.storageKey,
          url: uploadResult.url,
          uploadedById: userId,
          bandId,
          proposalId,
          projectId,
          taskId,
          checklistItemId,
          eventId,
          manualPaymentId,
          feedbackId,
          description,
        },
        include: {
          uploadedBy: {
            select: { id: true, name: true, deletedAt: true }
          }
        }
      })

      return { file }
    }),

  getByEntity: publicProcedure
    .input(z.object({
      bandId: z.string().optional(),
      proposalId: z.string().optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
      checklistItemId: z.string().optional(),
      eventId: z.string().optional(),
      manualPaymentId: z.string().optional(),
      feedbackId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { bandId, proposalId, projectId, taskId, checklistItemId, eventId, manualPaymentId, feedbackId } = input

      const where: any = {
        deletedAt: null,
      }

      if (bandId) where.bandId = bandId
      if (proposalId) where.proposalId = proposalId
      if (projectId) where.projectId = projectId
      if (taskId) where.taskId = taskId
      if (checklistItemId) where.checklistItemId = checklistItemId
      if (eventId) where.eventId = eventId
      if (manualPaymentId) where.manualPaymentId = manualPaymentId
      if (feedbackId) where.feedbackId = feedbackId

      const files = await prisma.file.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, name: true, deletedAt: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return { files }
    }),

  getById: publicProcedure
    .input(z.object({
      fileId: z.string(),
    }))
    .query(async ({ input }) => {
      const file = await prisma.file.findUnique({
        where: { id: input.fileId },
        include: {
          uploadedBy: {
            select: { id: true, name: true, deletedAt: true }
          }
        }
      })

      if (!file || file.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found'
        })
      }

      return { file }
    }),

  delete: publicProcedure
    .input(z.object({
      fileId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { fileId, userId } = input

      const file = await prisma.file.findUnique({
        where: { id: fileId }
      })

      if (!file || file.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found'
        })
      }

      if (file.uploadedById !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete files you uploaded'
        })
      }

      await prisma.file.update({
        where: { id: fileId },
        data: { deletedAt: new Date() }
      })

      try {
        await storageService.delete(file.storageKey)
      } catch (error) {
        console.error('Failed to delete file from storage:', error)
      }

      return { success: true }
    }),
})