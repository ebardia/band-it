import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { requireGoodStanding } from '../../lib/dues-enforcement'
import { MemberRole } from '@prisma/client'
import { notificationService } from '../../services/notification.service'

// Role hierarchy for minClaimRole checks
const ROLE_HIERARCHY: Record<MemberRole, number> = {
  FOUNDER: 6,
  GOVERNOR: 5,
  MODERATOR: 4,
  CONDUCTOR: 3,
  VOTING_MEMBER: 2,
  OBSERVER: 1,
}

// Roles that can verify checklist items
const CAN_VERIFY = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

function canClaimWithRole(userRole: MemberRole, minClaimRole: MemberRole | null): boolean {
  if (!minClaimRole) return true // null means anyone can claim
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minClaimRole]
}

/**
 * Get claimable checklist items for a user across all their bands
 * - Unassigned items in bands where user is active member
 * - Respects minClaimRole visibility
 * - Not completed/verified
 */
export const getClaimableChecklistItems = publicProcedure
  .input(z.object({
    userId: z.string(),
    bandId: z.string().optional(), // Filter to specific band
    contextPhone: z.boolean().optional(),
    contextComputer: z.boolean().optional(),
    contextTravel: z.boolean().optional(),
    maxTimeMinutes: z.number().optional(),
    limit: z.number().min(1).max(50).optional(),
  }))
  .query(async ({ input }) => {
    const { userId, bandId, contextPhone, contextComputer, contextTravel, maxTimeMinutes, limit = 20 } = input

    // Get user's active memberships with roles
    const memberships = await prisma.member.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        ...(bandId && { bandId }),
        band: { dissolvedAt: null },
      },
      select: {
        bandId: true,
        role: true,
      },
    })

    if (memberships.length === 0) {
      return { items: [] }
    }

    // Build band-role map
    const bandRoles = new Map<string, MemberRole>()
    memberships.forEach(m => bandRoles.set(m.bandId, m.role))

    // Get all unassigned, non-completed checklist items from user's bands
    const items = await prisma.checklistItem.findMany({
      where: {
        task: {
          bandId: { in: Array.from(bandRoles.keys()) },
          status: { in: ['TODO', 'IN_PROGRESS'] }, // Only from active tasks
          project: {
            status: { notIn: ['CANCELLED', 'COMPLETED'] }, // Exclude cancelled/completed projects
          },
        },
        assigneeId: null,
        isCompleted: false,
        verificationStatus: { not: 'APPROVED' },
        // Context filters
        ...(contextPhone !== undefined && { contextPhone }),
        ...(contextComputer !== undefined && { contextComputer }),
        ...(contextTravel !== undefined && { contextTravel }),
        ...(maxTimeMinutes && { contextTimeMinutes: { lte: maxTimeMinutes } }),
      },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            projectId: true,
            project: {
              select: { id: true, name: true }
            },
            band: {
              select: { id: true, name: true, slug: true }
            }
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      take: limit * 2, // Fetch extra since we'll filter by role
    })

    // Filter by minClaimRole - user's role must meet or exceed the requirement
    const claimableItems = items.filter(item => {
      const userRole = bandRoles.get(item.task.band.id)
      if (!userRole) return false

      // If no minClaimRole, anyone can claim
      if (!item.minClaimRole) return true

      // Check role hierarchy
      return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[item.minClaimRole]
    }).slice(0, limit)

    return { items: claimableItems }
  })

/**
 * Claim an unassigned checklist item
 */
