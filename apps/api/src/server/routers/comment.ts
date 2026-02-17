import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../services/notification.service'
import { checkContent, saveFlaggedContent } from '../../services/content-moderation.service'
import { requireGoodStanding } from '../../lib/dues-enforcement'

export const commentRouter = router({
  // Get comments for an entity
  getByEntity: publicProcedure
    .input(z.object({
      bandId: z.string().optional(),
      proposalId: z.string().optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { bandId, proposalId, projectId, taskId } = input

      const where: any = {
        deletedAt: null,
        parentId: null, // Only top-level comments
      }

      if (bandId) where.bandId = bandId
      if (proposalId) where.proposalId = proposalId
      if (projectId) where.projectId = projectId
      if (taskId) where.taskId = taskId

      const comments = await prisma.comment.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          replies: {
            where: { deletedAt: null },
            include: {
              author: {
                select: { id: true, name: true, email: true }
              },
              reactions: {
                include: {
                  user: { select: { id: true, name: true } }
                }
              },
              mentions: {
                include: {
                  user: { select: { id: true, name: true } }
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          reactions: {
            include: {
              user: { select: { id: true, name: true } }
            }
          },
          mentions: {
            include: {
              user: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return { comments }
    }),

  // Create a comment
  create: publicProcedure
    .input(z.object({
      content: z.string().min(1, 'Comment cannot be empty'),
      authorId: z.string(),
      parentId: z.string().optional(),
      bandId: z.string().optional(),
      proposalId: z.string().optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
      mentionedUserIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const {
        content, authorId, parentId,
        bandId, proposalId, projectId, taskId,
        mentionedUserIds
      } = input

      // Check content against blocked terms
      const moderationResult = await checkContent(content)

      // If blocked, throw error
      if (!moderationResult.allowed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Your comment contains prohibited content and cannot be posted. Please review and revise.',
        })
      }

      // Verify author exists
      const author = await prisma.user.findUnique({ where: { id: authorId } })
      if (!author) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      // Check dues standing - resolve bandId from input
      let enforcementBandId: string | undefined = bandId
      if (!enforcementBandId && proposalId) {
        const proposal = await prisma.proposal.findUnique({ where: { id: proposalId }, select: { bandId: true } })
        enforcementBandId = proposal?.bandId
      }
      if (!enforcementBandId && projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId }, select: { bandId: true } })
        enforcementBandId = project?.bandId
      }
      if (!enforcementBandId && taskId) {
        const task = await prisma.task.findUnique({ where: { id: taskId }, select: { bandId: true } })
        enforcementBandId = task?.bandId
      }
      if (enforcementBandId) {
        await requireGoodStanding(enforcementBandId, authorId)
      }

      // If reply, verify parent exists
      if (parentId) {
        const parent = await prisma.comment.findUnique({ where: { id: parentId } })
        if (!parent || parent.deletedAt) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent comment not found' })
        }
      }

      // Create comment
      const comment = await prisma.comment.create({
        data: {
          content,
          authorId,
          parentId,
          bandId,
          proposalId,
          projectId,
          taskId,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          replies: {
            include: {
              author: { select: { id: true, name: true, email: true, deletedAt: true } }
            }
          },
          reactions: true,
          mentions: true,
        }
      })

      // If content was flagged (WARN), save for admin review
      if (moderationResult.flagged) {
        await saveFlaggedContent(
          moderationResult,
          {
            contentType: 'COMMENT',
            contentId: comment.id,
            authorId,
            contentText: content,
          }
        )
      }

      // Notify parent comment author if this is a reply
      if (parentId) {
        const parentComment = await prisma.comment.findUnique({
          where: { id: parentId },
          select: { authorId: true },
        })

        if (parentComment && parentComment.authorId !== authorId) {
          // Get entity info for actionUrl
          let actionUrl = '/'
          let resolvedBandId: string | undefined = enforcementBandId

          if (proposalId) {
            const proposal = await prisma.proposal.findUnique({
              where: { id: proposalId },
              include: { band: true }
            })
            if (proposal) {
              actionUrl = `/bands/${proposal.band.slug}/proposals/${proposal.id}`
              resolvedBandId = proposal.bandId
            }
          } else if (projectId) {
            const project = await prisma.project.findUnique({
              where: { id: projectId },
              include: { band: true }
            })
            if (project) {
              actionUrl = `/bands/${project.band.slug}/projects/${project.id}`
              resolvedBandId = project.bandId
            }
          } else if (taskId) {
            const task = await prisma.task.findUnique({
              where: { id: taskId },
              include: { band: true }
            })
            if (task) {
              actionUrl = `/bands/${task.band.slug}/tasks/${task.id}`
              resolvedBandId = task.bandId
            }
          }

          notificationService.create({
            userId: parentComment.authorId,
            type: 'COMMENT_REPLY_RECEIVED',
            title: `${author.name} replied to your comment`,
            message: content.length > 100 ? content.substring(0, 100) + '...' : content,
            actionUrl,
            relatedId: comment.id,
            relatedType: 'COMMENT',
            bandId: resolvedBandId,
            metadata: {
              replierName: author.name,
            },
          }).catch(err => console.error('Error creating comment reply notification:', err))
        }
      }

      // Create mentions and notify users
      if (mentionedUserIds && mentionedUserIds.length > 0) {
        const mentionPromises = mentionedUserIds.map(async (userId) => {
          // Create mention record
          await prisma.mention.create({
            data: {
              userId,
              commentId: comment.id,
            }
          })

          // Get entity info for notification
          let entityName = 'a discussion'
          let actionUrl = '/'

          if (bandId) {
            const band = await prisma.band.findUnique({ where: { id: bandId } })
            if (band) {
              entityName = `band "${band.name}"`
              actionUrl = `/bands/${band.slug}`
            }
          } else if (proposalId) {
            const proposal = await prisma.proposal.findUnique({ 
              where: { id: proposalId },
              include: { band: true }
            })
            if (proposal) {
              entityName = `proposal "${proposal.title}"`
              actionUrl = `/bands/${proposal.band.slug}/proposals/${proposal.id}`
            }
          } else if (projectId) {
            const project = await prisma.project.findUnique({ 
              where: { id: projectId },
              include: { band: true }
            })
            if (project) {
              entityName = `project "${project.name}"`
              actionUrl = `/bands/${project.band.slug}/projects/${project.id}`
            }
          } else if (taskId) {
            const task = await prisma.task.findUnique({ 
              where: { id: taskId },
              include: { band: true, project: true }
            })
            if (task) {
              entityName = `task "${task.name}"`
              actionUrl = `/bands/${task.band.slug}/projects/${task.projectId}?task=${task.id}`
            }
          }

          // Send notification
          if (userId !== authorId) {
            await notificationService.create({
              userId,
              type: 'BAND_DETAILS_UPDATED', // Reusing existing type
              title: 'You were mentioned',
              message: `${author.name} mentioned you in ${entityName}`,
              relatedId: comment.id,
              relatedType: 'comment',
              actionUrl,
            })
          }
        })

        await Promise.all(mentionPromises)
      }

      return { comment }
    }),

  // Update a comment
  update: publicProcedure
    .input(z.object({
      commentId: z.string(),
      content: z.string().min(1, 'Comment cannot be empty'),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { commentId, content, userId } = input

      // Check content against blocked terms
      const moderationResult = await checkContent(content)

      // If blocked, throw error
      if (!moderationResult.allowed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Your comment contains prohibited content and cannot be posted. Please review and revise.',
        })
      }

      const comment = await prisma.comment.findUnique({ where: { id: commentId } })

      if (!comment || comment.deletedAt) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Comment not found' })
      }

      if (comment.authorId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only edit your own comments' })
      }

      // Resolve bandId and check active membership
      let bandId = comment.bandId
      if (!bandId && comment.proposalId) {
        const proposal = await prisma.proposal.findUnique({ where: { id: comment.proposalId }, select: { bandId: true } })
        bandId = proposal?.bandId || null
      }
      if (!bandId && comment.projectId) {
        const project = await prisma.project.findUnique({ where: { id: comment.projectId }, select: { bandId: true } })
        bandId = project?.bandId || null
      }
      if (!bandId && comment.taskId) {
        const task = await prisma.task.findUnique({ where: { id: comment.taskId }, select: { bandId: true } })
        bandId = task?.bandId || null
      }

      if (bandId) {
        const membership = await prisma.member.findUnique({
          where: { userId_bandId: { userId, bandId } },
          select: { status: true },
        })
        if (!membership || membership.status !== 'ACTIVE') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active band member to edit comments' })
        }
      }

      const updatedComment = await prisma.comment.update({
        where: { id: commentId },
        data: {
          content,
          isEdited: true,
          editedAt: new Date(),
        },
        include: {
          author: { select: { id: true, name: true, email: true, deletedAt: true } },
          reactions: true,
          mentions: true,
        }
      })

      // If content was flagged (WARN), save for admin review
      if (moderationResult.flagged) {
        await saveFlaggedContent(
          moderationResult,
          {
            contentType: 'COMMENT',
            contentId: commentId,
            authorId: userId,
            contentText: content,
          }
        )
      }

      return { comment: updatedComment }
    }),

  // Delete a comment (soft delete)
  delete: publicProcedure
    .input(z.object({
      commentId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { commentId, userId } = input

      const comment = await prisma.comment.findUnique({ where: { id: commentId } })
      
      if (!comment || comment.deletedAt) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Comment not found' })
      }

      if (comment.authorId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only delete your own comments' })
      }

      // Resolve bandId and check active membership
      let bandId = comment.bandId
      if (!bandId && comment.proposalId) {
        const proposal = await prisma.proposal.findUnique({ where: { id: comment.proposalId }, select: { bandId: true } })
        bandId = proposal?.bandId || null
      }
      if (!bandId && comment.projectId) {
        const project = await prisma.project.findUnique({ where: { id: comment.projectId }, select: { bandId: true } })
        bandId = project?.bandId || null
      }
      if (!bandId && comment.taskId) {
        const task = await prisma.task.findUnique({ where: { id: comment.taskId }, select: { bandId: true } })
        bandId = task?.bandId || null
      }

      if (bandId) {
        const membership = await prisma.member.findUnique({
          where: { userId_bandId: { userId, bandId } },
          select: { status: true },
        })
        if (!membership || membership.status !== 'ACTIVE') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active band member to delete comments' })
        }
      }

      await prisma.comment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() }
      })

      return { success: true }
    }),

  // Add reaction (one reaction per user per comment)
  addReaction: publicProcedure
    .input(z.object({
      commentId: z.string(),
      userId: z.string(),
      type: z.enum(['THUMBS_UP', 'THUMBS_DOWN', 'HEART', 'CELEBRATE', 'THINKING']),
    }))
    .mutation(async ({ input }) => {
      const { commentId, userId, type } = input

      const comment = await prisma.comment.findUnique({ where: { id: commentId } })
      if (!comment || comment.deletedAt) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Comment not found' })
      }

      // Resolve bandId and check active membership
      let bandId = comment.bandId
      if (!bandId && comment.proposalId) {
        const proposal = await prisma.proposal.findUnique({ where: { id: comment.proposalId }, select: { bandId: true } })
        bandId = proposal?.bandId || null
      }
      if (!bandId && comment.projectId) {
        const project = await prisma.project.findUnique({ where: { id: comment.projectId }, select: { bandId: true } })
        bandId = project?.bandId || null
      }
      if (!bandId && comment.taskId) {
        const task = await prisma.task.findUnique({ where: { id: comment.taskId }, select: { bandId: true } })
        bandId = task?.bandId || null
      }

      if (bandId) {
        const membership = await prisma.member.findUnique({
          where: { userId_bandId: { userId, bandId } },
          select: { status: true },
        })
        if (!membership || membership.status !== 'ACTIVE') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active band member to react to comments' })
        }
      }

      // Check if user already has this exact reaction (toggle off)
      const existingSameType = await prisma.reaction.findUnique({
        where: {
          userId_commentId_type: { userId, commentId, type }
        }
      })

      if (existingSameType) {
        // Remove reaction (toggle off)
        await prisma.reaction.delete({ where: { id: existingSameType.id } })
        return { action: 'removed' }
      }

      // Remove any other reaction this user has on this comment
      await prisma.reaction.deleteMany({
        where: {
          userId,
          commentId,
        }
      })

      // Add the new reaction
      await prisma.reaction.create({
        data: { userId, commentId, type }
      })
      
      return { action: 'added' }
    }),

  // Get comment count for an entity
  getCount: publicProcedure
    .input(z.object({
      bandId: z.string().optional(),
      proposalId: z.string().optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { bandId, proposalId, projectId, taskId } = input

      const where: any = {
        deletedAt: null,
      }

      if (bandId) where.bandId = bandId
      if (proposalId) where.proposalId = proposalId
      if (projectId) where.projectId = projectId
      if (taskId) where.taskId = taskId

      const count = await prisma.comment.count({ where })

      return { count }
    }),
})