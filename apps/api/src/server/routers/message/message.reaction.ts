import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { canAccessChannel } from '../channel'

const MAX_UNIQUE_EMOJI_PER_MESSAGE = 20

/**
 * Toggle a reaction on a message (add if not exists, remove if exists)
 */
export const toggleReaction = publicProcedure
  .input(z.object({
    messageId: z.string(),
    userId: z.string(),
    emoji: z.string().min(1).max(32),
  }))
  .mutation(async ({ input }) => {
    const { messageId, userId, emoji } = input

    // Get message with channel and band info
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
        message: 'Cannot react to a deleted message',
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

    // Check if user already has ANY reaction on this message (one reaction per user)
    const existingReaction = await prisma.messageReaction.findFirst({
      where: { messageId, userId },
    })

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        // Same emoji - toggle off (remove)
        await prisma.messageReaction.delete({
          where: { id: existingReaction.id },
        })
        return { action: 'removed' as const, emoji }
      } else {
        // Different emoji - replace the reaction
        await prisma.messageReaction.update({
          where: { id: existingReaction.id },
          data: { emoji },
        })
        return { action: 'changed' as const, emoji, previousEmoji: existingReaction.emoji }
      }
    }

    // Check the unique emoji limit per message
    const uniqueEmojiCount = await prisma.messageReaction.groupBy({
      by: ['emoji'],
      where: { messageId },
      _count: true,
    })

    // Check if this emoji already exists on the message
    const emojiExists = uniqueEmojiCount.some((e: { emoji: string }) => e.emoji === emoji)

    if (!emojiExists && uniqueEmojiCount.length >= MAX_UNIQUE_EMOJI_PER_MESSAGE) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Maximum ${MAX_UNIQUE_EMOJI_PER_MESSAGE} unique emoji per message`,
      })
    }

    // Add the reaction
    await prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
    })

    return { action: 'added' as const, emoji }
  })

/**
 * Get reactions for a message with counts and whether current user has reacted
 */
export const getReactions = publicProcedure
  .input(z.object({
    messageId: z.string(),
    userId: z.string(),
  }))
  .query(async ({ input }) => {
    const { messageId, userId } = input

    // Get message to verify access
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

    // Get all reactions grouped by emoji with user list
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group reactions by emoji
    const reactionMap = new Map<string, { count: number; includesMe: boolean; users: { id: string; name: string }[] }>()

    for (const reaction of reactions) {
      const existing = reactionMap.get(reaction.emoji)
      if (existing) {
        existing.count++
        existing.users.push(reaction.user)
        if (reaction.userId === userId) {
          existing.includesMe = true
        }
      } else {
        reactionMap.set(reaction.emoji, {
          count: 1,
          includesMe: reaction.userId === userId,
          users: [reaction.user],
        })
      }
    }

    return {
      reactions: Array.from(reactionMap.entries()).map(([emoji, data]) => ({
        emoji,
        count: data.count,
        includesMe: data.includesMe,
        users: data.users.slice(0, 10), // Limit to first 10 users
      })),
    }
  })

/**
 * Get reactions for multiple messages (batch query for efficiency)
 */
export const getReactionsBatch = publicProcedure
  .input(z.object({
    messageIds: z.array(z.string()),
    userId: z.string(),
  }))
  .query(async ({ input }) => {
    const { messageIds, userId } = input

    if (messageIds.length === 0) {
      return { reactions: {} }
    }

    // Get all reactions for the messages
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId: { in: messageIds } },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group by message, then by emoji
    const result: Record<string, Array<{ emoji: string; count: number; includesMe: boolean; users: { id: string; name: string }[] }>> = {}

    for (const messageId of messageIds) {
      result[messageId] = []
    }

    const messageReactionMap = new Map<string, Map<string, { count: number; includesMe: boolean; users: { id: string; name: string }[] }>>()

    for (const reaction of reactions) {
      if (!messageReactionMap.has(reaction.messageId)) {
        messageReactionMap.set(reaction.messageId, new Map())
      }

      const emojiMap = messageReactionMap.get(reaction.messageId)!
      const existing = emojiMap.get(reaction.emoji)

      if (existing) {
        existing.count++
        existing.users.push(reaction.user)
        if (reaction.userId === userId) {
          existing.includesMe = true
        }
      } else {
        emojiMap.set(reaction.emoji, {
          count: 1,
          includesMe: reaction.userId === userId,
          users: [reaction.user],
        })
      }
    }

    for (const [messageId, emojiMap] of messageReactionMap) {
      result[messageId] = Array.from(emojiMap.entries()).map(([emoji, data]) => ({
        emoji,
        count: data.count,
        includesMe: data.includesMe,
        users: data.users.slice(0, 10),
      }))
    }

    return { reactions: result }
  })
