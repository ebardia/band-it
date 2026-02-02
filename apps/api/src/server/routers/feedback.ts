import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { ADMIN_CONFIG } from '@band-it/shared'
import { emailService } from '../services/email.service'

// Rate limiting: track submissions per user
const submissionTracker = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 5 // max 5 submissions per hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const timestamps = submissionTracker.get(userId) || []

  // Remove old timestamps outside the window
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW)

  if (recentTimestamps.length >= RATE_LIMIT_MAX) {
    return false
  }

  recentTimestamps.push(now)
  submissionTracker.set(userId, recentTimestamps)
  return true
}

export const feedbackRouter = router({
  // List all feedback with filtering, pagination, and sorting
  list: publicProcedure
    .input(z.object({
      category: z.enum(['BUG', 'FEATURE', 'COMMENT']).optional(),
      status: z.enum(['OPEN', 'IN_PROGRESS', 'FIXED', 'WONT_FIX', 'DUPLICATE']).optional(),
      search: z.string().optional(),
      sortBy: z.enum(['newest', 'oldest', 'most_votes']).default('newest'),
      mySubmissions: z.boolean().optional(),
      userId: z.string(),
      limit: z.number().min(1).max(50).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const where: any = {}

      if (input.category) {
        where.category = input.category
      }

      if (input.status) {
        where.status = input.status
      }

      if (input.mySubmissions) {
        where.submittedById = input.userId
      }

      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: 'insensitive' } },
          { description: { contains: input.search, mode: 'insensitive' } },
        ]
      }

      const orderBy =
        input.sortBy === 'most_votes' ? { voteCount: 'desc' as const } :
        input.sortBy === 'oldest' ? { createdAt: 'asc' as const } :
        { createdAt: 'desc' as const }

      const items = await prisma.feedback.findMany({
        where,
        orderBy,
        take: input.limit + 1, // Fetch one extra to determine if there are more
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0, // Skip cursor item
        include: {
          submittedBy: { select: { id: true, name: true } },
          respondedBy: { select: { id: true, name: true } },
          attachments: {
            where: { deletedAt: null },
            select: {
              id: true,
              filename: true,
              originalName: true,
              url: true,
              mimeType: true,
              size: true,
            },
          },
          duplicateOf: { select: { id: true, title: true } },
          votes: {
            where: { userId: input.userId },
            select: { id: true },
          },
        },
      })

      const hasMore = items.length > input.limit
      const results = hasMore ? items.slice(0, -1) : items
      const nextCursor = hasMore ? results[results.length - 1]?.id : undefined

      return {
        items: results.map(item => ({
          ...item,
          hasVoted: item.votes.length > 0,
          votes: undefined, // Remove votes array, just use hasVoted
        })),
        nextCursor,
      }
    }),

  // Get single feedback item
  get: publicProcedure
    .input(z.object({
      feedbackId: z.string(),
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      const item = await prisma.feedback.findUnique({
        where: { id: input.feedbackId },
        include: {
          submittedBy: { select: { id: true, name: true, email: true } },
          respondedBy: { select: { id: true, name: true } },
          attachments: {
            where: { deletedAt: null },
            select: {
              id: true,
              filename: true,
              originalName: true,
              url: true,
              mimeType: true,
              size: true,
            },
          },
          duplicateOf: { select: { id: true, title: true } },
          duplicates: { select: { id: true, title: true } },
          votes: {
            where: { userId: input.userId },
            select: { id: true },
          },
        },
      })

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Feedback not found' })
      }

      return {
        ...item,
        hasVoted: item.votes.length > 0,
        votes: undefined,
      }
    }),

  // Submit new feedback
  submit: publicProcedure
    .input(z.object({
      category: z.enum(['BUG', 'FEATURE', 'COMMENT']),
      title: z.string().min(5, 'Title must be at least 5 characters').max(200),
      description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
      userId: z.string(),
      attachmentIds: z.array(z.string()).max(5).optional(),
    }))
    .mutation(async ({ input }) => {
      // Check rate limit
      if (!checkRateLimit(input.userId)) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'You can only submit 5 feedback items per hour. Please try again later.',
        })
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, name: true, email: true },
      })

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      // Create feedback
      const feedback = await prisma.feedback.create({
        data: {
          category: input.category,
          title: input.title,
          description: input.description,
          submittedById: input.userId,
          status: 'OPEN',
        },
      })

      // Link attachments if provided
      if (input.attachmentIds && input.attachmentIds.length > 0) {
        await prisma.file.updateMany({
          where: {
            id: { in: input.attachmentIds },
            uploadedById: input.userId,
            feedbackId: null, // Only link files not already linked
          },
          data: {
            feedbackId: feedback.id,
          },
        })
      }

      // Notify admin(s) via email
      const categoryEmoji = input.category === 'BUG' ? '🐛' : input.category === 'FEATURE' ? '💡' : '💬'

      for (const adminEmail of ADMIN_CONFIG.emails) {
        try {
          await emailService.sendEmail({
            to: adminEmail,
            subject: `[Band It Feedback] ${categoryEmoji} ${input.category}: ${input.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #374151;">New Feedback Submitted</h2>

                <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Category:</strong> ${categoryEmoji} ${input.category}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Title:</strong> ${input.title}</p>
                  <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${user.name} (${user.email})</p>
                </div>

                <h3 style="color: #374151;">Description:</h3>
                <div style="background-color: #F9FAFB; padding: 15px; border-radius: 8px; border: 1px solid #E5E7EB;">
                  <p style="margin: 0; white-space: pre-wrap;">${input.description}</p>
                </div>

                <div style="margin-top: 30px;">
                  <a href="${process.env.FRONTEND_URL}/feedback?id=${feedback.id}"
                     style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                    View Feedback
                  </a>
                </div>
              </div>
            `,
          })
        } catch (error) {
          console.error(`Failed to send admin notification to ${adminEmail}:`, error)
        }
      }

      return feedback
    }),

  // Update own feedback (while OPEN status)
  update: publicProcedure
    .input(z.object({
      feedbackId: z.string(),
      title: z.string().min(5).max(200).optional(),
      description: z.string().min(10).max(5000).optional(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const feedback = await prisma.feedback.findUnique({
        where: { id: input.feedbackId },
      })

      if (!feedback) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Feedback not found' })
      }

      if (feedback.submittedById !== input.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only edit your own feedback' })
      }

      if (feedback.status !== 'OPEN') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You can only edit feedback while it is still open' })
      }

      const updated = await prisma.feedback.update({
        where: { id: input.feedbackId },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.description && { description: input.description }),
        },
      })

      return updated
    }),

  // Delete own feedback (while OPEN status)
  deleteOwn: publicProcedure
    .input(z.object({
      feedbackId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const feedback = await prisma.feedback.findUnique({
        where: { id: input.feedbackId },
      })

      if (!feedback) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Feedback not found' })
      }

      if (feedback.submittedById !== input.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only delete your own feedback' })
      }

      if (feedback.status !== 'OPEN') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You can only delete feedback while it is still open' })
      }

      await prisma.feedback.delete({
        where: { id: input.feedbackId },
      })

      return { success: true }
    }),

  // Vote/unvote toggle
  vote: publicProcedure
    .input(z.object({
      feedbackId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const feedback = await prisma.feedback.findUnique({
        where: { id: input.feedbackId },
      })

      if (!feedback) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Feedback not found' })
      }

      // Use transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.feedbackVote.findUnique({
          where: {
            feedbackId_userId: {
              feedbackId: input.feedbackId,
              userId: input.userId,
            },
          },
        })

        if (existing) {
          // Unvote
          await tx.feedbackVote.delete({
            where: { id: existing.id },
          })

          await tx.feedback.update({
            where: { id: input.feedbackId },
            data: { voteCount: { decrement: 1 } },
          })

          return { voted: false }
        } else {
          // Vote
          await tx.feedbackVote.create({
            data: {
              feedbackId: input.feedbackId,
              userId: input.userId,
            },
          })

          await tx.feedback.update({
            where: { id: input.feedbackId },
            data: { voteCount: { increment: 1 } },
          })

          return { voted: true }
        }
      })

      return result
    }),

  // ========== ADMIN ONLY PROCEDURES ==========

  // Update status (admin only)
  updateStatus: publicProcedure
    .input(z.object({
      feedbackId: z.string(),
      status: z.enum(['OPEN', 'IN_PROGRESS', 'FIXED', 'WONT_FIX', 'DUPLICATE']),
      duplicateOfId: z.string().optional(),
      userEmail: z.string(),
    }))
    .mutation(async ({ input }) => {
      if (!ADMIN_CONFIG.isAdmin(input.userEmail)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
      }

      if (input.status === 'DUPLICATE' && !input.duplicateOfId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Duplicate status requires the original feedback ID' })
      }

      await prisma.feedback.update({
        where: { id: input.feedbackId },
        data: {
          status: input.status,
          duplicateOfId: input.status === 'DUPLICATE' ? input.duplicateOfId : null,
        },
      })

      return { success: true }
    }),

  // Add/update admin response (admin only)
  respond: publicProcedure
    .input(z.object({
      feedbackId: z.string(),
      response: z.string().min(1).max(2000),
      userId: z.string(),
      userEmail: z.string(),
    }))
    .mutation(async ({ input }) => {
      if (!ADMIN_CONFIG.isAdmin(input.userEmail)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
      }

      await prisma.feedback.update({
        where: { id: input.feedbackId },
        data: {
          adminResponse: input.response,
          respondedById: input.userId,
          respondedAt: new Date(),
        },
      })

      return { success: true }
    }),

  // Delete feedback (admin only)
  delete: publicProcedure
    .input(z.object({
      feedbackId: z.string(),
      userEmail: z.string(),
    }))
    .mutation(async ({ input }) => {
      if (!ADMIN_CONFIG.isAdmin(input.userEmail)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
      }

      await prisma.feedback.delete({
        where: { id: input.feedbackId },
      })

      return { success: true }
    }),

  // Search for duplicate candidates (admin only)
  searchDuplicates: publicProcedure
    .input(z.object({
      search: z.string(),
      excludeId: z.string(),
      userEmail: z.string(),
    }))
    .query(async ({ input }) => {
      if (!ADMIN_CONFIG.isAdmin(input.userEmail)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
      }

      const items = await prisma.feedback.findMany({
        where: {
          id: { not: input.excludeId },
          OR: [
            { title: { contains: input.search, mode: 'insensitive' } },
            { description: { contains: input.search, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return items
    }),
})