export const claimChecklistItem = publicProcedure
  .input(z.object({
    itemId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { itemId, userId } = input

    // Get checklist item with task and band info
    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        task: {
          include: {
            project: {
              select: { id: true, name: true, bandId: true }
            },
            band: {
              select: { id: true, name: true, slug: true, dissolvedAt: true }
            }
          }
        },
        assignee: {
          select: { id: true, name: true }
        }
      }
    })

    if (!item) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
    }

    if (item.task.band.dissolvedAt) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Band has been dissolved' })
    }

    const bandId = item.task.band.id

    // Check membership
    const membership = await prisma.member.findFirst({
      where: {
        userId,
        bandId,
        status: 'ACTIVE'
      }
    })

    if (!membership) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this band' })
    }

    // Check dues standing
    await requireGoodStanding(bandId, userId)

    // Check role requirement
    if (!canClaimWithRole(membership.role, item.minClaimRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This item requires ${item.minClaimRole} role or higher`
      })
    }

    // Check not already claimed by someone else
    if (item.assigneeId && item.assigneeId !== userId) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Item already claimed by ${item.assignee?.name || 'someone else'}`
      })
    }

    // Check item is not already completed/verified
    if (item.verificationStatus === 'APPROVED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Item is already completed and verified'
      })
    }

    // Claim the item
    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        assigneeId: userId,
        assignmentMethod: 'CLAIMED',
        assignedAt: new Date(),
        // Clear any previous rejection state
        verificationStatus: null,
        rejectionReason: null,
        reminderSentAt: null,
        escalatedAt: null,
      },
      include: {
        task: {
          select: { id: true, name: true }
        },
        assignee: {
          select: { id: true, name: true }
        }
      }
    })

    // Log to audit
    await prisma.auditLog.create({
      data: {
        bandId,
        actorId: userId,
        action: 'CHECKLIST_ITEM_CLAIMED',
        entityType: 'CHECKLIST_ITEM',
        entityId: itemId,
        entityName: item.description,
        changes: {
          taskId: item.taskId,
          taskName: item.task.name
        }
      }
    })

    return { item: updatedItem }
  })

/**
 * Unclaim a checklist item you've claimed
 */
export const unclaimChecklistItem = publicProcedure
  .input(z.object({
    itemId: z.string(),
    userId: z.string(),
    reason: z.string().max(500).optional(),
  }))
  .mutation(async ({ input }) => {
    const { itemId, userId, reason } = input

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        task: {
          include: {
            project: { select: { id: true, name: true } },
            band: { select: { id: true, name: true, slug: true } }
          }
        }
      }
    })

    if (!item) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
    }

    // Must be the current assignee
    if (item.assigneeId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You have not claimed this item'
      })
    }

    // Reset item to unassigned
    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        assigneeId: null,
        assignmentMethod: null,
        assignedAt: null,
        isCompleted: false,
        completedById: null,
        completedAt: null,
        completionNote: null,
        verificationStatus: null,
        verificationNotes: null,
        rejectionReason: null,
        reminderSentAt: null,
        escalatedAt: null,
      },
      include: {
        task: { select: { id: true, name: true } }
      }
    })

    // Log to audit
    await prisma.auditLog.create({
      data: {
        bandId: item.task.band.id,
        actorId: userId,
        action: 'CHECKLIST_ITEM_UNCLAIMED',
        entityType: 'CHECKLIST_ITEM',
        entityId: itemId,
        entityName: item.description,
        changes: {
          taskId: item.taskId,
          taskName: item.task.name,
          reason
        }
      }
    })

    return { item: updatedItem }
  })

/**
 * Submit checklist item for verification (or mark complete if no verification required)
 */
