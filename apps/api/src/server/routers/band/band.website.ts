import { z } from 'zod'
import crypto from 'crypto'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { statusUpdateService } from '../../../services/status-update.service'

// Only founders and governors can manage website integration settings
const CAN_MANAGE_WEBSITE = ['FOUNDER', 'GOVERNOR']

// Conductor and above can send status updates
const CAN_SEND_STATUS_UPDATE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const bandWebsiteRouter = router({
  /**
   * Get website integration settings
   */
  getWebsiteSettings: publicProcedure
    .input(z.object({
      bandId: z.string(),
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      const { bandId, userId } = input

      // Check user membership and permissions
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId, bandId },
        },
        select: { role: true, status: true },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member to view these settings',
        })
      }

      if (!CAN_MANAGE_WEBSITE.includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view website integration settings',
        })
      }

      const band = await prisma.band.findUnique({
        where: { id: bandId },
        select: {
          publicWebsiteUrl: true,
          publicApiKey: true,
          webhookUrl: true,
          webhookSecret: true,
        },
      })

      if (!band) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Band not found',
        })
      }

      return {
        settings: {
          publicWebsiteUrl: band.publicWebsiteUrl || '',
          publicApiKey: band.publicApiKey || '',
          webhookUrl: band.webhookUrl || '',
          webhookSecret: band.webhookSecret || '',
        },
      }
    }),

  /**
   * Update website integration settings
   */
  updateWebsiteSettings: publicProcedure
    .input(z.object({
      bandId: z.string(),
      userId: z.string(),
      publicWebsiteUrl: z.string().url().optional().or(z.literal('')),
      webhookUrl: z.string().url().optional().or(z.literal('')),
    }))
    .mutation(async ({ input }) => {
      const { bandId, userId, publicWebsiteUrl, webhookUrl } = input

      // Check user membership and permissions
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId, bandId },
        },
        select: { role: true, status: true },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member',
        })
      }

      if (!CAN_MANAGE_WEBSITE.includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update website integration settings',
        })
      }

      const updateData: any = {}

      if (publicWebsiteUrl !== undefined) {
        updateData.publicWebsiteUrl = publicWebsiteUrl || null
      }

      if (webhookUrl !== undefined) {
        updateData.webhookUrl = webhookUrl || null
      }

      const band = await prisma.band.update({
        where: { id: bandId },
        data: updateData,
        select: {
          publicWebsiteUrl: true,
          publicApiKey: true,
          webhookUrl: true,
          webhookSecret: true,
        },
      })

      return {
        success: true,
        settings: {
          publicWebsiteUrl: band.publicWebsiteUrl || '',
          publicApiKey: band.publicApiKey || '',
          webhookUrl: band.webhookUrl || '',
          webhookSecret: band.webhookSecret || '',
        },
      }
    }),

  /**
   * Generate a new API key for the band
   */
  generateApiKey: publicProcedure
    .input(z.object({
      bandId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { bandId, userId } = input

      // Check user membership and permissions
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId, bandId },
        },
        select: { role: true, status: true },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member',
        })
      }

      if (!CAN_MANAGE_WEBSITE.includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to generate API keys',
        })
      }

      // Generate a secure API key
      const apiKey = `bnd_${crypto.randomBytes(24).toString('hex')}`

      await prisma.band.update({
        where: { id: bandId },
        data: { publicApiKey: apiKey },
      })

      return {
        success: true,
        apiKey,
      }
    }),

  /**
   * Generate a new webhook secret for the band
   */
  generateWebhookSecret: publicProcedure
    .input(z.object({
      bandId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { bandId, userId } = input

      // Check user membership and permissions
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId, bandId },
        },
        select: { role: true, status: true },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member',
        })
      }

      if (!CAN_MANAGE_WEBSITE.includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to generate webhook secrets',
        })
      }

      // Generate a secure webhook secret
      const webhookSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`

      await prisma.band.update({
        where: { id: bandId },
        data: { webhookSecret },
      })

      return {
        success: true,
        webhookSecret,
      }
    }),

  /**
   * Send a status update webhook on demand
   * Accessible by CONDUCTOR and above roles
   */
  sendStatusUpdate: publicProcedure
    .input(z.object({
      bandId: z.string(),
      userId: z.string(),
      // Optional: custom date range (defaults to last 7 days)
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }))
    .mutation(async ({ input }) => {
      const { bandId, userId, startDate, endDate } = input

      // Check user membership and permissions
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId, bandId },
        },
        select: { role: true, status: true },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member',
        })
      }

      if (!CAN_SEND_STATUS_UPDATE.includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be a Conductor or above to send status updates',
        })
      }

      // Check if webhook is configured
      const band = await prisma.band.findUnique({
        where: { id: bandId },
        select: { webhookUrl: true, webhookSecret: true },
      })

      if (!band?.webhookUrl || !band?.webhookSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Webhook URL and secret must be configured before sending status updates',
        })
      }

      // Send the status update
      const result = await statusUpdateService.send(
        bandId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      )

      if (!result.sent) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to send status update',
        })
      }

      return {
        success: true,
        message: 'Status update sent successfully',
      }
    }),
})
