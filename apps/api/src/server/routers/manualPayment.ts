import { z } from 'zod'
import { randomBytes } from 'crypto'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../services/notification.service'

/**
 * Generate a secure random token for payment confirmation links
 */
function generateConfirmationToken(): string {
  return randomBytes(32).toString('hex')
}

// Roles that can view all billing and confirm payments as treasurer
const TREASURER_ELIGIBLE_ROLES = ['FOUNDER', 'GOVERNOR']

/**
 * Get band treasurers - users marked as isTreasurer, or founder if no treasurer
 */
async function getBandTreasurers(bandId: string) {
  const treasurers = await prisma.member.findMany({
    where: {
      bandId,
      isTreasurer: true,
      status: 'ACTIVE',
    },
    include: {
      user: { select: { id: true, name: true, email: true, deletedAt: true } },
    },
  })

  if (treasurers.length === 0) {
    const founder = await prisma.member.findFirst({
      where: {
        bandId,
        role: 'FOUNDER',
        status: 'ACTIVE',
      },
      include: {
        user: { select: { id: true, name: true, email: true, deletedAt: true } },
      },
    })
    return founder ? [founder] : []
  }

  return treasurers
}

/**
 * Check if user is a treasurer (isTreasurer=true OR is founder when no treasurer exists)
 */
async function isUserTreasurer(userId: string, bandId: string): Promise<boolean> {
  // Check if user is marked as treasurer
  const asTreasurer = await prisma.member.findFirst({
    where: {
      userId,
      bandId,
      isTreasurer: true,
      status: 'ACTIVE',
    },
  })

  if (asTreasurer) return true

  // Check if there are any treasurers
  const treasurerCount = await prisma.member.count({
    where: {
      bandId,
      isTreasurer: true,
      status: 'ACTIVE',
    },
  })

  // If no treasurers, check if user is founder
  if (treasurerCount === 0) {
    const asFounder = await prisma.member.findFirst({
      where: {
        userId,
        bandId,
        role: 'FOUNDER',
        status: 'ACTIVE',
      },
    })
    return !!asFounder
  }

  return false
}

/**
 * Check if user is a governor or founder
 */
async function isUserGovernor(userId: string, bandId: string): Promise<boolean> {
  const member = await prisma.member.findFirst({
    where: {
      userId,
      bandId,
      status: 'ACTIVE',
      role: { in: ['GOVERNOR', 'FOUNDER'] },
    },
  })
  return !!member
}

/**
 * Get the member record for a user in a band
 */
async function getMemberForUser(userId: string, bandId: string) {
  return prisma.member.findUnique({
    where: {
      userId_bandId: { userId, bandId },
    },
    include: {
      user: { select: { id: true, name: true, email: true, deletedAt: true } },
    },
  })
}

