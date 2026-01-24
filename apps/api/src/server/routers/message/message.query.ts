import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { canAccessChannel } from '../channel'

/**
 * List messages in a channel with pagination
 * Returns messages in reverse chronological order (newest first)
 */
export const listMessages = publicProcedure
  .input(z.object({
    channelId: z.string(),
    userId: z.string(),
    cursor: z.string().optional(), // Message ID for cursor-based pagination
    limit: z.number().min(1).max(100).default(50),
    threadId: z.string().optional(), // If provided, get messages in a thread
  }))
  .query(async ({ input }) => {
    const { channelId, userId, cursor, limit, threadId } = input

    // Get channel with band info
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        band: {
          include: {
            members: {
              where: { userId, status: 'ACTIVE' },
              select: { role: true },
            },
          },
        },
      },
    })

    if (!channel) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Channel not found',
      })
    }

    const membership = channel.band.members[0]
    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    // Check channel access
    if (!canAccessChannel(membership.role, channel.visibility)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this channel',
      })
    }

    // Build cursor condition
    let cursorCondition = {}
    if (cursor) {
      const cursorMessage = await prisma.message.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      })
      if (cursorMessage) {
        cursorCondition = {
          createdAt: { lt: cursorMessage.createdAt },
        }
      }
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        moderationStatus: 'APPROVED',
        // If threadId provided, get replies to that thread
        // Otherwise get top-level messages only
        threadId: threadId || null,
        ...cursorCondition,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Get one extra to check if there are more
    })

    // Check if there are more messages
    const hasMore = messages.length > limit
    const messagesResult = hasMore ? messages.slice(0, -1) : messages
    const nextCursor = hasMore ? messagesResult[messagesResult.length - 1]?.id : null

    return {
      messages: messagesResult.map(msg => ({
        id: msg.id,
        channelId: msg.channelId,
        content: msg.content,
        author: msg.author,
        threadId: msg.threadId,
        isPinned: msg.isPinned,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
        replyCount: msg._count.replies,
        createdAt: msg.createdAt,
      })),
      nextCursor,
      hasMore,
    }
  })

/**
 * Get a single message with its thread (replies)
 */
export const getThread = publicProcedure
  .input(z.object({
    messageId: z.string(),
    userId: z.string(),
    limit: z.number().min(1).max(100).default(50),
    cursor: z.string().optional(),
  }))
  .query(async ({ input }) => {
    const { messageId, userId, limit, cursor } = input

    // Get the parent message with channel info
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        channel: {
          include: {
            band: {
              include: {
                members: {
                  where: { userId, status: 'ACTIVE' },
                  select: { role: true },
                },
              },
            },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    })

    if (!message) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Message not found',
      })
    }

    if (message.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Message has been deleted',
      })
    }

    const membership = message.channel.band.members[0]
    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!canAccessChannel(membership.role, message.channel.visibility)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this channel',
      })
    }

    // Build cursor condition for replies
    let cursorCondition = {}
    if (cursor) {
      const cursorMessage = await prisma.message.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      })
      if (cursorMessage) {
        cursorCondition = {
          createdAt: { gt: cursorMessage.createdAt },
        }
      }
    }

    // Get replies (oldest first for threads)
    const replies = await prisma.message.findMany({
      where: {
        threadId: messageId,
        deletedAt: null,
        moderationStatus: 'APPROVED',
        ...cursorCondition,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
    })

    const hasMore = replies.length > limit
    const repliesResult = hasMore ? replies.slice(0, -1) : replies
    const nextCursor = hasMore ? repliesResult[repliesResult.length - 1]?.id : null

    return {
      message: {
        id: message.id,
        channelId: message.channelId,
        content: message.content,
        author: message.author,
        threadId: message.threadId,
        isPinned: message.isPinned,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        replyCount: message._count.replies,
        createdAt: message.createdAt,
      },
      replies: repliesResult.map(reply => ({
        id: reply.id,
        channelId: reply.channelId,
        content: reply.content,
        author: reply.author,
        threadId: reply.threadId,
        isPinned: reply.isPinned,
        isEdited: reply.isEdited,
        editedAt: reply.editedAt,
        createdAt: reply.createdAt,
      })),
      nextCursor,
      hasMore,
    }
  })

/**
 * Search messages in a channel
 */
export const searchMessages = publicProcedure
  .input(z.object({
    channelId: z.string(),
    userId: z.string(),
    query: z.string().min(1).max(200),
    limit: z.number().min(1).max(50).default(20),
  }))
  .query(async ({ input }) => {
    const { channelId, userId, query, limit } = input

    // Get channel with band info
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        band: {
          include: {
            members: {
              where: { userId, status: 'ACTIVE' },
              select: { role: true },
            },
          },
        },
      },
    })

    if (!channel) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Channel not found',
      })
    }

    const membership = channel.band.members[0]
    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!canAccessChannel(membership.role, channel.visibility)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this channel',
      })
    }

    // Search messages
    const messages = await prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        moderationStatus: 'APPROVED',
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return {
      messages: messages.map(msg => ({
        id: msg.id,
        channelId: msg.channelId,
        content: msg.content,
        author: msg.author,
        threadId: msg.threadId,
        isPinned: msg.isPinned,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
        replyCount: msg._count.replies,
        createdAt: msg.createdAt,
      })),
    }
  })
