import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { canAccessChannel } from '../channel'

/**
 * Create a new message in a channel
 */
export const createMessage = publicProcedure
  .input(z.object({
    channelId: z.string(),
    userId: z.string(),
    content: z.string().min(1).max(10000),
    threadId: z.string().optional(), // If replying to a message
  }))
  .mutation(async ({ input }) => {
    const { channelId, userId, content, threadId } = input

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

    if (channel.isArchived) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot post in an archived channel',
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

    // If replying, verify the parent message exists and is in the same channel
    if (threadId) {
      const parentMessage = await prisma.message.findUnique({
        where: { id: threadId },
        select: { id: true, channelId: true, threadId: true, deletedAt: true },
      })

      if (!parentMessage) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Parent message not found',
        })
      }

      if (parentMessage.channelId !== channelId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot reply to a message in a different channel',
        })
      }

      if (parentMessage.deletedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot reply to a deleted message',
        })
      }

      // Prevent nested threads (replies to replies)
      if (parentMessage.threadId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot create nested replies. Reply to the top-level message instead.',
        })
      }
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        channelId,
        authorId: userId,
        content,
        threadId: threadId || null,
        moderationStatus: 'APPROVED', // Auto-approve for now
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Update channel's lastMessageAt
    await prisma.channel.update({
      where: { id: channelId },
      data: {
        lastMessageAt: message.createdAt,
        messageCount: { increment: 1 },
      },
    })

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
        replyCount: 0,
        createdAt: message.createdAt,
      },
    }
  })

/**
 * Mark channel as read (update read status)
 */
export const markAsRead = publicProcedure
  .input(z.object({
    channelId: z.string(),
    userId: z.string(),
    messageId: z.string().optional(), // Optionally mark up to a specific message
  }))
  .mutation(async ({ input }) => {
    const { channelId, userId, messageId } = input

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

    // Determine the time to mark as read
    let lastReadAt = new Date()
    if (messageId) {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { createdAt: true },
      })
      if (message) {
        lastReadAt = message.createdAt
      }
    }

    // Upsert read status
    await prisma.channelReadStatus.upsert({
      where: {
        channelId_userId: { channelId, userId },
      },
      create: {
        channelId,
        userId,
        lastReadAt,
        lastReadMessageId: messageId || null,
      },
      update: {
        lastReadAt,
        lastReadMessageId: messageId || null,
      },
    })

    return { success: true }
  })