export const submitChecklistForVerification = publicProcedure
  .input(z.object({
    itemId: z.string(),
    userId: z.string(),
    completionNote: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const { itemId, userId, completionNote } = input

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        deliverable: true,
        task: {
          include: {
            project: { select: { id: true, name: true } },
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

    // Check user is a band member
    const membership = item.task.band.members.find(m => m.userId === userId)
    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member to submit items'
      })
    }

    // Auto-assign if unassigned (user is claiming by submitting)
    if (!item.assigneeId) {
      await prisma.checklistItem.update({
        where: { id: itemId },
        data: {
          assigneeId: userId,
          assignmentMethod: 'CLAIMED',
          assignedAt: new Date(),
        }
      })
    } else if (item.assigneeId !== userId) {
      // Already assigned to someone else
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This item is assigned to someone else'
      })
    }

    // Check if deliverable is required
    if (item.requiresDeliverable) {
      if (!item.deliverable) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This checklist item requires a deliverable. Please fill in the deliverable form before submitting.'
        })
      }
      if (item.deliverable.summary.length < 30) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Deliverable summary must be at least 30 characters.'
        })
      }
    }

    // Check if verification is required
    if (!item.requiresVerification) {
      // No verification needed - just mark as complete
      const updatedItem = await prisma.checklistItem.update({
        where: { id: itemId },
        data: {
          isCompleted: true,
          completedById: userId,
          completedAt: new Date(),
          completionNote,
          verificationStatus: 'APPROVED', // Auto-approve
          verifiedAt: new Date(),
        },
        include: {
          task: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } }
        }
      })

      // Log to audit
      await prisma.auditLog.create({
        data: {
          bandId: item.task.band.id,
          actorId: userId,
          action: 'CHECKLIST_ITEM_COMPLETED',
          entityType: 'CHECKLIST_ITEM',
          entityId: itemId,
          entityName: item.description,
          changes: {
            taskId: item.taskId,
            requiresVerification: false
          }
        }
      })

      return { item: updatedItem, requiresVerification: false }
    }

    // Verification required - submit for review
    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        isCompleted: true,
        completedById: userId,
        completedAt: new Date(),
        completionNote,
        verificationStatus: 'PENDING',
        reminderSentAt: null,
        escalatedAt: null,
      },
      include: {
        task: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } }
      }
    })

    // Notify verifiers
    const verifiersToNotify = item.task.band.members
      .filter(m => CAN_VERIFY.includes(m.role) && m.userId !== userId)

    const notificationPromises = verifiersToNotify.map(v =>
      notificationService.create({
        userId: v.userId,
        type: 'CHECKLIST_VERIFICATION_NEEDED',
        title: 'Checklist Item Needs Verification',
        message: `"${item.description}" is ready for review`,
        relatedId: item.id,
        relatedType: 'checklist_item',
        actionUrl: `/bands/${item.task.band.slug}/tasks/${item.taskId}?checklist=${item.id}`,
        priority: 'MEDIUM',
        bandId: item.task.band.id,
      })
    )
    await Promise.all(notificationPromises)

    // Log to audit
    await prisma.auditLog.create({
      data: {
        bandId: item.task.band.id,
        actorId: userId,
        action: 'CHECKLIST_ITEM_SUBMITTED',
        entityType: 'CHECKLIST_ITEM',
        entityId: itemId,
        entityName: item.description,
        changes: {
          taskId: item.taskId,
          requiresVerification: true
        }
      }
    })

    return { item: updatedItem, requiresVerification: true }
  })

/**
 * Verify (approve or reject) a checklist item
 */
export const verifyChecklistItem = publicProcedure
  .input(z.object({
    itemId: z.string(),
    userId: z.string(),
    approved: z.boolean(),
    verificationNotes: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const { itemId, userId, approved, verificationNotes } = input

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        task: {
          include: {
            project: { select: { id: true, name: true } },
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

    // Check user can verify
    const member = item.task.band.members.find(m => m.userId === userId)
    if (!member || !CAN_VERIFY.includes(member.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to verify checklist items'
      })
    }

    // Item must be pending
    if (item.verificationStatus !== 'PENDING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Item must be pending verification'
      })
    }

    // Update item
    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        verificationStatus: approved ? 'APPROVED' : 'REJECTED',
        verifiedById: userId,
        verifiedAt: new Date(),
        verificationNotes,
        rejectionReason: approved ? null : verificationNotes,
        // If rejected, reset completion state
        isCompleted: approved,
        completedAt: approved ? item.completedAt : null,
        // Clear escalation tracking
        reminderSentAt: null,
        escalatedAt: null,
      },
      include: {
        task: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, name: true } }
      }
    })

    // Notify assignee
    if (item.assigneeId) {
      await notificationService.create({
        userId: item.assigneeId,
        type: approved ? 'CHECKLIST_VERIFIED' : 'CHECKLIST_REJECTED',
        title: approved ? 'Item Approved!' : 'Item Needs Revision',
        message: approved
          ? `Your item "${item.description}" has been approved`
          : `Your item "${item.description}" needs revision${verificationNotes ? `: ${verificationNotes}` : ''}`,
        relatedId: item.id,
        relatedType: 'checklist_item',
        actionUrl: `/bands/${item.task.band.slug}/tasks/${item.taskId}?checklist=${item.id}`,
        priority: approved ? 'LOW' : 'HIGH',
        bandId: item.task.band.id,
      })
    }

    // Log to audit
    await prisma.auditLog.create({
      data: {
        bandId: item.task.band.id,
        actorId: userId,
        action: approved ? 'CHECKLIST_ITEM_VERIFIED' : 'CHECKLIST_ITEM_REJECTED',
        entityType: 'CHECKLIST_ITEM',
        entityId: itemId,
        entityName: item.description,
        changes: {
          taskId: item.taskId,
          approved,
          verificationNotes
        }
      }
    })

    return { item: updatedItem }
  })

