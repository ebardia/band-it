import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../services/notification.service'

// Roles that can mark items as reimbursed
const CAN_REIMBURSE = ['FOUNDER', 'GOVERNOR', 'TREASURER']

/**
 * Mark a checklist item expense as reimbursed (Treasurer action)
 */
export const reimburseChecklistItem = publicProcedure
  .input(z.object({
    itemId: z.string(),
    userId: z.string(),
    note: z.string().max(500).optional(),
  }))
  .mutation(async ({ input }) => {
    const { itemId, userId, note } = input

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        assignee: { select: { id: true, name: true } },
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

    if (!item) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
    }

    // Check permission
    const membership = item.task.band.members.find(m => m.userId === userId)
    if (!membership || !CAN_REIMBURSE.includes(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only Treasurer, Founder, or Governor can mark items as reimbursed'
      })
    }

    // Check item has an expense pending reimbursement
    if (!item.expenseAmount || item.expenseAmount <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This item has no expense to reimburse'
      })
    }

    if (item.reimbursementStatus !== 'PENDING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot reimburse: status is ${item.reimbursementStatus || 'not pending'}`
      })
    }

    // Update item
    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        reimbursementStatus: 'REIMBURSED',
        reimbursedAt: new Date(),
        reimbursedById: userId,
        reimbursementNote: note,
      },
      include: {
        task: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        reimbursedBy: { select: { id: true, name: true } }
      }
    })

    // Notify the member who is owed
    if (item.assigneeId) {
      await notificationService.create({
        userId: item.assigneeId,
        type: 'REIMBURSEMENT_SENT',
        title: 'Reimbursement Sent',
        message: `Your expense of $${(item.expenseAmount / 100).toFixed(2)} for "${item.description}" has been reimbursed${note ? `: ${note}` : ''}`,
        relatedId: item.id,
        relatedType: 'checklist_item',
        actionUrl: `/bands/${item.task.band.slug}/tasks/${item.taskId}/checklist/${item.id}`,
        priority: 'MEDIUM',
        bandId: item.task.band.id,
      })
    }

    // Log to audit
    await prisma.auditLog.create({
      data: {
        bandId: item.task.band.id,
        actorId: userId,
        action: 'CHECKLIST_REIMBURSED',
        entityType: 'CHECKLIST_ITEM',
        entityId: itemId,
        entityName: item.description,
        changes: {
          taskId: item.taskId,
          expenseAmount: item.expenseAmount,
          note,
          recipientId: item.assigneeId,
        }
      }
    })

    return { item: updatedItem }
  })

/**
 * Confirm reimbursement received (Member action)
 */
export const confirmReimbursement = publicProcedure
  .input(z.object({
    itemId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { itemId, userId } = input

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        reimbursedBy: { select: { id: true, name: true } },
        task: {
          include: {
            band: { select: { id: true, name: true, slug: true } }
          }
        }
      }
    })

    if (!item) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
    }

    // Only the assignee (person owed) can confirm
    if (item.assigneeId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the person who submitted the expense can confirm reimbursement'
      })
    }

    // Check status
    if (item.reimbursementStatus !== 'REIMBURSED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot confirm: status is ${item.reimbursementStatus || 'not reimbursed'}`
      })
    }

    // Update item
    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        reimbursementStatus: 'CONFIRMED',
        reimbursementConfirmedAt: new Date(),
      },
      include: {
        task: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        reimbursedBy: { select: { id: true, name: true } }
      }
    })

    // Notify the treasurer who sent the reimbursement
    if (item.reimbursedById) {
      await notificationService.create({
        userId: item.reimbursedById,
        type: 'REIMBURSEMENT_CONFIRMED',
        title: 'Reimbursement Confirmed',
        message: `Reimbursement for "${item.description}" has been confirmed received`,
        relatedId: item.id,
        relatedType: 'checklist_item',
        actionUrl: `/bands/${item.task.band.slug}/tasks/${item.taskId}/checklist/${item.id}`,
        priority: 'LOW',
        bandId: item.task.band.id,
      })
    }

    // Log to audit
    await prisma.auditLog.create({
      data: {
        bandId: item.task.band.id,
        actorId: userId,
        action: 'CHECKLIST_REIMBURSEMENT_CONFIRMED',
        entityType: 'CHECKLIST_ITEM',
        entityId: itemId,
        entityName: item.description,
        changes: {
          taskId: item.taskId,
          expenseAmount: item.expenseAmount,
        }
      }
    })

    return { item: updatedItem }
  })

/**
 * Dispute reimbursement (Member action)
 */
