import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { requireGoodStanding, getBandIdFromChecklistItem } from '../../lib/dues-enforcement'

// Link schema for deliverable links
const linkSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(100),
})

export const updateChecklistDeliverable = publicProcedure
  .input(z.object({
    checklistItemId: z.string(),
    userId: z.string(),
    summary: z.string().min(30, 'Summary must be at least 30 characters').max(5000),
    links: z.array(linkSchema).optional(),
    nextSteps: z.string().max(2000).optional().nullable(),
  }))
  .mutation(async ({ input }) => {
    const { checklistItemId, userId, summary, links, nextSteps } = input

    // Check dues standing
    const enforcementBandId = await getBandIdFromChecklistItem(checklistItemId)
    await requireGoodStanding(enforcementBandId, userId)

    // Get checklist item with task and band members and existing deliverable
    const item = await prisma.checklistItem.findUnique({
      where: { id: checklistItemId },
      include: {
        deliverable: true,
        task: {
          include: {
            band: {
              include: {
                members: {
                  where: { status: 'ACTIVE' }
                }
              }
            }
          }
        }
      }
    })

    if (!item) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Checklist item not found'
      })
    }

    // Check if user can update: assignee OR has update role (Conductor+)
    const CAN_UPDATE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']
    const membership = item.task.band.members.find(m => m.userId === userId)
    const canUpdate = membership && CAN_UPDATE.includes(membership.role)
    const isAssignee = item.assigneeId === userId

    if (!isAssignee && !canUpdate) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the assignee or Conductor+ can update the deliverable'
      })
    }

    // Check if item is in a state where deliverable can be edited
    // Can edit: before verification review, or after rejection
    const isCompleted = item.isCompleted
    const isRejected = item.verificationStatus === 'REJECTED'
    const isPending = item.verificationStatus === 'PENDING'
    const isApproved = item.verificationStatus === 'APPROVED'

    // Block editing if already approved
    if (isApproved) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Deliverable cannot be edited after item is approved'
      })
    }

    // Allow editing if:
    // - Not completed yet (working on it)
    // - Rejected (needs revision)
    // - Completed but not yet pending/approved (hasn't been submitted)
    if (isPending) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Deliverable cannot be edited while awaiting verification'
      })
    }

    // Create or update deliverable
    const deliverable = await prisma.checklistItemDeliverable.upsert({
      where: { checklistItemId },
      create: {
        checklistItemId,
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

export const getChecklistDeliverable = publicProcedure
  .input(z.object({
    checklistItemId: z.string(),
  }))
  .query(async ({ input }) => {
    const { checklistItemId } = input

    const item = await prisma.checklistItem.findUnique({
      where: { id: checklistItemId },
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

    if (!item) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Checklist item not found'
      })
    }

    return {
      deliverable: item.deliverable,
      requiresDeliverable: item.requiresDeliverable,
      isCompleted: item.isCompleted,
      verificationStatus: item.verificationStatus,
    }
  })

export const attachFileToChecklistDeliverable = publicProcedure
  .input(z.object({
    deliverableId: z.string(),
    fileId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { deliverableId, fileId, userId } = input

    // Get deliverable with checklist item and task
    const deliverable = await prisma.checklistItemDeliverable.findUnique({
      where: { id: deliverableId },
      include: {
        checklistItem: {
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
    await requireGoodStanding(deliverable.checklistItem.task.bandId, userId)

    // Only assignee can attach files
    if (deliverable.checklistItem.assigneeId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the checklist item assignee can attach files to the deliverable'
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
      data: { checklistDeliverableId: deliverableId }
    })

    return { file: updatedFile }
  })

export const removeFileFromChecklistDeliverable = publicProcedure
  .input(z.object({
    fileId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { fileId, userId } = input

    // Get file with deliverable and checklist item
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        checklistDeliverable: {
          include: {
            checklistItem: {
              include: {
                task: true
              }
            }
          }
        }
      }
    })

    if (!file || !file.checklistDeliverable) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'File not found or not attached to a deliverable'
      })
    }

    // Check dues standing
    await requireGoodStanding(file.checklistDeliverable.checklistItem.task.bandId, userId)

    // Only assignee can remove files
    if (file.checklistDeliverable.checklistItem.assigneeId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the checklist item assignee can remove files from the deliverable'
      })
    }

    // Remove file from deliverable (set checklistDeliverableId to null)
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: { checklistDeliverableId: null }
    })

    return { file: updatedFile }
  })
