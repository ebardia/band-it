import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../services/notification.service'
import { emailService } from '../services/email.service'
import { clearModerationCache } from '../../services/content-moderation.service'
import { createDefaultChannel } from './channel'

// Helper to check if user is admin
async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })

  if (!user?.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }

  return user
}

export const adminRouter = router({
  /**
   * Get platform statistics for admin dashboard
   */
  getStats: publicProcedure.query(async () => {
    const [
      totalUsers,
      totalBands,
      activeProposals,
      openTasks,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.band.count(),
      prisma.proposal.count({
        where: { status: 'OPEN' },
      }),
      prisma.task.count({
        where: {
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
      }),
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    return {
      totalUsers,
      totalBands,
      activeProposals,
      openTasks,
      recentUsers,
    }
  }),

  /**
   * Get all users with pagination and search
   */
  getUsers: publicProcedure
    .input(
      z.object({
        userId: z.string(), // Admin user ID for auth check
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.userId)

      const where = input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' as const } },
              { email: { contains: input.search, mode: 'insensitive' as const } },
            ],
          }
        : {}

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
            emailVerified: true,
            createdAt: true,
            warningCount: true,
            suspendedUntil: true,
            suspensionReason: true,
            bannedAt: true,
            banReason: true,
            _count: {
              select: {
                memberships: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        prisma.user.count({ where }),
      ])

      return {
        users,
        total,
        pages: Math.ceil(total / input.limit),
      }
    }),

  /**
   * Get all bands with pagination and search
   */
  getBands: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.userId)

      const where = input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' as const } },
              { slug: { contains: input.search, mode: 'insensitive' as const } },
            ],
          }
        : {}

      const [bands, total] = await Promise.all([
        prisma.band.findMany({
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            billingStatus: true,
            createdAt: true,
            parentBandId: true,
            _count: {
              select: {
                members: true,
                proposals: true,
                projects: true,
                subBands: {
                  where: {
                    dissolvedAt: null,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        prisma.band.count({ where }),
      ])

      return {
        bands,
        total,
        pages: Math.ceil(total / input.limit),
      }
    }),

  /**
   * Toggle admin status for a user
   */
  setUserAdmin: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(), // The admin performing the action
        targetUserId: z.string(), // The user to modify
        isAdmin: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      // Prevent removing own admin status
      if (input.adminUserId === input.targetUserId && !input.isAdmin) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot remove your own admin status',
        })
      }

      const user = await prisma.user.update({
        where: { id: input.targetUserId },
        data: { isAdmin: input.isAdmin },
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
        },
      })

      return { user }
    }),

  /**
   * Warn a user - creates warning record and increments count
   */
  warnUser: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        targetUserId: z.string(),
        reason: z.string().min(1, 'Reason is required').max(1000),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      // Cannot warn admins
      const target = await prisma.user.findUnique({
        where: { id: input.targetUserId },
        select: { isAdmin: true, name: true, email: true, warningCount: true },
      })

      if (!target) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      if (target.isAdmin) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot warn an admin user',
        })
      }

      // Create warning record and increment count in a transaction
      const [warning, user] = await prisma.$transaction([
        prisma.warning.create({
          data: {
            userId: input.targetUserId,
            issuedById: input.adminUserId,
            reason: input.reason,
          },
        }),
        prisma.user.update({
          where: { id: input.targetUserId },
          data: {
            warningCount: { increment: 1 },
          },
          select: {
            id: true,
            name: true,
            email: true,
            warningCount: true,
          },
        }),
      ])

      // Send in-app notification
      await notificationService.create({
        userId: input.targetUserId,
        type: 'MODERATION_WARNING',
        title: 'You have received a warning',
        message: input.reason,
        priority: 'HIGH',
        actionUrl: '/user-dashboard/settings',
        relatedId: warning.id,
        relatedType: 'Warning',
      })

      // Send email
      await emailService.sendWarningEmail({
        email: user.email,
        userName: user.name,
        reason: input.reason,
        warningCount: user.warningCount,
      })

      return { user, warning }
    }),

  /**
   * Suspend a user for a specific duration
   */
  suspendUser: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        targetUserId: z.string(),
        days: z.number().min(1).max(365),
        reason: z.string().min(1, 'Reason is required').max(1000),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      // Cannot suspend admins
      const target = await prisma.user.findUnique({
        where: { id: input.targetUserId },
        select: { isAdmin: true, name: true, email: true },
      })

      if (!target) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      if (target.isAdmin) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot suspend an admin user',
        })
      }

      const suspendedUntil = new Date()
      suspendedUntil.setDate(suspendedUntil.getDate() + input.days)

      const user = await prisma.user.update({
        where: { id: input.targetUserId },
        data: {
          suspendedUntil,
          suspensionReason: input.reason,
        },
        select: {
          id: true,
          name: true,
          email: true,
          suspendedUntil: true,
          suspensionReason: true,
        },
      })

      // Send in-app notification
      await notificationService.create({
        userId: input.targetUserId,
        type: 'MODERATION_SUSPENSION',
        title: `Your account has been suspended for ${input.days} day${input.days > 1 ? 's' : ''}`,
        message: input.reason,
        priority: 'URGENT',
        actionUrl: '/user-dashboard/settings',
      })

      // Send email
      await emailService.sendSuspensionEmail({
        email: target.email,
        userName: target.name,
        reason: input.reason,
        suspendedUntil,
      })

      return { user }
    }),

  /**
   * Remove suspension from a user
   */
  unsuspendUser: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        targetUserId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const user = await prisma.user.update({
        where: { id: input.targetUserId },
        data: {
          suspendedUntil: null,
          suspensionReason: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          suspendedUntil: true,
        },
      })

      return { user }
    }),

  /**
   * Ban a user permanently
   */
  banUser: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        targetUserId: z.string(),
        reason: z.string().min(1, 'Reason is required').max(500),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      // Cannot ban admins
      const target = await prisma.user.findUnique({
        where: { id: input.targetUserId },
        select: { isAdmin: true, name: true, email: true },
      })

      if (!target) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      if (target.isAdmin) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot ban an admin user',
        })
      }

      const user = await prisma.user.update({
        where: { id: input.targetUserId },
        data: {
          bannedAt: new Date(),
          banReason: input.reason,
        },
        select: {
          id: true,
          name: true,
          email: true,
          bannedAt: true,
          banReason: true,
        },
      })

      // Send in-app notification (they won't see it, but it's logged)
      await notificationService.create({
        userId: input.targetUserId,
        type: 'MODERATION_BAN',
        title: 'Your account has been permanently banned',
        message: input.reason,
        priority: 'URGENT',
      })

      // Send email
      await emailService.sendBanEmail({
        email: target.email,
        userName: target.name,
        reason: input.reason,
      })

      return { user }
    }),

  /**
   * Unban a user
   */
  unbanUser: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        targetUserId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const user = await prisma.user.update({
        where: { id: input.targetUserId },
        data: {
          bannedAt: null,
          banReason: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          bannedAt: true,
          banReason: true,
        },
      })

      return { user }
    }),

  /**
   * Reset warning count for a user (also deletes warning records)
   */
  resetWarnings: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        targetUserId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      // Delete all warning records and reset count
      const [, user] = await prisma.$transaction([
        prisma.warning.deleteMany({
          where: { userId: input.targetUserId },
        }),
        prisma.user.update({
          where: { id: input.targetUserId },
          data: { warningCount: 0 },
          select: {
            id: true,
            name: true,
            email: true,
            warningCount: true,
          },
        }),
      ])

      return { user }
    }),

  /**
   * Get warnings for a specific user
   */
  getUserWarnings: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        targetUserId: z.string(),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const warnings = await prisma.warning.findMany({
        where: { userId: input.targetUserId },
        include: {
          issuedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return { warnings }
    }),

  // ============================================
  // BLOCKED TERMS MANAGEMENT
  // ============================================

  /**
   * Get all blocked terms
   */
  getBlockedTerms: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        search: z.string().optional(),
        category: z.string().optional(),
        severity: z.enum(['WARN', 'BLOCK']).optional(),
        activeOnly: z.boolean().default(true),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const where: any = {}

      if (input.activeOnly) {
        where.isActive = true
      }

      if (input.search) {
        where.term = { contains: input.search, mode: 'insensitive' }
      }

      if (input.category) {
        where.category = input.category
      }

      if (input.severity) {
        where.severity = input.severity
      }

      const terms = await prisma.blockedTerm.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Get unique categories for filtering
      const categories = await prisma.blockedTerm.findMany({
        where: { category: { not: null } },
        select: { category: true },
        distinct: ['category'],
      })

      return {
        terms,
        categories: categories.map(c => c.category).filter(Boolean) as string[],
      }
    }),

  /**
   * Add a new blocked term
   */
  addBlockedTerm: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        term: z.string().min(1).max(200),
        isRegex: z.boolean().default(false),
        severity: z.enum(['WARN', 'BLOCK']).default('WARN'),
        category: z.string().optional(),
        reason: z.string().max(500).optional(),
        confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('HIGH'),
        userAppealAllowed: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      // Validate regex if isRegex is true
      if (input.isRegex) {
        try {
          new RegExp(input.term, 'i')
        } catch (e) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid regex pattern',
          })
        }
      }

      // Check if term already exists
      const existing = await prisma.blockedTerm.findUnique({
        where: { term: input.term.toLowerCase() },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This term is already in the blocklist',
        })
      }

      const blockedTerm = await prisma.blockedTerm.create({
        data: {
          term: input.term.toLowerCase(),
          isRegex: input.isRegex,
          severity: input.severity,
          category: input.category || null,
          reason: input.reason || null,
          confidence: input.confidence,
          userAppealAllowed: input.userAppealAllowed,
          createdById: input.adminUserId,
        },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
      })

      // Clear cache so new term takes effect immediately
      clearModerationCache()

      return { blockedTerm }
    }),

  /**
   * Update a blocked term
   */
  updateBlockedTerm: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        termId: z.string(),
        term: z.string().min(1).max(200).optional(),
        isRegex: z.boolean().optional(),
        severity: z.enum(['WARN', 'BLOCK']).optional(),
        category: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        reason: z.string().max(500).nullable().optional(),
        confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
        userAppealAllowed: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const { adminUserId, termId, ...updateData } = input

      // Validate regex if updating to regex
      if (updateData.isRegex && updateData.term) {
        try {
          new RegExp(updateData.term, 'i')
        } catch (e) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid regex pattern',
          })
        }
      }

      // If updating term, check for duplicates
      if (updateData.term) {
        const existing = await prisma.blockedTerm.findFirst({
          where: {
            term: updateData.term.toLowerCase(),
            id: { not: termId },
          },
        })

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This term is already in the blocklist',
          })
        }

        updateData.term = updateData.term.toLowerCase()
      }

      const blockedTerm = await prisma.blockedTerm.update({
        where: { id: termId },
        data: updateData,
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
      })

      // Clear cache so changes take effect immediately
      clearModerationCache()

      return { blockedTerm }
    }),

  /**
   * Delete a blocked term
   */
  deleteBlockedTerm: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        termId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      await prisma.blockedTerm.delete({
        where: { id: input.termId },
      })

      // Clear cache so deletion takes effect immediately
      clearModerationCache()

      return { success: true }
    }),

  /**
   * Bulk add blocked terms
   */
  bulkAddBlockedTerms: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        terms: z.array(z.string().min(1).max(200)),
        severity: z.enum(['WARN', 'BLOCK']).default('WARN'),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const uniqueTerms = [...new Set(input.terms.map(t => t.toLowerCase()))]

      // Get existing terms to avoid duplicates
      const existing = await prisma.blockedTerm.findMany({
        where: { term: { in: uniqueTerms } },
        select: { term: true },
      })

      const existingSet = new Set(existing.map(e => e.term))
      const newTerms = uniqueTerms.filter(t => !existingSet.has(t))

      if (newTerms.length === 0) {
        return { added: 0, skipped: uniqueTerms.length }
      }

      await prisma.blockedTerm.createMany({
        data: newTerms.map(term => ({
          term,
          severity: input.severity,
          category: input.category || null,
          createdById: input.adminUserId,
        })),
      })

      // Clear cache so new terms take effect immediately
      clearModerationCache()

      return {
        added: newTerms.length,
        skipped: uniqueTerms.length - newTerms.length,
      }
    }),

  // ============================================
  // FAQ MANAGEMENT
  // ============================================

  /**
   * Get all FAQ entries for admin management
   */
  getFaqEntries: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        search: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const where: any = {}

      if (input.search) {
        where.OR = [
          { question: { contains: input.search, mode: 'insensitive' } },
          { answer: { contains: input.search, mode: 'insensitive' } },
        ]
      }

      if (input.category) {
        where.category = input.category
      }

      const entries = await prisma.faqEntry.findMany({
        where,
        orderBy: [
          { category: 'asc' },
          { sortOrder: 'asc' },
        ],
      })

      // Get unique categories
      const categories = await prisma.faqEntry.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      })

      return {
        entries,
        categories: categories.map(c => c.category),
      }
    }),

  /**
   * Create a new FAQ entry
   */
  createFaqEntry: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        category: z.string().min(1),
        question: z.string().min(1).max(500),
        answer: z.string().min(1).max(5000),
        keywords: z.array(z.string()),
        relatedPages: z.array(z.string()).default([]),
        sortOrder: z.number().int().default(1),
        isPublished: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const { adminUserId, ...data } = input

      const entry = await prisma.faqEntry.create({
        data,
      })

      return { entry }
    }),

  /**
   * Update an existing FAQ entry
   */
  updateFaqEntry: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        entryId: z.string(),
        category: z.string().min(1).optional(),
        question: z.string().min(1).max(500).optional(),
        answer: z.string().min(1).max(5000).optional(),
        keywords: z.array(z.string()).optional(),
        relatedPages: z.array(z.string()).optional(),
        sortOrder: z.number().int().optional(),
        isPublished: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const { adminUserId, entryId, ...updateData } = input

      const entry = await prisma.faqEntry.update({
        where: { id: entryId },
        data: updateData,
      })

      return { entry }
    }),

  /**
   * Delete a FAQ entry
   */
  deleteFaqEntry: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        entryId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      await prisma.faqEntry.delete({
        where: { id: input.entryId },
      })

      return { success: true }
    }),

  // ============================================
  // FLAGGED CONTENT MODERATION QUEUE
  // ============================================

  /**
   * Get flagged content for moderation queue
   */
  getFlaggedContent: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        status: z.enum(['PENDING', 'APPROVED', 'REMOVED', 'WARNED']).optional(),
        contentType: z.enum(['PROPOSAL', 'COMMENT', 'TASK']).optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const where: any = {}

      if (input.status) {
        where.status = input.status
      }

      if (input.contentType) {
        where.contentType = input.contentType
      }

      const [items, total] = await Promise.all([
        prisma.flaggedContent.findMany({
          where,
          include: {
            author: {
              select: { id: true, name: true, email: true, warningCount: true },
            },
            reviewedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        prisma.flaggedContent.count({ where }),
      ])

      return {
        items,
        total,
        pages: Math.ceil(total / input.limit),
      }
    }),

  /**
   * Get statistics for moderation queue
   */
  getFlaggedContentStats: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const [pending, approved, removed, warned, byType] = await Promise.all([
        prisma.flaggedContent.count({ where: { status: 'PENDING' } }),
        prisma.flaggedContent.count({ where: { status: 'APPROVED' } }),
        prisma.flaggedContent.count({ where: { status: 'REMOVED' } }),
        prisma.flaggedContent.count({ where: { status: 'WARNED' } }),
        prisma.flaggedContent.groupBy({
          by: ['contentType'],
          where: { status: 'PENDING' },
          _count: true,
        }),
      ])

      return {
        pending,
        approved,
        removed,
        warned,
        total: pending + approved + removed + warned,
        byType: byType.reduce((acc, item) => {
          acc[item.contentType] = item._count
          return acc
        }, {} as Record<string, number>),
      }
    }),

  /**
   * Review flagged content and take action
   */
  reviewFlaggedContent: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        flaggedContentId: z.string(),
        action: z.enum(['DISMISS', 'REMOVE', 'WARN_USER', 'SUSPEND_USER', 'BAN_USER']),
        reviewNotes: z.string().optional(),
        suspensionDays: z.number().optional(), // Required if action is SUSPEND_USER
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const flaggedContent = await prisma.flaggedContent.findUnique({
        where: { id: input.flaggedContentId },
        include: {
          author: {
            select: { id: true, name: true, email: true, isAdmin: true },
          },
        },
      })

      if (!flaggedContent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Flagged content not found',
        })
      }

      if (flaggedContent.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This content has already been reviewed',
        })
      }

      // Determine status based on action
      let status: 'APPROVED' | 'REMOVED' | 'WARNED' = 'APPROVED'
      if (input.action === 'REMOVE') {
        status = 'REMOVED'
      } else if (input.action === 'WARN_USER' || input.action === 'SUSPEND_USER' || input.action === 'BAN_USER') {
        status = 'WARNED'
      }

      // Update flagged content record
      const updated = await prisma.flaggedContent.update({
        where: { id: input.flaggedContentId },
        data: {
          status,
          actionTaken: input.action,
          reviewedById: input.adminUserId,
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes,
        },
      })

      // Handle content removal
      if (input.action === 'REMOVE') {
        // Delete the original content based on type
        if (flaggedContent.contentType === 'COMMENT') {
          await prisma.comment.update({
            where: { id: flaggedContent.contentId },
            data: { deletedAt: new Date() },
          })
        } else if (flaggedContent.contentType === 'PROPOSAL') {
          // For proposals, we might want to close it or mark it differently
          // For now, just update it to indicate it was removed
          await prisma.proposal.update({
            where: { id: flaggedContent.contentId },
            data: { status: 'CLOSED' },
          })
        } else if (flaggedContent.contentType === 'TASK') {
          // Delete the task
          await prisma.task.delete({
            where: { id: flaggedContent.contentId },
          })
        }
      }

      // Handle user actions (warn, suspend, ban)
      if (input.action === 'WARN_USER' && !flaggedContent.author.isAdmin) {
        // Create warning
        const warning = await prisma.warning.create({
          data: {
            userId: flaggedContent.authorId,
            issuedById: input.adminUserId,
            reason: input.reviewNotes || `Content flagged for: ${flaggedContent.matchedTerms.join(', ')}`,
          },
        })

        await prisma.user.update({
          where: { id: flaggedContent.authorId },
          data: { warningCount: { increment: 1 } },
        })

        await notificationService.create({
          userId: flaggedContent.authorId,
          type: 'MODERATION_WARNING',
          title: 'You have received a warning',
          message: input.reviewNotes || `Your content was flagged for review: ${flaggedContent.matchedTerms.join(', ')}`,
          priority: 'HIGH',
          actionUrl: '/user-dashboard/settings',
          relatedId: warning.id,
          relatedType: 'Warning',
        })

        await emailService.sendWarningEmail({
          email: flaggedContent.author.email,
          userName: flaggedContent.author.name,
          reason: input.reviewNotes || `Your content was flagged for review: ${flaggedContent.matchedTerms.join(', ')}`,
          warningCount: (await prisma.user.findUnique({ where: { id: flaggedContent.authorId }, select: { warningCount: true } }))?.warningCount || 1,
        })
      }

      if (input.action === 'SUSPEND_USER' && !flaggedContent.author.isAdmin) {
        const days = input.suspensionDays || 7
        const suspendedUntil = new Date()
        suspendedUntil.setDate(suspendedUntil.getDate() + days)

        await prisma.user.update({
          where: { id: flaggedContent.authorId },
          data: {
            suspendedUntil,
            suspensionReason: input.reviewNotes || `Content flagged for: ${flaggedContent.matchedTerms.join(', ')}`,
          },
        })

        await notificationService.create({
          userId: flaggedContent.authorId,
          type: 'MODERATION_SUSPENSION',
          title: `Your account has been suspended for ${days} day${days > 1 ? 's' : ''}`,
          message: input.reviewNotes || `Your content was flagged for review: ${flaggedContent.matchedTerms.join(', ')}`,
          priority: 'URGENT',
          actionUrl: '/user-dashboard/settings',
        })

        await emailService.sendSuspensionEmail({
          email: flaggedContent.author.email,
          userName: flaggedContent.author.name,
          reason: input.reviewNotes || `Your content was flagged for review: ${flaggedContent.matchedTerms.join(', ')}`,
          suspendedUntil,
        })
      }

      if (input.action === 'BAN_USER' && !flaggedContent.author.isAdmin) {
        await prisma.user.update({
          where: { id: flaggedContent.authorId },
          data: {
            bannedAt: new Date(),
            banReason: input.reviewNotes || `Content flagged for: ${flaggedContent.matchedTerms.join(', ')}`,
          },
        })

        await notificationService.create({
          userId: flaggedContent.authorId,
          type: 'MODERATION_BAN',
          title: 'Your account has been permanently banned',
          message: input.reviewNotes || `Your content violated our policies: ${flaggedContent.matchedTerms.join(', ')}`,
          priority: 'URGENT',
        })

        await emailService.sendBanEmail({
          email: flaggedContent.author.email,
          userName: flaggedContent.author.name,
          reason: input.reviewNotes || `Your content violated our policies: ${flaggedContent.matchedTerms.join(', ')}`,
        })
      }

      return { success: true, flaggedContent: updated }
    }),

  /**
   * Bulk review flagged content (dismiss multiple)
   */
  bulkDismissFlaggedContent: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        flaggedContentIds: z.array(z.string()),
        reviewNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const updated = await prisma.flaggedContent.updateMany({
        where: {
          id: { in: input.flaggedContentIds },
          status: 'PENDING',
        },
        data: {
          status: 'APPROVED',
          actionTaken: 'DISMISS',
          reviewedById: input.adminUserId,
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes || 'Bulk dismissed',
        },
      })

      return { dismissed: updated.count }
    }),

  // ============================================
  // USER APPEALS
  // ============================================

  /**
   * Submit an appeal for flagged content (user endpoint)
   */
  submitAppeal: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        flaggedContentId: z.string(),
        appealReason: z.string().min(10, 'Please provide a detailed reason for your appeal').max(1000),
      })
    )
    .mutation(async ({ input }) => {
      const flaggedContent = await prisma.flaggedContent.findUnique({
        where: { id: input.flaggedContentId },
      })

      if (!flaggedContent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Flagged content not found',
        })
      }

      // Verify the user is the author
      if (flaggedContent.authorId !== input.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only appeal your own content',
        })
      }

      // Check if appeals are allowed
      if (!flaggedContent.canAppeal) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Appeals are not allowed for this type of content violation',
        })
      }

      // Check if already appealed
      if (flaggedContent.appealStatus !== 'NONE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You have already submitted an appeal for this content',
        })
      }

      const updated = await prisma.flaggedContent.update({
        where: { id: input.flaggedContentId },
        data: {
          appealStatus: 'PENDING',
          appealReason: input.appealReason,
          appealedAt: new Date(),
        },
      })

      return { success: true, flaggedContent: updated }
    }),

  /**
   * Get appeals pending review (admin endpoint)
   */
  getPendingAppeals: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const [items, total] = await Promise.all([
        prisma.flaggedContent.findMany({
          where: { appealStatus: 'PENDING' },
          include: {
            author: {
              select: { id: true, name: true, email: true, warningCount: true },
            },
            reviewedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { appealedAt: 'asc' }, // Oldest first
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        prisma.flaggedContent.count({ where: { appealStatus: 'PENDING' } }),
      ])

      return {
        items,
        total,
        pages: Math.ceil(total / input.limit),
      }
    }),

  /**
   * Review an appeal (admin endpoint)
   */
  reviewAppeal: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        flaggedContentId: z.string(),
        decision: z.enum(['APPROVED', 'DENIED']),
        reviewNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const flaggedContent = await prisma.flaggedContent.findUnique({
        where: { id: input.flaggedContentId },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      if (!flaggedContent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Flagged content not found',
        })
      }

      if (flaggedContent.appealStatus !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This appeal has already been reviewed',
        })
      }

      // Update the appeal status
      const updated = await prisma.flaggedContent.update({
        where: { id: input.flaggedContentId },
        data: {
          appealStatus: input.decision,
          appealReviewedById: input.adminUserId,
          appealReviewedAt: new Date(),
          appealReviewNotes: input.reviewNotes,
          // If appeal is approved, update the main status to APPROVED
          ...(input.decision === 'APPROVED' && {
            status: 'APPROVED',
            actionTaken: 'DISMISS',
          }),
        },
      })

      // Notify the user about the appeal decision
      await notificationService.create({
        userId: flaggedContent.authorId,
        type: 'MODERATION_WARNING', // Reusing existing type
        title: input.decision === 'APPROVED'
          ? 'Your appeal was approved'
          : 'Your appeal was denied',
        message: input.reviewNotes || (
          input.decision === 'APPROVED'
            ? 'Your content has been restored.'
            : 'Your appeal has been reviewed and denied.'
        ),
        priority: 'MEDIUM',
        actionUrl: '/user-dashboard/settings',
      })

      return { success: true, flaggedContent: updated }
    }),

  /**
   * Get user's flagged content with appeal status
   */
  getUserFlaggedContent: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const items = await prisma.flaggedContent.findMany({
        where: { authorId: input.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      return { items }
    }),

  // ============================================
  // BIG BAND MANAGEMENT
  // ============================================

  /**
   * Search users for founder selection when creating a Big Band
   */
  searchUsersForFounder: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        search: z.string().min(2, 'Search term must be at least 2 characters'),
      })
    )
    .query(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: input.search, mode: 'insensitive' } },
            { email: { contains: input.search, mode: 'insensitive' } },
          ],
          // Exclude banned or deleted users
          bannedAt: null,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
        },
        orderBy: { name: 'asc' },
        take: 10,
      })

      return { users }
    }),

  /**
   * Create a Big Band with an assigned founder
   */
  createBigBand: publicProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        founderId: z.string(),
        name: z.string().min(2, 'Band name must be at least 2 characters'),
        description: z.string().min(10, 'Description must be at least 10 characters'),
        mission: z.string().min(10, 'Mission must be at least 10 characters'),
        values: z.string().min(1, 'Please enter at least one value'),
        membershipRequirements: z.string().min(10, 'Please describe membership requirements'),
        zipcode: z.string().min(3).max(10).optional(),
        imageUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await requireAdmin(input.adminUserId)

      // Verify founder exists and is not banned
      const founder = await prisma.user.findUnique({
        where: { id: input.founderId },
        select: { id: true, name: true, bannedAt: true, deletedAt: true },
      })

      if (!founder) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Founder user not found',
        })
      }

      if (founder.bannedAt || founder.deletedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot assign a banned or deleted user as founder',
        })
      }

      // Generate unique slug
      let baseSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      let slug = baseSlug
      let counter = 1

      while (await prisma.band.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      // Convert comma-separated values to array
      const valuesArray = input.values.split(',').map(v => v.trim()).filter(Boolean)

      // Create the Big Band
      const band = await prisma.band.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          mission: input.mission,
          values: valuesArray,
          skillsLookingFor: [],
          whatMembersWillLearn: [],
          membershipRequirements: input.membershipRequirements,
          whoCanApprove: ['FOUNDER', 'GOVERNOR'],
          whoCanCreateProposals: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'],
          zipcode: input.zipcode || null,
          imageUrl: input.imageUrl || null,
          createdById: input.founderId,
          parentBandId: null, // Big Band has no parent
          status: 'ACTIVE', // Big Bands start active immediately
          activatedAt: new Date(),
        },
      })

      // Add founder as ACTIVE member with FOUNDER role
      await prisma.member.create({
        data: {
          userId: input.founderId,
          bandId: band.id,
          role: 'FOUNDER',
          status: 'ACTIVE',
        },
      })

      // Create the default General channel for discussions
      await createDefaultChannel(band.id, input.founderId)

      // Create audit log
      await prisma.auditLog.create({
        data: {
          bandId: band.id,
          action: 'created',
          entityType: 'Band',
          entityId: band.id,
          entityName: band.name,
          actorId: input.adminUserId,
          actorType: 'user',
          changes: {
            type: 'big_band',
            founderId: input.founderId,
            founderName: founder.name,
          },
        },
      })

      return { band }
    }),
})
