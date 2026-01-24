import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { MemberRole, ChannelVisibility } from '@prisma/client'

// Role hierarchy for channel visibility
const VISIBILITY_ROLES: Record<ChannelVisibility, MemberRole[]> = {
  PUBLIC: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'],
  MODERATOR: ['FOUNDER', 'GOVERNOR', 'MODERATOR'],
  GOVERNANCE: ['FOUNDER', 'GOVERNOR'],
}

// Helper to check if a role can access a channel visibility tier
export function canAccessChannel(role: MemberRole, visibility: ChannelVisibility): boolean {
  return VISIBILITY_ROLES[visibility].includes(role)
}

// Helper to get the required role description for a visibility tier
export function getRequiredRoleForVisibility(visibility: ChannelVisibility): string {
  switch (visibility) {
    case 'GOVERNANCE':
      return 'Governor or Founder'
    case 'MODERATOR':
      return 'Moderator, Governor, or Founder'
    default:
      return 'Band Member'
  }
}

/**
 * List all channels for a band
 * Returns all channels (for transparency), but marks which ones the user can access
 */
export const listChannels = publicProcedure
  .input(z.object({
    bandId: z.string(),
    userId: z.string(),
    includeArchived: z.boolean().optional().default(false),
  }))
  .query(async ({ input }) => {
    const { bandId, userId, includeArchived } = input

    // Get user's membership to determine role
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member to view channels',
      })
    }

    const userRole = membership.role

    // Get all channels (for transparency)
    const channels = await prisma.channel.findMany({
      where: {
        bandId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { lastMessageAt: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    // Get user's read status for all channels
    const readStatuses = await prisma.channelReadStatus.findMany({
      where: {
        userId,
        channelId: { in: channels.map(c => c.id) },
      },
    })
    const readStatusMap = new Map(readStatuses.map(rs => [rs.channelId, rs]))

    // Process channels with access info
    const processedChannels = await Promise.all(channels.map(async (channel) => {
      const hasAccess = canAccessChannel(userRole, channel.visibility)
      const readStatus = readStatusMap.get(channel.id)

      // For accessible channels, calculate unread count
      let unreadCount: number | null = null
      let lastMessagePreview: string | null = null

      if (hasAccess) {
        // Count messages after last read
        const lastReadAt = readStatus?.lastReadAt || new Date(0)
        unreadCount = await prisma.message.count({
          where: {
            channelId: channel.id,
            createdAt: { gt: lastReadAt },
            deletedAt: null,
            moderationStatus: 'APPROVED',
          },
        })

        // Get last message preview
        const lastMessage = await prisma.message.findFirst({
          where: {
            channelId: channel.id,
            deletedAt: null,
            moderationStatus: 'APPROVED',
            threadId: null, // Only top-level messages
          },
          orderBy: { createdAt: 'desc' },
          select: { content: true },
        })
        if (lastMessage) {
          lastMessagePreview = lastMessage.content.length > 100
            ? lastMessage.content.substring(0, 100) + '...'
            : lastMessage.content
        }
      }

      return {
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        description: channel.description,
        visibility: channel.visibility,
        isDefault: channel.isDefault,
        isArchived: channel.isArchived,
        hasAccess,
        requiredRole: hasAccess ? null : getRequiredRoleForVisibility(channel.visibility),
        unreadCount,
        lastMessageAt: hasAccess ? channel.lastMessageAt : null,
        lastMessagePreview,
        messageCount: hasAccess ? channel._count.messages : null,
        createdBy: channel.createdBy,
        createdAt: channel.createdAt,
      }
    }))

    return { channels: processedChannels }
  })

/**
 * Get a single channel by ID or slug
 * Returns metadata for all (transparency), but content only for accessible channels
 */
export const getChannel = publicProcedure
  .input(z.object({
    bandId: z.string(),
    channelId: z.string().optional(),
    channelSlug: z.string().optional(),
    userId: z.string(),
  }))
  .query(async ({ input }) => {
    const { bandId, channelId, channelSlug, userId } = input

    if (!channelId && !channelSlug) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Either channelId or channelSlug is required',
      })
    }

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member to view channels',
      })
    }

    const userRole = membership.role

    // Find channel
    const channel = await prisma.channel.findFirst({
      where: {
        bandId,
        ...(channelId ? { id: channelId } : { slug: channelSlug }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    })

    if (!channel) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Channel not found',
      })
    }

    const hasAccess = canAccessChannel(userRole, channel.visibility)

    // Get member count (users who can access this channel)
    const memberCount = await prisma.member.count({
      where: {
        bandId,
        status: 'ACTIVE',
        role: { in: VISIBILITY_ROLES[channel.visibility] },
      },
    })

    // Base response (always visible for transparency)
    const baseResponse = {
      id: channel.id,
      bandId: channel.bandId,
      name: channel.name,
      slug: channel.slug,
      description: channel.description,
      visibility: channel.visibility,
      isDefault: channel.isDefault,
      isArchived: channel.isArchived,
      hasAccess,
      requiredRole: hasAccess ? null : getRequiredRoleForVisibility(channel.visibility),
      createdAt: channel.createdAt,
      memberCount,
    }

    if (!hasAccess) {
      return { channel: baseResponse }
    }

    // Full response for accessible channels
    const pinnedMessages = await prisma.message.findMany({
      where: {
        channelId: channel.id,
        isPinned: true,
        deletedAt: null,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return {
      channel: {
        ...baseResponse,
        createdBy: channel.createdBy,
        messageCount: channel._count.messages,
        lastMessageAt: channel.lastMessageAt,
        pinnedMessages: pinnedMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          authorId: msg.author.id,
          authorName: msg.author.name,
          createdAt: msg.createdAt,
        })),
      },
    }
  })

/**
 * Get unread counts for all accessible channels in a band
 */
export const getUnreadCounts = publicProcedure
  .input(z.object({
    bandId: z.string(),
    userId: z.string(),
  }))
  .query(async ({ input }) => {
    const { bandId, userId } = input

    // Get user's membership
    const membership = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId },
      },
      select: { role: true, status: true },
    })

    if (!membership || membership.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    const userRole = membership.role

    // Get all channels
    const channels = await prisma.channel.findMany({
      where: { bandId, isArchived: false },
      select: { id: true, visibility: true },
    })

    // Get user's read statuses
    const readStatuses = await prisma.channelReadStatus.findMany({
      where: {
        userId,
        channelId: { in: channels.map(c => c.id) },
      },
    })
    const readStatusMap = new Map(readStatuses.map(rs => [rs.channelId, rs]))

    // Calculate unread for each channel
    const channelUnreads = await Promise.all(channels.map(async (channel) => {
      const hasAccess = canAccessChannel(userRole, channel.visibility)

      if (!hasAccess) {
        return {
          channelId: channel.id,
          unreadCount: null,
          hasAccess: false,
        }
      }

      const readStatus = readStatusMap.get(channel.id)
      const lastReadAt = readStatus?.lastReadAt || new Date(0)

      const unreadCount = await prisma.message.count({
        where: {
          channelId: channel.id,
          createdAt: { gt: lastReadAt },
          deletedAt: null,
          moderationStatus: 'APPROVED',
        },
      })

      return {
        channelId: channel.id,
        unreadCount,
        hasAccess: true,
      }
    }))

    const totalUnread = channelUnreads
      .filter(c => c.hasAccess)
      .reduce((sum, c) => sum + (c.unreadCount || 0), 0)

    return {
      channels: channelUnreads,
      totalUnread,
    }
  })
