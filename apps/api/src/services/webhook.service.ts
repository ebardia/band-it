/**
 * Webhook Service
 *
 * Handles outbound webhooks to external band websites.
 * Sends notifications when events occur within Band IT that external sites need to know about.
 */

import crypto from 'crypto'
import { prisma } from '../lib/prisma'

// Webhook event types
export type WebhookEventType =
  | 'member.joined'
  | 'member.left'
  | 'member.updated'
  | 'members.sync'
  | 'status.update'
  | 'event.created'
  | 'event.updated'
  | 'event.cancelled'

interface WebhookPayload {
  type: WebhookEventType
  timestamp: string
  bandSlug: string
  data: Record<string, any>
}

interface WebhookConfig {
  webhookUrl: string
  webhookSecret: string
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

/**
 * Send webhook to a URL with signature
 */
async function sendWebhook(
  config: WebhookConfig,
  payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const payloadString = JSON.stringify(payload)
  const signature = generateSignature(payloadString, config.webhookSecret)

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BandIT-Signature': signature,
        'X-BandIT-Timestamp': payload.timestamp,
      },
      body: payloadString,
    })

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    return { success: true, statusCode: response.status }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
    }
  }
}

export const webhookService = {
  /**
   * Emit a webhook event to a band's configured webhook URL
   */
  async emit(
    bandId: string,
    type: WebhookEventType,
    data: Record<string, any>
  ): Promise<{ sent: boolean; error?: string }> {
    // Get band webhook configuration
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: {
        slug: true,
        webhookUrl: true,
        webhookSecret: true,
      },
    })

    if (!band || !band.webhookUrl || !band.webhookSecret) {
      return { sent: false, error: 'No webhook configured' }
    }

    const payload: WebhookPayload = {
      type,
      timestamp: new Date().toISOString(),
      bandSlug: band.slug,
      data,
    }

    const result = await sendWebhook(
      {
        webhookUrl: band.webhookUrl,
        webhookSecret: band.webhookSecret,
      },
      payload
    )

    // Log webhook attempt
    console.log(`Webhook ${type} to ${band.slug}:`, result.success ? 'success' : result.error)

    return { sent: result.success, error: result.error }
  },

  /**
   * Notify external website when a member joins (application approved or invited)
   */
  async memberJoined(bandId: string, member: {
    name: string
    role: string
    joinedAt: Date
  }) {
    return this.emit(bandId, 'member.joined', {
      name: member.name,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    })
  },

  /**
   * Notify external website when a member leaves
   */
  async memberLeft(bandId: string, member: {
    name: string
    leftAt: Date
  }) {
    return this.emit(bandId, 'member.left', {
      name: member.name,
      leftAt: member.leftAt.toISOString(),
    })
  },

  /**
   * Notify external website of a status update (weekly digest)
   */
  async statusUpdate(bandId: string, update: {
    title: string
    content: string | Record<string, any>
    author?: string
    createdAt: Date
  }) {
    return this.emit(bandId, 'status.update', {
      title: update.title,
      content: update.content,
      author: update.author,
      createdAt: update.createdAt.toISOString(),
    })
  },

  /**
   * Notify external website when an event is created
   */
  async eventCreated(bandId: string, event: {
    id: string
    title: string
    description?: string | null
    startTime: Date
    endTime: Date
    location?: string | null
  }) {
    return this.emit(bandId, 'event.created', {
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      location: event.location,
    })
  },

  /**
   * Notify external website when an event is updated
   */
  async eventUpdated(bandId: string, event: {
    id: string
    title: string
    description?: string | null
    startTime: Date
    endTime: Date
    location?: string | null
  }) {
    return this.emit(bandId, 'event.updated', {
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      location: event.location,
    })
  },

  /**
   * Notify external website when an event is cancelled
   */
  async eventCancelled(bandId: string, event: {
    id: string
    title: string
  }) {
    return this.emit(bandId, 'event.cancelled', {
      id: event.id,
      title: event.title,
    })
  },

  /**
   * Sync members for a band AND its parent (if it has one)
   * Call this when a member joins or leaves any band
   */
  async syncMembersWithParent(bandId: string): Promise<void> {
    // Get the band to check if it has a parent
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: {
        id: true,
        parentBandId: true,
        webhookUrl: true,
      },
    })

    if (!band) return

    // Sync the current band if it has a webhook
    if (band.webhookUrl) {
      this.syncMembers(bandId).catch(err =>
        console.error('Error syncing members for band:', err)
      )
    }

    // If this band has a parent, sync the parent's members too
    // (the parent's member list includes all sub-band members)
    if (band.parentBandId) {
      this.syncMembers(band.parentBandId).catch(err =>
        console.error('Error syncing members for parent band:', err)
      )
    }
  },

  /**
   * Sync full member list to external website
   * Gets all unique members across a band and its sub-bands
   */
  async syncMembers(bandId: string): Promise<{ sent: boolean; memberCount: number; error?: string }> {
    // Get the band with its sub-bands
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: {
        id: true,
        slug: true,
        webhookUrl: true,
        webhookSecret: true,
        subBands: {
          select: { id: true },
        },
      },
    })

    if (!band || !band.webhookUrl || !band.webhookSecret) {
      return { sent: false, memberCount: 0, error: 'No webhook configured' }
    }

    // Collect all band IDs (parent + sub-bands)
    const allBandIds = [band.id, ...band.subBands.map(sb => sb.id)]

    // Get all active members across all bands
    const members = await prisma.member.findMany({
      where: {
        bandId: { in: allBandIds },
        status: 'ACTIVE',
      },
      select: {
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: { name: true },
        },
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    // De-duplicate by userId, keeping the highest role (earliest in order)
    const roleOrder = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER']
    const uniqueMembers = new Map<string, {
      name: string
      role: string
      joinedAt: string
    }>()

    for (const member of members) {
      const existing = uniqueMembers.get(member.userId)
      if (!existing) {
        uniqueMembers.set(member.userId, {
          name: member.user.name,
          role: member.role,
          joinedAt: member.createdAt.toISOString(),
        })
      } else {
        // Keep the higher role (lower index in roleOrder)
        const existingRoleIndex = roleOrder.indexOf(existing.role)
        const newRoleIndex = roleOrder.indexOf(member.role)
        if (newRoleIndex < existingRoleIndex) {
          uniqueMembers.set(member.userId, {
            name: member.user.name,
            role: member.role,
            joinedAt: member.createdAt.toISOString(),
          })
        }
      }
    }

    const memberList = Array.from(uniqueMembers.values())

    const result = await this.emit(bandId, 'members.sync', {
      members: memberList,
      count: memberList.length,
    })

    return {
      sent: result.sent,
      memberCount: memberList.length,
      error: result.error,
    }
  },
}