export const manualPaymentRouter = router({
  /**
   * Record a manual payment
   */
  create: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(), // Current user creating the record
        memberId: z.string(), // Member who paid (Member.id)
        amount: z.number().positive(), // Amount in cents
        paymentMethod: z.enum(['ZELLE', 'VENMO', 'CASHAPP', 'CASH', 'CHECK', 'OTHER']),
        paymentMethodOther: z.string().optional(),
        paymentDate: z.string().transform((s) => new Date(s)),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { bandId, userId, memberId, amount, paymentMethod, paymentMethodOther, paymentDate, note } = input

      // Verify band exists
      const band = await prisma.band.findUnique({
        where: { id: bandId },
        select: { id: true, name: true, slug: true },
      })
      if (!band) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Band not found' })
      }

      // Get the member record (who paid)
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: {
          user: { select: { id: true, name: true, email: true, deletedAt: true } },
        },
      })
      if (!member || member.bandId !== bandId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found in this band' })
      }

      // Get current user's member record
      const currentMember = await getMemberForUser(userId, bandId)
      if (!currentMember || currentMember.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active member of this band' })
      }

      // Determine if user is recording for themselves or someone else
      const isRecordingOwnPayment = member.userId === userId
      const userIsTreasurer = await isUserTreasurer(userId, bandId)

      // Permission: member can record own, treasurer can record for anyone
      if (!isRecordingOwnPayment && !userIsTreasurer) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only treasurers can record payments for other members',
        })
      }

      // Determine initiatedByRole
      const initiatedByRole = userIsTreasurer ? 'TREASURER' : 'MEMBER'

      // Calculate autoConfirmAt (7 days from now)
      const autoConfirmAt = new Date()
      autoConfirmAt.setDate(autoConfirmAt.getDate() + 7)

      // Generate confirmation token for quick confirm page
      const confirmationToken = generateConfirmationToken()

      // Create the manual payment
      const payment = await prisma.manualPayment.create({
        data: {
          bandId,
          memberId,
          memberUserId: member.userId,
          amount,
          currency: 'usd',
          paymentMethod,
          paymentMethodOther: paymentMethod === 'OTHER' ? paymentMethodOther : null,
          paymentDate,
          note,
          initiatedById: userId,
          initiatedByRole,
          status: 'PENDING',
          autoConfirmAt,
          confirmationToken,
        },
        include: {
          member: {
            include: { user: { select: { id: true, name: true } } },
          },
          initiatedBy: { select: { id: true, name: true, deletedAt: true } },
        },
      })

      // Notify the counterparty
      if (initiatedByRole === 'MEMBER') {
        // Member initiated, notify treasurers
        const treasurers = await getBandTreasurers(bandId)
        for (const treasurer of treasurers) {
          await notificationService.create({
            userId: treasurer.userId,
            type: 'MANUAL_PAYMENT_RECORDED',
            title: 'Payment Recorded',
            message: `${currentMember.user.name} has recorded a payment of $${(amount / 100).toFixed(2)}. Please review and confirm.`,
            actionUrl: `/bands/${band.slug}/billing?tab=manual`,
            priority: 'MEDIUM',
            metadata: {
              bandId,
              bandName: band.name,
              paymentId: payment.id,
              amount,
              memberName: currentMember.user.name,
            },
            relatedId: payment.id,
            relatedType: 'ManualPayment',
          })
        }
      } else {
        // Treasurer initiated, notify the member with quick confirm link
        await notificationService.create({
          userId: member.userId,
          type: 'MANUAL_PAYMENT_RECORDED',
          title: 'Payment Recorded',
          message: `${currentMember.user.name} has recorded a payment of $${(amount / 100).toFixed(2)} on your behalf. Please review and confirm.`,
          actionUrl: `/quick/confirm-payment/${payment.id}?token=${confirmationToken}`,
          priority: 'MEDIUM',
          metadata: {
            bandId,
            bandName: band.name,
            paymentId: payment.id,
            amount,
            treasurerName: currentMember.user.name,
          },
          relatedId: payment.id,
          relatedType: 'ManualPayment',
        })
      }

      return { success: true, payment }
    }),

  /**
   * Confirm a pending payment
   */
  confirm: publicProcedure
    .input(
      z.object({
        paymentId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { paymentId, userId } = input

      const payment = await prisma.manualPayment.findUnique({
        where: { id: paymentId },
        include: {
          band: { select: { id: true, name: true, slug: true } },
          member: { include: { user: { select: { id: true, name: true, deletedAt: true } } } },
          initiatedBy: { select: { id: true, name: true, deletedAt: true } },
        },
      })

      if (!payment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' })
      }

      if (payment.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only pending payments can be confirmed',
        })
      }

      // Determine who can confirm: counterparty
      const userIsTreasurer = await isUserTreasurer(userId, payment.bandId)

      // If member initiated, treasurer confirms. If treasurer initiated, member confirms.
      const canConfirm =
        (payment.initiatedByRole === 'MEMBER' && userIsTreasurer) ||
        (payment.initiatedByRole === 'TREASURER' && payment.memberUserId === userId)

      if (!canConfirm) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to confirm this payment',
        })
      }

      // Update payment status
      const updatedPayment = await prisma.manualPayment.update({
        where: { id: paymentId },
        data: {
          status: 'CONFIRMED',
          confirmedById: userId,
          confirmedAt: new Date(),
        },
      })

      // Update BandMemberBilling
      await prisma.bandMemberBilling.upsert({
        where: {
          bandId_memberUserId: {
            bandId: payment.bandId,
            memberUserId: payment.memberUserId,
          },
        },
        create: {
          bandId: payment.bandId,
          memberUserId: payment.memberUserId,
          status: 'ACTIVE',
          lastPaymentAt: payment.paymentDate,
        },
        update: {
          status: 'ACTIVE',
          lastPaymentAt: payment.paymentDate,
        },
      })

      // Notify the initiator
      await notificationService.create({
        userId: payment.initiatedById,
        type: 'MANUAL_PAYMENT_CONFIRMED',
        title: 'Payment Confirmed',
        message: `Your recorded payment of $${(payment.amount / 100).toFixed(2)} has been confirmed.`,
        actionUrl: `/bands/${payment.band.slug}/billing?tab=manual`,
        priority: 'LOW',
        metadata: {
          bandId: payment.bandId,
          bandName: payment.band.name,
          paymentId: payment.id,
          amount: payment.amount,
        },
        relatedId: payment.id,
        relatedType: 'ManualPayment',
      })

      return { success: true, payment: updatedPayment }
    }),

  /**
   * Dispute a pending payment
   */
  dispute: publicProcedure
    .input(
      z.object({
        paymentId: z.string(),
        userId: z.string(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const { paymentId, userId, reason } = input

      const payment = await prisma.manualPayment.findUnique({
        where: { id: paymentId },
        include: {
          band: { select: { id: true, name: true, slug: true } },
          member: { include: { user: { select: { id: true, name: true, deletedAt: true } } } },
          initiatedBy: { select: { id: true, name: true, deletedAt: true } },
        },
      })

      if (!payment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' })
      }

      if (payment.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only pending payments can be disputed',
        })
      }

      // Determine who can dispute: counterparty
      const userIsTreasurer = await isUserTreasurer(userId, payment.bandId)

      const canDispute =
        (payment.initiatedByRole === 'MEMBER' && userIsTreasurer) ||
        (payment.initiatedByRole === 'TREASURER' && payment.memberUserId === userId)

      if (!canDispute) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to dispute this payment',
        })
      }

      // Update payment status
      const updatedPayment = await prisma.manualPayment.update({
        where: { id: paymentId },
        data: {
          status: 'DISPUTED',
          disputedById: userId,
          disputedAt: new Date(),
          disputeReason: reason,
        },
      })

      // Notify initiator
      await notificationService.create({
        userId: payment.initiatedById,
        type: 'MANUAL_PAYMENT_DISPUTED',
        title: 'Payment Disputed',
        message: `Your recorded payment of $${(payment.amount / 100).toFixed(2)} has been disputed.`,
        actionUrl: `/bands/${payment.band.slug}/billing?tab=manual`,
        priority: 'HIGH',
        metadata: {
          bandId: payment.bandId,
          bandName: payment.band.name,
          paymentId: payment.id,
          amount: payment.amount,
          reason,
        },
        relatedId: payment.id,
        relatedType: 'ManualPayment',
      })

      // Notify governors
      const governors = await prisma.member.findMany({
        where: {
          bandId: payment.bandId,
          status: 'ACTIVE',
          role: { in: ['GOVERNOR', 'FOUNDER'] },
        },
        select: { userId: true },
      })

      for (const governor of governors) {
        // Don't notify if already the disputer
        if (governor.userId === userId) continue

        await notificationService.create({
          userId: governor.userId,
          type: 'MANUAL_PAYMENT_DISPUTED',
          title: 'Payment Dispute Needs Resolution',
          message: `A payment of $${(payment.amount / 100).toFixed(2)} from ${payment.member.user.name} has been disputed and needs resolution.`,
          actionUrl: `/bands/${payment.band.slug}/billing?tab=manual`,
          priority: 'HIGH',
          metadata: {
            bandId: payment.bandId,
            bandName: payment.band.name,
            paymentId: payment.id,
            amount: payment.amount,
            reason,
          },
          relatedId: payment.id,
          relatedType: 'ManualPayment',
        })
      }

      return { success: true, payment: updatedPayment }
    }),

  /**
   * Resolve a disputed payment (Governor/Founder only)
   */
  resolve: publicProcedure
    .input(
      z.object({
        paymentId: z.string(),
        userId: z.string(),
        outcome: z.enum(['CONFIRMED', 'REJECTED']),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { paymentId, userId, outcome, note } = input

      const payment = await prisma.manualPayment.findUnique({
        where: { id: paymentId },
        include: {
          band: { select: { id: true, name: true, slug: true } },
          member: { include: { user: { select: { id: true, name: true, deletedAt: true } } } },
          initiatedBy: { select: { id: true, name: true, deletedAt: true } },
        },
      })

      if (!payment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' })
      }

      if (payment.status !== 'DISPUTED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only disputed payments can be resolved',
        })
      }

      // Only governors can resolve
      const isGovernor = await isUserGovernor(userId, payment.bandId)
      if (!isGovernor) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only governors or founders can resolve disputes',
        })
      }

      // Update payment
      const finalStatus = outcome === 'CONFIRMED' ? 'CONFIRMED' : 'REJECTED'
      const updatedPayment = await prisma.manualPayment.update({
        where: { id: paymentId },
        data: {
          status: finalStatus,
          resolvedById: userId,
          resolvedAt: new Date(),
          resolutionNote: note,
          resolutionOutcome: outcome,
          // If confirmed, also set confirmedBy
          ...(outcome === 'CONFIRMED' && {
            confirmedById: userId,
            confirmedAt: new Date(),
          }),
        },
      })

      // If confirmed, update BandMemberBilling
      if (outcome === 'CONFIRMED') {
        await prisma.bandMemberBilling.upsert({
          where: {
            bandId_memberUserId: {
              bandId: payment.bandId,
              memberUserId: payment.memberUserId,
            },
          },
          create: {
            bandId: payment.bandId,
            memberUserId: payment.memberUserId,
            status: 'ACTIVE',
            lastPaymentAt: payment.paymentDate,
          },
          update: {
            status: 'ACTIVE',
            lastPaymentAt: payment.paymentDate,
          },
        })
      }

      // Notify both parties
      const notifyUserIds = new Set([payment.initiatedById, payment.memberUserId])
      for (const notifyUserId of notifyUserIds) {
        await notificationService.create({
          userId: notifyUserId,
          type: 'MANUAL_PAYMENT_RESOLVED',
          title: 'Payment Dispute Resolved',
          message: `The disputed payment of $${(payment.amount / 100).toFixed(2)} has been ${outcome.toLowerCase()}.`,
          actionUrl: `/bands/${payment.band.slug}/billing?tab=manual`,
          priority: 'MEDIUM',
          metadata: {
            bandId: payment.bandId,
            bandName: payment.band.name,
            paymentId: payment.id,
            amount: payment.amount,
            outcome,
          },
          relatedId: payment.id,
          relatedType: 'ManualPayment',
        })
      }

      return { success: true, payment: updatedPayment }
    }),

  /**
   * List manual payments for a band
   */
  list: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        status: z.enum(['PENDING', 'CONFIRMED', 'DISPUTED', 'REJECTED', 'AUTO_CONFIRMED']).optional(),
        memberId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { bandId, userId, status, memberId, limit, cursor } = input

      // Verify user is member
      const currentMember = await getMemberForUser(userId, bandId)
      if (!currentMember || currentMember.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active member' })
      }

      // Determine if user can see all payments
      const userIsTreasurer = await isUserTreasurer(userId, bandId)
      const isGovernor = await isUserGovernor(userId, bandId)
      const canSeeAll = userIsTreasurer || isGovernor

      // Build where clause
      const where: any = { bandId }
      if (status) where.status = status
      if (memberId) where.memberId = memberId

      // If user can't see all, only show their own payments
      if (!canSeeAll) {
        where.memberUserId = userId
      }

      if (cursor) {
        where.id = { lt: cursor }
      }

      const payments = await prisma.manualPayment.findMany({
        where,
        include: {
          member: {
            include: { user: { select: { id: true, name: true } } },
          },
          initiatedBy: { select: { id: true, name: true, deletedAt: true } },
          confirmedBy: { select: { id: true, name: true, deletedAt: true } },
          disputedBy: { select: { id: true, name: true, deletedAt: true } },
          resolvedBy: { select: { id: true, name: true, deletedAt: true } },
          files: { select: { id: true, filename: true, url: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      })

      let nextCursor: string | undefined
      if (payments.length > limit) {
        const nextItem = payments.pop()
        nextCursor = nextItem?.id
      }

      return {
        success: true,
        payments,
        nextCursor,
      }
    }),

  /**
   * Get payments requiring user's action (counterparty pending)
   */
  myPending: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { bandId, userId } = input

      // Verify user is member
      const currentMember = await getMemberForUser(userId, bandId)
      if (!currentMember || currentMember.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active member' })
      }

      const userIsTreasurer = await isUserTreasurer(userId, bandId)

      // Find payments where user is the counterparty
      // - If user is member and payment was initiated by treasurer: member needs to confirm
      // - If user is treasurer and payment was initiated by member: treasurer needs to confirm
      const payments = await prisma.manualPayment.findMany({
        where: {
          bandId,
          status: 'PENDING',
          OR: [
            // User is the member and treasurer initiated
            {
              memberUserId: userId,
              initiatedByRole: 'TREASURER',
            },
            // User is treasurer and member initiated
            ...(userIsTreasurer
              ? [
                  {
                    initiatedByRole: 'MEMBER' as const,
                    NOT: { initiatedById: userId }, // Not their own
                  },
                ]
              : []),
          ],
        },
        include: {
          member: {
            include: { user: { select: { id: true, name: true } } },
          },
          initiatedBy: { select: { id: true, name: true, deletedAt: true } },
          files: { select: { id: true, filename: true, url: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      return { success: true, payments }
    }),

  /**
   * Get single payment details
   */
  get: publicProcedure
    .input(
      z.object({
        paymentId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { paymentId, userId } = input

      const payment = await prisma.manualPayment.findUnique({
        where: { id: paymentId },
        include: {
          band: { select: { id: true, name: true, slug: true } },
          member: {
            include: { user: { select: { id: true, name: true, email: true, deletedAt: true } } },
          },
          initiatedBy: { select: { id: true, name: true, deletedAt: true } },
          confirmedBy: { select: { id: true, name: true, deletedAt: true } },
          disputedBy: { select: { id: true, name: true, deletedAt: true } },
          resolvedBy: { select: { id: true, name: true, deletedAt: true } },
          files: { select: { id: true, filename: true, url: true, category: true, originalName: true } },
        },
      })

      if (!payment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' })
      }

      // Check permission: must be involved party or admin
      const userIsTreasurer = await isUserTreasurer(userId, payment.bandId)
      const isGovernor = await isUserGovernor(userId, payment.bandId)
      const isInvolvedParty =
        payment.memberUserId === userId ||
        payment.initiatedById === userId ||
        payment.confirmedById === userId ||
        payment.disputedById === userId ||
        payment.resolvedById === userId

      if (!isInvolvedParty && !userIsTreasurer && !isGovernor) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to view this payment' })
      }

      return { success: true, payment }
    }),

  /**
   * Get disputed payments for governors to resolve
   */
  getDisputedPayments: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { bandId, userId } = input

      // Only governors can see disputed payments
      const isGovernor = await isUserGovernor(userId, bandId)
      if (!isGovernor) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only governors or founders can view disputed payments',
        })
      }

      const payments = await prisma.manualPayment.findMany({
        where: {
          bandId,
          status: 'DISPUTED',
        },
        include: {
          member: {
            include: { user: { select: { id: true, name: true } } },
          },
          initiatedBy: { select: { id: true, name: true, deletedAt: true } },
          disputedBy: { select: { id: true, name: true, deletedAt: true } },
          files: { select: { id: true, filename: true, url: true, category: true } },
        },
        orderBy: { disputedAt: 'desc' },
      })

      return { success: true, payments }
    }),

  /**
   * Get band members for payment creation dropdown
   */
  getBandMembers: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { bandId, userId } = input

      // Verify user is member
      const currentMember = await getMemberForUser(userId, bandId)
      if (!currentMember || currentMember.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active member' })
      }

      const members = await prisma.member.findMany({
        where: {
          bandId,
          status: 'ACTIVE',
        },
        include: {
          user: { select: { id: true, name: true, email: true, deletedAt: true } },
        },
        orderBy: { user: { name: 'asc' } },
      })

      return {
        success: true,
        members: members.map((m) => ({
          id: m.id,
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          isTreasurer: m.isTreasurer,
        })),
      }
    }),
})
