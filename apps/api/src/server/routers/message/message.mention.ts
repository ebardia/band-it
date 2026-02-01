import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { canAccessChannel } from '../channel'
import type { MemberRole, ChannelVisibility } from '@prisma/client'

// Role mentions that can be used
const ROLE_MENTIONS = ['governors', 'moderators', 'conductors', 'everyone', 'channel'] as const
type RoleMention = typeof ROLE_MENTIONS[number]

// Which roles can use which mentions
const ROLE_MENTION_PERMISSIONS: Record<RoleMention, MemberRole[]> = {
  governors: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'],
  moderators: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'],
  conductors: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'],
  everyone: ['FOUNDER', 'GOVERNOR', 'MODERATOR'], // Only leadership can use @everyone
  channel: ['FOUNDER', 'GOVERNOR', 'MODERATOR'], // Only leadership can use @channel
}

// Which roles are notified for each role mention
const ROLE_MENTION_TARGETS: Record<RoleMention, MemberRole[]> = {
  governors: ['GOVERNOR'],
  moderators: ['MODERATOR'],
  conductors: ['CONDUCTOR'],
  everyone: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER'], // Not OBSERVER
  channel: [], // Special: notify all users who can access the channel
}

/**
 * Get users that can be mentioned in a channel
 */
export const getMentionableUsers = publicProcedure
  .input(z.object({
    channelId: z.string(),
    userId: z.string(),
    search: z.string().optional(),
  }))
  .query(async ({ input }) => {
    const { channelId, userId, search } = input

    // Get channel with band info
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
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

    const userMembership = channel.band.members.find(m => m.user.id === userId)
    if (!userMembership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    if (!canAccessChannel(userMembership.role, channel.visibility)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this channel',
      })
    }

    // Filter members who can access this channel
    const accessibleMembers = channel.band.members.filter(m =>
      canAccessChannel(m.role, channel.visibility)
    )

    // Apply search filter
    let filteredMembers = accessibleMembers
    if (search) {
      const searchLower = search.toLowerCase()
      filteredMembers = accessibleMembers.filter(m =>
        m.user.name.toLowerCase().includes(searchLower) ||
        m.user.email.toLowerCase().includes(searchLower)
      )
    }

    // Get available role mentions for this user
    const availableRoleMentions = ROLE_MENTIONS.filter(mention =>
      ROLE_MENTION_PERMISSIONS[mention].includes(userMembership.role)
    ).filter(mention => {
      if (!search) return true
      return mention.toLowerCase().includes(search.toLowerCase())
    })

    return {
      users: filteredMembers.map(m => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
      roleMentions: availableRoleMentions,
    }
  })

/**
 * Parse mentions from message content
 * Returns array of user IDs and role mentions found
 */
export function parseMentions(content: string): {
  userMentions: string[]; // Usernames
  roleMentions: RoleMention[];
} {
  const userMentions: string[] = []
  const roleMentions: RoleMention[] = []

  // Match @username (word characters only)
  const userMentionRegex = /@(\w+)/g
  let match

  while ((match = userMentionRegex.exec(content)) !== null) {
    const mention = match[1].toLowerCase()

    // Check if it's a role mention
    if (ROLE_MENTIONS.includes(mention as RoleMention)) {
      if (!roleMentions.includes(mention as RoleMention)) {
        roleMentions.push(mention as RoleMention)
      }
    } else {
      // It's a user mention
      if (!userMentions.includes(mention)) {
        userMentions.push(mention)
      }
    }
  }

  return { userMentions, roleMentions }
}

/**
 * Process mentions after a message is created
 * Creates MessageMention records and notifications
 */
export async function processMentions(
  messageId: string,
  channelId: string,
  bandId: string,
  authorId: string,
  authorName: string,
  content: string,
  authorRole: MemberRole,
  channelVisibility: ChannelVisibility,
  channelName: string,
  bandSlug: string
): Promise<void> {
  const { userMentions, roleMentions } = parseMentions(content)

  // Get all band members for resolving mentions
  const members = await prisma.member.findMany({
    where: { bandId, status: 'ACTIVE' },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  })

  const mentionRecords: { messageId: string; userId?: string; roleMention?: string }[] = []
  const usersToNotify = new Set<string>()

  // Process user mentions
  for (const username of userMentions) {
    // Match against full name OR first word of name (for "John Smith" -> @John)
    const member = members.find(m => {
      const fullName = m.user.name.toLowerCase()
      const firstName = fullName.split(/\s+/)[0]
      return fullName === username.toLowerCase() || firstName === username.toLowerCase()
    })

    if (member && canAccessChannel(member.role, channelVisibility)) {
      // Don't notify the author if they mention themselves
      if (member.user.id !== authorId) {
        mentionRecords.push({ messageId, userId: member.user.id })
        usersToNotify.add(member.user.id)
      }
    }
  }

  // Process role mentions
  for (const roleMention of roleMentions) {
    // Check if author has permission to use this mention
    if (!ROLE_MENTION_PERMISSIONS[roleMention].includes(authorRole)) {
      continue // Skip if author doesn't have permission
    }

    mentionRecords.push({ messageId, roleMention })

    // Get users to notify for this role mention
    if (roleMention === 'channel') {
      // Notify all users who can access the channel
      for (const member of members) {
        if (canAccessChannel(member.role, channelVisibility) && member.user.id !== authorId) {
          usersToNotify.add(member.user.id)
        }
      }
    } else if (roleMention === 'everyone') {
      // Notify all non-observer members
      for (const member of members) {
        if (
          ROLE_MENTION_TARGETS.everyone.includes(member.role) &&
          member.user.id !== authorId
        ) {
          usersToNotify.add(member.user.id)
        }
      }
    } else {
      // Notify users with the specific role
      const targetRoles = ROLE_MENTION_TARGETS[roleMention]
      for (const member of members) {
        if (targetRoles.includes(member.role) && member.user.id !== authorId) {
          usersToNotify.add(member.user.id)
        }
      }
    }
  }

  // Create mention records (skip duplicates)
  if (mentionRecords.length > 0) {
    // Filter out duplicates before inserting
    const uniqueMentions = mentionRecords.filter((record, index, self) =>
      index === self.findIndex(r =>
        r.userId === record.userId && r.roleMention === record.roleMention
      )
    )

    for (const record of uniqueMentions) {
      try {
        await prisma.messageMention.create({
          data: record,
        })
      } catch (error) {
        // Ignore duplicate errors
        console.warn('Duplicate mention skipped:', record)
      }
    }
  }

  // Create notifications for mentioned users
  if (usersToNotify.size > 0) {
    const notifications = Array.from(usersToNotify).map(userId => ({
      userId,
      type: 'BAND_MEMBER_JOINED' as const, // Using existing type, could add MENTION type later
      title: `${authorName} mentioned you`,
      message: content.length > 100 ? content.substring(0, 100) + '...' : content,
      actionUrl: `/bands/${bandSlug}?channel=${channelId}&message=${messageId}`,
      relatedId: messageId,
      relatedType: 'message',
    }))

    await prisma.notification.createMany({
      data: notifications,
    })
  }
}
