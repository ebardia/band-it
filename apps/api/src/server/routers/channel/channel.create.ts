import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { MemberRole, ChannelVisibility } from '@prisma/client'
import { logAuditEvent } from '../../../lib/auditContext'

// Roles that can create each visibility tier
const CAN_CREATE_VISIBILITY: Record<ChannelVisibility, MemberRole[]> = {
  PUBLIC: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'],
  MODERATOR: ['FOUNDER', 'GOVERNOR', 'MODERATOR'],
  GOVERNANCE: ['FOUNDER', 'GOVERNOR'],
}

/**
 * Generate a URL-safe slug from a channel name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric except spaces and hyphens
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
    .substring(0, 100)             // Limit length
}

/**
 * Check if a slug is unique within a band, and generate alternatives if not
 */
async function getUniqueSlug(bandId: string, baseSlug: string): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.channel.findUnique({
      where: {
        bandId_slug: { bandId, slug },
      },
    })

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++

    if (counter > 100) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to generate unique slug',
      })
    }
  }
}

/**
 * Create a new channel
 */
export const createChannel = publicProcedure
  .input(z.object({
    bandId: z.string(),
    userId: z.string(),
    name: z.string().min(1).max(80),
    description: z.string().max(500).optional(),
    visibility: z.enum(['PUBLIC', 'MODERATOR', 'GOVERNANCE']).default('PUBLIC'),
  }))
  .mutation(async ({ input }) => {
    const { bandId, userId, name, description, visibility } = input

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
        message: 'You must be an active band member to create channels',
      })
    }

    // Check if user can create channels with this visibility
    const allowedRoles = CAN_CREATE_VISIBILITY[visibility as ChannelVisibility]
    if (!allowedRoles.includes(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Only ${allowedRoles.join(', ')} can create ${visibility.toLowerCase()} channels`,
      })
    }

    // Generate unique slug
    const baseSlug = generateSlug(name)
    if (!baseSlug) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Channel name must contain at least one alphanumeric character',
      })
    }
    const slug = await getUniqueSlug(bandId, baseSlug)

    // Create channel
    const channel = await prisma.channel.create({
      data: {
        bandId,
        name,
        slug,
        description,
        visibility: visibility as ChannelVisibility,
        isDefault: false,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    // Log to audit trail if private channel
    if (visibility !== 'PUBLIC') {
      await logAuditEvent({
        bandId,
        action: 'private_channel_created',
        entityType: 'Channel',
        entityId: channel.id,
        entityName: channel.name,
        changes: {
          visibility: { from: null, to: visibility },
          description: { from: null, to: description || null },
        },
      })
    }

    return {
      channel: {
        id: channel.id,
        bandId: channel.bandId,
        name: channel.name,
        slug: channel.slug,
        description: channel.description,
        visibility: channel.visibility,
        isDefault: channel.isDefault,
        isArchived: channel.isArchived,
        hasAccess: true,
        createdBy: channel.createdBy,
        createdAt: channel.createdAt,
      },
    }
  })

/**
 * Create the default "General" channel for a band
 * This is called automatically when a band is created
 */
export async function createDefaultChannel(bandId: string, createdById: string): Promise<void> {
  // Check if General channel already exists
  const existing = await prisma.channel.findUnique({
    where: {
      bandId_slug: { bandId, slug: 'general' },
    },
  })

  if (existing) {
    return // Already exists
  }

  await prisma.channel.create({
    data: {
      bandId,
      name: 'General',
      slug: 'general',
      description: 'General discussion for all band members',
      visibility: 'PUBLIC',
      isDefault: true,
      createdById,
    },
  })
}
