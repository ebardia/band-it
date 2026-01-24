import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { MemberRole } from '@prisma/client'
import { logAuditEvent } from '../../../lib/auditContext'

// Roles that can archive channels
const CAN_ARCHIVE_CHANNEL: MemberRole[] = ['FOUNDER', 'GOVERNOR']

// Roles that can delete channels
const CAN_DELETE_CHANNEL: MemberRole[] = ['FOUNDER']

/**
 * Update a channel's name and/or description
 * - Channel creator (if Moderator+), Governor, or Founder can update
 * - Cannot change visibility after creation
 * - Cannot change isDefault
 */
export const updateChannel = publicProcedure
  .input(z.object({
    channelId: z.string(),
    userId: z.string(),
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(500).optional(),
  }))
  .mutation(async ({ input }) => {
    const { channelId, userId, name, description } = input

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

    const userRole = membership.role
    const isCreator = channel.createdById === userId
    const isModeratorPlus = ['FOUNDER', 'GOVERNOR', 'MODERATOR'].includes(userRole)
    const isGovernorPlus = ['FOUNDER', 'GOVERNOR'].includes(userRole)

    // Check permission: creator (if Moderator+), Governor, or Founder
    const canUpdate = isGovernorPlus || (isCreator && isModeratorPlus)
    if (!canUpdate) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this channel',
      })
    }

    // Update channel
    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    return {
      channel: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        visibility: updated.visibility,
        isDefault: updated.isDefault,
        isArchived: updated.isArchived,
        createdBy: updated.createdBy,
        updatedAt: updated.updatedAt,
      },
    }
  })

/**
 * Archive a channel (make it read-only)
 * - Governor or Founder can archive
 * - Cannot archive the default "General" channel
 */
export const archiveChannel = publicProcedure
  .input(z.object({
    channelId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { channelId, userId } = input

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

    if (!CAN_ARCHIVE_CHANNEL.includes(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only Governors and Founders can archive channels',
      })
    }

    if (channel.isDefault) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot archive the default General channel',
      })
    }

    if (channel.isArchived) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Channel is already archived',
      })
    }

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: { isArchived: true },
    })

    // Log to audit trail
    await logAuditEvent({
      bandId: channel.bandId,
      action: 'channel_archived',
      entityType: 'Channel',
      entityId: channel.id,
      entityName: channel.name,
    })

    return { success: true, channel: updated }
  })

/**
 * Unarchive a channel
 * - Governor or Founder can unarchive
 */
export const unarchiveChannel = publicProcedure
  .input(z.object({
    channelId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { channelId, userId } = input

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

    if (!CAN_ARCHIVE_CHANNEL.includes(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only Governors and Founders can unarchive channels',
      })
    }

    if (!channel.isArchived) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Channel is not archived',
      })
    }

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: { isArchived: false },
    })

    // Log to audit trail
    await logAuditEvent({
      bandId: channel.bandId,
      action: 'channel_unarchived',
      entityType: 'Channel',
      entityId: channel.id,
      entityName: channel.name,
    })

    return { success: true, channel: updated }
  })

/**
 * Delete a channel
 * - Only Founder can delete
 * - Cannot delete the default "General" channel
 * - Cannot delete the last public channel
 */
export const deleteChannel = publicProcedure
  .input(z.object({
    channelId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { channelId, userId } = input

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
            channels: {
              where: { visibility: 'PUBLIC', isArchived: false },
              select: { id: true },
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

    if (!CAN_DELETE_CHANNEL.includes(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only Founders can delete channels',
      })
    }

    if (channel.isDefault) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot delete the default General channel',
      })
    }

    // Check if this is the last public channel
    const publicChannels = channel.band.channels
    if (channel.visibility === 'PUBLIC' && publicChannels.length <= 1) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot delete the last public channel',
      })
    }

    // Soft delete all messages in the channel
    await prisma.message.updateMany({
      where: { channelId },
      data: { deletedAt: new Date() },
    })

    // Delete the channel (this will cascade delete read statuses)
    await prisma.channel.delete({
      where: { id: channelId },
    })

    // Log to audit trail
    await logAuditEvent({
      bandId: channel.bandId,
      action: 'channel_deleted',
      entityType: 'Channel',
      entityId: channel.id,
      entityName: channel.name,
      changes: {
        visibility: { from: channel.visibility, to: null },
      },
    })

    return { success: true }
  })
