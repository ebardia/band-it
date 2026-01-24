import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { MemberRole } from '@prisma/client'
import { canAccessChannel } from '../channel'

// Roles that can delete any message (moderation)
const CAN_MODERATE_MESSAGES: MemberRole[] = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

// Roles that can pin messages
const CAN_PIN_MESSAGES: MemberRole[] = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

/**
 * Edit a message
 * Only the author can edit their own message
 */
export const editMessage = publicProcedure
  .input(z.object({
    messageId: z.string(),
    userId: z.string(),
    content: z.string().min(1).max(10000),
  }))
  .mutation(async ({ input }) => {
    const { messageId, userId, content } = input

    // Get message with channel info
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
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
        code: 'BAD_REQUEST',
        message: 'Cannot edit a deleted message',
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

    // Only author can edit
    if (message.authorId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only edit your own messages',
      })
    }

    // Save edit history
    await prisma.messageEdit.create({
      data: {
        messageId,
        previousContent: message.content,
        editedById: userId,
      },
    })

    // Update message
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    })

    return {
      message: {
        id: updated.id,
        channelId: updated.channelId,
        content: updated.content,
        author: updated.author,
        threadId: updated.threadId,
        isPinned: updated.isPinned,
        isEdited: updated.isEdited,
        editedAt: updated.editedAt,
        replyCount: updated._count.replies,
        createdAt: updated.createdAt,
      },
    }
  })

/**
 * Delete a message (soft delete)
 * Author can delete their own message
 * Moderators+ can delete any message
 */
export const deleteMessage = publicProcedure
  .input(z.object({
    messageId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { messageId, userId } = input

    // Get message with channel info
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
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
        code: 'BAD_REQUEST',
        message: 'Message is already deleted',
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

    const isAuthor = message.authorId === userId
    const isModerator = CAN_MODERATE_MESSAGES.includes(membership.role)

    if (!isAuthor && !isModerator) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only delete your own messages',
      })
    }

    // Soft delete the message
    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    })

    // Decrement channel message count
    await prisma.channel.update({
      where: { id: message.channelId },
      data: { messageCount: { decrement: 1 } },
    })

    return { success: true }
  })

/**
 * Pin a message
 * Moderators+ can pin messages
 */
export const pinMessage = publicProcedure
  .input(z.object({
    messageId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { messageId, userId } = input

    // Get message with channel info
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
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
        code: 'BAD_REQUEST',
        message: 'Cannot pin a deleted message',
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

    if (!CAN_PIN_MESSAGES.includes(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only moderators can pin messages',
      })
    }

    if (message.isPinned) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Message is already pinned',
      })
    }

    // Pin the message
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: true },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    })

    return {
      message: {
        id: updated.id,
        channelId: updated.channelId,
        content: updated.content,
        author: updated.author,
        threadId: updated.threadId,
        isPinned: updated.isPinned,
        isEdited: updated.isEdited,
        editedAt: updated.editedAt,
        replyCount: updated._count.replies,
        createdAt: updated.createdAt,
      },
    }
  })

/**
 * Unpin a message
 * Moderators+ can unpin messages
 */
export const unpinMessage = publicProcedure
  .input(z.object({
    messageId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { messageId, userId } = input

    // Get message with channel info
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
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
      },
    })

    if (!message) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Message not found',
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

    if (!CAN_PIN_MESSAGES.includes(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only moderators can unpin messages',
      })
    }

    if (!message.isPinned) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Message is not pinned',
      })
    }

    // Unpin the message
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: false },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    })

    return {
      message: {
        id: updated.id,
        channelId: updated.channelId,
        content: updated.content,
        author: updated.author,
        threadId: updated.threadId,
        isPinned: updated.isPinned,
        isEdited: updated.isEdited,
        editedAt: updated.editedAt,
        replyCount: updated._count.replies,
        createdAt: updated.createdAt,
      },
    }
  })

/**
 * Get edit history for a message
 */
export const getEditHistory = publicProcedure
  .input(z.object({
    messageId: z.string(),
    userId: z.string(),
  }))
  .query(async ({ input }) => {
    const { messageId, userId } = input

    // Get message with channel info
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
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
      },
    })

    if (!message) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Message not found',
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

    // Get edit history
    const edits = await prisma.messageEdit.findMany({
      where: { messageId },
      include: {
        editedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { editedAt: 'desc' },
    })

    return {
      edits: edits.map(edit => ({
        id: edit.id,
        previousContent: edit.previousContent,
        editedBy: edit.editedBy,
        editedAt: edit.editedAt,
      })),
    }
  })