export const disputeReimbursement = publicProcedure
  .input(z.object({
    itemId: z.string(),
    userId: z.string(),
    reason: z.string().min(10).max(1000),
  }))
  .mutation(async ({ input }) => {
    const { itemId, userId, reason } = input

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        reimbursedBy: { select: { id: true, name: true } },
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

    if (!item) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
    }

    // Only the assignee (person owed) can dispute
    if (item.assigneeId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the person who submitted the expense can dispute reimbursement'
      })
    }

    // Check status
    if (item.reimbursementStatus !== 'REIMBURSED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot dispute: status is ${item.reimbursementStatus || 'not reimbursed'}`
      })
    }

    // Update item
    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        reimbursementStatus: 'DISPUTED',
        reimbursementNote: `DISPUTED: ${reason}`,
      },
      include: {
        task: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        reimbursedBy: { select: { id: true, name: true } }
      }
    })

    // Notify treasurer + governors
    const notifyMembers = item.task.band.members.filter(m =>
      ['FOUNDER', 'GOVERNOR', 'TREASURER'].includes(m.role) && m.userId !== userId
    )

    for (const member of notifyMembers) {
      await notificationService.create({
        userId: member.userId,
        type: 'REIMBURSEMENT_DISPUTED',
        title: 'Reimbursement Disputed',
        message: `Reimbursement for "${item.description}" has been disputed: ${reason}`,
        relatedId: item.id,
        relatedType: 'checklist_item',
        actionUrl: `/bands/${item.task.band.slug}/tasks/${item.taskId}/checklist/${item.id}`,
        priority: 'HIGH',
        bandId: item.task.band.id,
      })
    }

    // Log to audit
    await prisma.auditLog.create({
      data: {
        bandId: item.task.band.id,
        actorId: userId,
        action: 'CHECKLIST_REIMBURSEMENT_DISPUTED',
        entityType: 'CHECKLIST_ITEM',
        entityId: itemId,
        entityName: item.description,
        changes: {
          taskId: item.taskId,
          expenseAmount: item.expenseAmount,
          reason,
        }
      }
    })

    return { item: updatedItem }
  })

/**
 * Get pending reimbursements for a band (Treasurer view)
 */
export const getPendingReimbursements = publicProcedure
  .input(z.object({
    bandId: z.string(),
    userId: z.string(),
    status: z.enum(['PENDING', 'REIMBURSED', 'DISPUTED']).optional(),
  }))
  .query(async ({ input }) => {
    const { bandId, userId, status = 'PENDING' } = input

    // Check user is a member with treasurer permissions
    const membership = await prisma.member.findFirst({
      where: {
        bandId,
        userId,
        status: 'ACTIVE',
      }
    })

    if (!membership || !CAN_REIMBURSE.includes(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view pending reimbursements'
      })
    }

    const items = await prisma.checklistItem.findMany({
      where: {
        task: { bandId },
        reimbursementStatus: status,
        expenseAmount: { gt: 0 },
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        reimbursedBy: { select: { id: true, name: true } },
        task: {
          select: {
            id: true,
            name: true,
            project: { select: { id: true, name: true } },
            band: { select: { id: true, name: true, slug: true } }
          }
        },
        deliverable: {
          include: {
            files: {
              where: { category: 'RECEIPT' },
              select: { id: true, filename: true, url: true }
            }
          }
        },
        files: {
          where: { category: 'RECEIPT' },
          select: { id: true, filename: true, url: true }
        }
      },
      orderBy: [
        { verifiedAt: 'asc' }, // Oldest first
      ]
    })

    // Calculate totals
    const totalAmount = items.reduce((sum, item) => sum + (item.expenseAmount || 0), 0)

    return {
      items,
      totalAmount,
      count: items.length,
    }
  })

/**
 * Get my pending reimbursements (Member view)
 */
export const getMyPendingReimbursements = publicProcedure
  .input(z.object({
    userId: z.string(),
  }))
  .query(async ({ input }) => {
    const { userId } = input

    // Get items where user is assignee and reimbursement is pending or awaiting confirmation
    const items = await prisma.checklistItem.findMany({
      where: {
        assigneeId: userId,
        expenseAmount: { gt: 0 },
        reimbursementStatus: { in: ['PENDING', 'REIMBURSED'] },
      },
      include: {
        reimbursedBy: { select: { id: true, name: true } },
        task: {
          select: {
            id: true,
            name: true,
            project: { select: { id: true, name: true } },
            band: { select: { id: true, name: true, slug: true } }
          }
        }
      },
      orderBy: [
        { reimbursementStatus: 'asc' }, // PENDING before REIMBURSED
        { verifiedAt: 'asc' }
      ]
    })

    // Separate by status
    const awaitingReimbursement = items.filter(i => i.reimbursementStatus === 'PENDING')
    const awaitingConfirmation = items.filter(i => i.reimbursementStatus === 'REIMBURSED')

    return {
      awaitingReimbursement,
      awaitingConfirmation,
      totalOwed: awaitingReimbursement.reduce((sum, i) => sum + (i.expenseAmount || 0), 0),
      totalAwaitingConfirmation: awaitingConfirmation.reduce((sum, i) => sum + (i.expenseAmount || 0), 0),
    }
  })
