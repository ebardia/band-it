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
}
