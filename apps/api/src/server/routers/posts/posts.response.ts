import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { MemberRole } from '@prisma/client'
import { canAccessPostCategory, canCreatePost } from './posts.category'

// Roles that can moderate responses
const CAN_MODERATE: MemberRole[] = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

// Maximum thread depth
const MAX_DEPTH = 3

/**
 * Create a response to a post or another response
 */
export const createResponse = publicProcedure
  .input(z.object({
    postId: z.string(),
    userId: z.string(),
    content: z.string().min(1).max(50000), // Markdown content
    parentId: z.string().optional(), // If replying to another response
  }))
  .mutation(async ({ input }) => {
    const { postId, userId, content, parentId } = input

    // Get post with category info
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        bandId: true,
        isLocked: true,
        deletedAt: true,
        category: {
          select: { visibility: true, isArchived: true },
        },
      },
    })

    if (!post || post.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Post not found',
      })
    }

    if (post.isLocked) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This post is locked and cannot receive new responses',
      })
    }

    if (post.category.isArchived) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot respond to posts in archived categories',
      })
    }

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId: post.bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!canCreatePost(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to respond',
      })
    }

    if (!canAccessPostCategory(membership.role, post.category.visibility)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this category',
      })
    }

    // Determine depth
    let depth = 1

    if (parentId) {
      const parentResponse = await prisma.postResponse.findUnique({
        where: { id: parentId },
        select: { postId: true, depth: true, deletedAt: true },
      })

      if (!parentResponse || parentResponse.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Parent response not found',
        })
      }

      if (parentResponse.postId !== postId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Parent response does not belong to this post',
        })
      }

      depth = parentResponse.depth + 1

      if (depth > MAX_DEPTH) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Maximum thread depth of ${MAX_DEPTH} reached. Please respond to an earlier comment.`,
        })
      }
    }

    // Create response and update post stats
    const response = await prisma.$transaction(async (tx) => {
      const newResponse = await tx.postResponse.create({
        data: {
          postId,
          authorId: userId,
          content,
          parentId: parentId || null,
          depth,
        },
        include: {
          author: {
            select: { id: true, name: true, deletedAt: true },
          },
        },
      })

      // Update post stats
      await tx.post.update({
        where: { id: postId },
        data: {
          responseCount: { increment: 1 },
          lastResponseAt: new Date(),
        },
      })

      return newResponse
    })

    return {
      response: {
        id: response.id,
        content: response.content,
        depth: response.depth,
        author: response.author,
        createdAt: response.createdAt,
        isEdited: response.isEdited,
        canReply: depth < MAX_DEPTH,
        replies: [],
      },
    }
  })

/**
 * Update a response
 */
export const updateResponse = publicProcedure
  .input(z.object({
    responseId: z.string(),
    userId: z.string(),
    content: z.string().min(1).max(50000),
  }))
  .mutation(async ({ input }) => {
    const { responseId, userId, content } = input

    const response = await prisma.postResponse.findUnique({
      where: { id: responseId },
      select: {
        authorId: true,
        deletedAt: true,
        post: {
          select: { bandId: true, isLocked: true, deletedAt: true },
        },
      },
    })

    if (!response || response.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Response not found',
      })
    }

    if (response.post.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Post not found',
      })
    }

    // Only author can edit
    if (response.authorId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the author can edit this response',
      })
    }

    const updated = await prisma.postResponse.update({
      where: { id: responseId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    })

    return { response: updated }
  })

/**
 * Delete a response (soft delete)
 */
export const deleteResponse = publicProcedure
  .input(z.object({
    responseId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { responseId, userId } = input

    const response = await prisma.postResponse.findUnique({
      where: { id: responseId },
      select: {
        authorId: true,
        postId: true,
        deletedAt: true,
        post: {
          select: { bandId: true, deletedAt: true },
        },
      },
    })

    if (!response || response.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Response not found',
      })
    }

    if (response.post.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Post not found',
      })
    }

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId: response.post.bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    // Author or moderators can delete
    const canDelete = response.authorId === userId || CAN_MODERATE.includes(membership.role)

    if (!canDelete) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this response',
      })
    }

    // Soft delete and update post stats
    await prisma.$transaction(async (tx) => {
      await tx.postResponse.update({
        where: { id: responseId },
        data: { deletedAt: new Date() },
      })

      await tx.post.update({
        where: { id: response.postId },
        data: {
          responseCount: { decrement: 1 },
        },
      })
    })

    return { success: true }
  })