/**
 * Retry a rejected checklist item (resubmit for verification)
 */
export const retryChecklistItem = publicProcedure
  .input(z.object({
    itemId: z.string(),
    userId: z.string(),
    note: z.string().max(1000).optional(),
  }))
  .mutation(async ({ input }) => {
    const { itemId, userId, note } = input

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        task: {
          include: {
            project: { select: { id: true, name: true } },
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

    // Must be the assignee
    if (item.assigneeId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not assigned to this item' })
    }

    // Must be rejected
    if (item.verificationStatus !== 'REJECTED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Item was not rejected'
      })
    }

    // Resubmit for verification
    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completionNote: note || item.completionNote,
        verificationStatus: 'PENDING',
        rejectionReason: null,
        reminderSentAt: null,
        escalatedAt: null,
      },
      include: {
        task: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } }
      }
    })

    // Notify verifiers
    const verifiers = item.task.band.members
      .filter(m => CAN_VERIFY.includes(m.role) && m.userId !== userId)

    const notificationPromises = verifiers.map(v =>
      notificationService.create({
        userId: v.userId,
        type: 'CHECKLIST_VERIFICATION_NEEDED',
        title: 'Checklist Item Resubmitted',
        message: `"${item.description}" has been resubmitted for verification`,
        relatedId: item.id,
        relatedType: 'checklist_item',
        actionUrl: `/bands/${item.task.band.slug}/tasks/${item.taskId}?checklist=${item.id}`,
        priority: 'MEDIUM',
        bandId: item.task.band.id,
      })
    )
    await Promise.all(notificationPromises)

    // Log to audit
    await prisma.auditLog.create({
      data: {
        bandId: item.task.band.id,
        actorId: userId,
        action: 'CHECKLIST_ITEM_RETRIED',
        entityType: 'CHECKLIST_ITEM',
        entityId: itemId,
        entityName: item.description,
        changes: {
          taskId: item.taskId,
          note
        }
      }
    })

    return { item: updatedItem }
  })

/**
 * Update checklist item context (Conductor+)
 */
export const updateChecklistContext = publicProcedure
  .input(z.object({
    itemId: z.string(),
    userId: z.string(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    contextPhone: z.boolean().optional(),
    contextComputer: z.boolean().optional(),
    contextTravel: z.boolean().optional(),
    contextTimeMinutes: z.number().min(1).max(480).optional(),
    requiresVerification: z.boolean().optional(),
    minClaimRole: z.enum(['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER']).nullish(),
  }))
  .mutation(async ({ input }) => {
    const { itemId, userId, ...updates } = input

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
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

    if (!item) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
    }

    // Check role (Conductor+)
    const membership = item.task.band.members.find(m => m.userId === userId)
    const canEdit = membership && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(membership.role)

    if (!canEdit) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only Conductor or higher can edit checklist item settings'
      })
    }

    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: updates
    })

    return { item: updatedItem }
  })
