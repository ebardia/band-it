import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../services/notification.service'

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
      user: { select: { id: true, name: true, email: true } },
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
        user: { select: { id: true, name: true, email: true } },
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
  const asTreasurer = await prisma.member.findFirst({
    where: {
      userId,
      bandId,
      isTreasurer: true,
      status: 'ACTIVE',
    },
  })

  if (asTreasurer) return true

  const treasurerCount = await prisma.member.count({
    where: {
      bandId,
      isTreasurer: true,
      status: 'ACTIVE',
    },
  })

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
 * Get the member record for a user in a band
 */
async function getMemberForUser(userId: string, bandId: string) {
  return prisma.member.findUnique({
    where: {
      userId_bandId: { userId, bandId },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })
}

/**
 * Calculate the next due date based on frequency
 */
function calculateNextDueDate(
  currentDate: Date,
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
  dayOfWeek?: number,
  dayOfMonth?: number
): Date {
  const nextDate = new Date(currentDate)

  switch (frequency) {
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1)
      if (dayOfMonth) {
        nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()))
      }
      break
    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + 3)
      if (dayOfMonth) {
        nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()))
      }
      break
    case 'YEARLY':
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
  }

  return nextDate
}

export const donationRouter = router({
  // ============================================
  // SETTINGS
  // ============================================

  /**
   * Get donation settings for a band
   */
  getSettings: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { bandId, userId } = input

      // Verify user is member
      const member = await getMemberForUser(userId, bandId)
      if (!member || member.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active member' })
      }

      const settings = await prisma.bandFinanceSettings.findUnique({
        where: { bandId },
      })

      const band = await prisma.band.findUnique({
        where: { id: bandId },
        select: { slug: true, name: true },
      })

      return {
        success: true,
        settings: settings || {
          donationsEnabled: false,
          donationPaymentInfo: null,
          donationDefaultBucketId: null,
          donationDueWindowDays: 7,
        },
        band,
      }
    }),

  /**
   * Update donation settings (treasurer only)
   */
  updateSettings: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        donationsEnabled: z.boolean().optional(),
        donationPaymentInfo: z.record(z.string()).optional(),
        donationDefaultBucketId: z.string().nullable().optional(),
        donationDueWindowDays: z.number().min(1).max(30).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { bandId, userId, ...updates } = input

      // Verify user is treasurer
      const isTreasurer = await isUserTreasurer(userId, bandId)
      if (!isTreasurer) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only treasurers can update donation settings' })
      }

      const settings = await prisma.bandFinanceSettings.upsert({
        where: { bandId },
        create: {
          bandId,
          donationsEnabled: updates.donationsEnabled ?? false,
          donationPaymentInfo: updates.donationPaymentInfo ?? Prisma.DbNull,
          donationDefaultBucketId: updates.donationDefaultBucketId ?? null,
          donationDueWindowDays: updates.donationDueWindowDays ?? 7,
        },
        update: {
          ...(updates.donationsEnabled !== undefined && { donationsEnabled: updates.donationsEnabled }),
          ...(updates.donationPaymentInfo !== undefined && {
            donationPaymentInfo: updates.donationPaymentInfo ?? Prisma.DbNull
          }),
          ...(updates.donationDefaultBucketId !== undefined && { donationDefaultBucketId: updates.donationDefaultBucketId }),
          ...(updates.donationDueWindowDays !== undefined && { donationDueWindowDays: updates.donationDueWindowDays }),
        },
      })

      return { success: true, settings }
    }),

  // ============================================
  // ONE-TIME DONATIONS
  // ============================================

  /**
   * Create a one-time donation (donor submits payment)
   */
  createOneTime: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(), // Donor's user ID
        amount: z.number().positive(),
        paymentMethod: z.enum(['ZELLE', 'VENMO', 'CASHAPP', 'CASH', 'CHECK', 'OTHER']),
        paymentMethodOther: z.string().optional(),
        referenceNumber: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { bandId, userId, amount, paymentMethod, paymentMethodOther, referenceNumber, note } = input

      // Get band
      const band = await prisma.band.findUnique({
        where: { id: bandId },
        select: { id: true, name: true, slug: true },
      })
      if (!band) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Band not found' })
      }

      // Check donations are enabled
      const settings = await prisma.bandFinanceSettings.findUnique({
        where: { bandId },
      })
      if (!settings?.donationsEnabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Donations are not enabled for this band' })
      }

      // Verify user is a member
      const member = await getMemberForUser(userId, bandId)
      if (!member || member.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active member to donate' })
      }

      // Create donation
      const donation = await prisma.donation.create({
        data: {
          bandId,
          donorId: userId,
          amount,
          paymentMethod,
          paymentMethodOther: paymentMethod === 'OTHER' ? paymentMethodOther : null,
          referenceNumber,
          donorNote: note,
          status: 'PENDING',
          submittedAt: new Date(),
        },
      })

      // Notify treasurers
      const treasurers = await getBandTreasurers(bandId)
      for (const treasurer of treasurers) {
        await notificationService.create({
          userId: treasurer.userId,
          type: 'DONATION_RECEIVED',
          title: 'New Donation Received',
          message: `${member.user.name} has submitted a donation of $${(amount / 100).toFixed(2)}. Please review and confirm.`,
          actionUrl: `/bands/${band.slug}/billing?tab=donations`,
          priority: 'MEDIUM',
          metadata: {
            bandId,
            bandName: band.name,
            donationId: donation.id,
            amount,
            donorName: member.user.name,
          },
          relatedId: donation.id,
          relatedType: 'Donation',
        })
      }

      return { success: true, donation }
    }),

  // ============================================
  // RECURRING DONATIONS
  // ============================================

  /**
   * Create a recurring donation commitment
   */
  createRecurring: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        amount: z.number().positive(),
        frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
        paymentMethod: z.enum(['ZELLE', 'VENMO', 'CASHAPP', 'CASH', 'CHECK', 'OTHER']),
        paymentMethodOther: z.string().optional(),
        startDate: z.string().transform((s) => new Date(s)),
        dayOfWeek: z.number().min(0).max(6).optional(),
        dayOfMonth: z.number().min(1).max(28).optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { bandId, userId, amount, frequency, paymentMethod, paymentMethodOther, startDate, dayOfWeek, dayOfMonth, note } = input

      // Get band
      const band = await prisma.band.findUnique({
        where: { id: bandId },
        select: { id: true, name: true, slug: true },
      })
      if (!band) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Band not found' })
      }

      // Check donations are enabled
      const settings = await prisma.bandFinanceSettings.findUnique({
        where: { bandId },
      })
      if (!settings?.donationsEnabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Donations are not enabled for this band' })
      }

      // Verify user is a member
      const member = await getMemberForUser(userId, bandId)
      if (!member || member.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active member to donate' })
      }

      // Create recurring donation
      const recurringDonation = await prisma.recurringDonation.create({
        data: {
          bandId,
          donorId: userId,
          amount,
          frequency,
          paymentMethod,
          paymentMethodOther: paymentMethod === 'OTHER' ? paymentMethodOther : null,
          startDate,
          nextDueDate: startDate,
          dayOfWeek: frequency === 'WEEKLY' ? dayOfWeek : null,
          dayOfMonth: ['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(frequency) ? dayOfMonth : null,
          status: 'ACTIVE',
          note,
        },
      })

      // Create the first EXPECTED donation
      const dueWindowDays = settings?.donationDueWindowDays ?? 7
      await prisma.donation.create({
        data: {
          bandId,
          donorId: userId,
          amount,
          paymentMethod,
          paymentMethodOther: paymentMethod === 'OTHER' ? paymentMethodOther : null,
          recurringDonationId: recurringDonation.id,
          status: 'EXPECTED',
          expectedDate: startDate,
          dueWindowDays,
        },
      })

      // Notify treasurers about new recurring commitment
      const treasurers = await getBandTreasurers(bandId)
      for (const treasurer of treasurers) {
        await notificationService.create({
          userId: treasurer.userId,
          type: 'DONATION_RECEIVED',
          title: 'New Recurring Donation',
          message: `${member.user.name} has committed to a ${frequency.toLowerCase()} donation of $${(amount / 100).toFixed(2)}.`,
          actionUrl: `/bands/${band.slug}/billing?tab=donations`,
          priority: 'LOW',
          metadata: {
            bandId,
            bandName: band.name,
            recurringDonationId: recurringDonation.id,
            amount,
            frequency,
            donorName: member.user.name,
          },
          relatedId: recurringDonation.id,
          relatedType: 'RecurringDonation',
        })
      }

      return { success: true, recurringDonation }
    }),

  /**
   * Submit payment for an expected donation
   */
  submitPayment: publicProcedure
    .input(
      z.object({
        donationId: z.string(),
        userId: z.string(),
        referenceNumber: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { donationId, userId, referenceNumber, note } = input

      const donation = await prisma.donation.findUnique({
        where: { id: donationId },
        include: {
          band: { select: { id: true, name: true, slug: true } },
        },
      })

      if (!donation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Donation not found' })
      }

      // Only the donor can submit payment
      if (donation.donorId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the donor can submit payment' })
      }

      // Only EXPECTED donations can be submitted
      if (donation.status !== 'EXPECTED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only expected donations can be submitted' })
      }

      // Update donation
      const updatedDonation = await prisma.donation.update({
        where: { id: donationId },
        data: {
          status: 'PENDING',
          referenceNumber,
          donorNote: note,
          submittedAt: new Date(),
        },
      })

      // Get donor name
      const donor = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })

      // Notify treasurers
      const treasurers = await getBandTreasurers(donation.bandId)
      for (const treasurer of treasurers) {
        await notificationService.create({
          userId: treasurer.userId,
          type: 'DONATION_RECEIVED',
          title: 'Donation Payment Submitted',
          message: `${donor?.name || 'A member'} has submitted a donation payment of $${(donation.amount / 100).toFixed(2)}. Please review and confirm.`,
          actionUrl: `/bands/${donation.band.slug}/billing?tab=donations`,
          priority: 'MEDIUM',
          metadata: {
            bandId: donation.bandId,
            bandName: donation.band.name,
            donationId: donation.id,
            amount: donation.amount,
            donorName: donor?.name,
          },
          relatedId: donation.id,
          relatedType: 'Donation',
        })
      }

      return { success: true, donation: updatedDonation }
    }),

  // ============================================
  // TREASURER ACTIONS
  // ============================================

  /**
   * Confirm a pending donation (treasurer only)
   */
  confirm: publicProcedure
    .input(
      z.object({
        donationId: z.string(),
        userId: z.string(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { donationId, userId, note } = input

      const donation = await prisma.donation.findUnique({
        where: { id: donationId },
        include: {
          band: { select: { id: true, name: true, slug: true } },
          recurringDonation: true,
        },
      })

      if (!donation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Donation not found' })
      }

      // Only treasurer can confirm
      const isTreasurer = await isUserTreasurer(userId, donation.bandId)
      if (!isTreasurer) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only treasurers can confirm donations' })
      }

      // Only PENDING donations can be confirmed
      if (donation.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only pending donations can be confirmed' })
      }

      // Update donation
      const updatedDonation = await prisma.donation.update({
        where: { id: donationId },
        data: {
          status: 'CONFIRMED',
          confirmedById: userId,
          confirmedAt: new Date(),
          confirmationNote: note,
        },
      })

      // If this is a recurring donation, update nextDueDate and reset missedCount
      if (donation.recurringDonation) {
        const nextDueDate = calculateNextDueDate(
          donation.recurringDonation.nextDueDate,
          donation.recurringDonation.frequency,
          donation.recurringDonation.dayOfWeek ?? undefined,
          donation.recurringDonation.dayOfMonth ?? undefined
        )

        await prisma.recurringDonation.update({
          where: { id: donation.recurringDonation.id },
          data: {
            nextDueDate,
            missedCount: 0, // Reset missed count on successful payment
          },
        })

        // Create next EXPECTED donation
        const settings = await prisma.bandFinanceSettings.findUnique({
          where: { bandId: donation.bandId },
        })
        const dueWindowDays = settings?.donationDueWindowDays ?? 7

        await prisma.donation.create({
          data: {
            bandId: donation.bandId,
            donorId: donation.donorId,
            amount: donation.recurringDonation.amount,
            paymentMethod: donation.recurringDonation.paymentMethod,
            paymentMethodOther: donation.recurringDonation.paymentMethodOther,
            recurringDonationId: donation.recurringDonation.id,
            status: 'EXPECTED',
            expectedDate: nextDueDate,
            dueWindowDays,
          },
        })
      }

      // Notify donor
      await notificationService.create({
        userId: donation.donorId,
        type: 'DONATION_CONFIRMED',
        title: 'Donation Confirmed',
        message: `Your donation of $${(donation.amount / 100).toFixed(2)} has been confirmed. Thank you!`,
        actionUrl: `/bands/${donation.band.slug}/billing?tab=my-donations`,
        priority: 'LOW',
        metadata: {
          bandId: donation.bandId,
          bandName: donation.band.name,
          donationId: donation.id,
          amount: donation.amount,
        },
        relatedId: donation.id,
        relatedType: 'Donation',
      })

      return { success: true, donation: updatedDonation }
    }),

  /**
   * Reject a pending donation (treasurer only)
   */
  reject: publicProcedure
    .input(
      z.object({
        donationId: z.string(),
        userId: z.string(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const { donationId, userId, reason } = input

      const donation = await prisma.donation.findUnique({
        where: { id: donationId },
        include: {
          band: { select: { id: true, name: true, slug: true } },
        },
      })

      if (!donation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Donation not found' })
      }

      // Only treasurer can reject
      const isTreasurer = await isUserTreasurer(userId, donation.bandId)
      if (!isTreasurer) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only treasurers can reject donations' })
      }

      // Only PENDING donations can be rejected
      if (donation.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only pending donations can be rejected' })
      }

      // Update donation
      const updatedDonation = await prisma.donation.update({
        where: { id: donationId },
        data: {
          status: 'REJECTED',
          rejectedById: userId,
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      })

      // Notify donor
      await notificationService.create({
        userId: donation.donorId,
        type: 'DONATION_REJECTED',
        title: 'Donation Not Confirmed',
        message: `Your donation of $${(donation.amount / 100).toFixed(2)} could not be confirmed. Reason: ${reason}`,
        actionUrl: `/bands/${donation.band.slug}/billing?tab=my-donations`,
        priority: 'HIGH',
        metadata: {
          bandId: donation.bandId,
          bandName: donation.band.name,
          donationId: donation.id,
          amount: donation.amount,
          reason,
        },
        relatedId: donation.id,
        relatedType: 'Donation',
      })

      return { success: true, donation: updatedDonation }
    }),

  // ============================================
  // CANCELLATION
  // ============================================

  /**
   * Cancel a recurring donation (donor only)
   */
  cancelRecurring: publicProcedure
    .input(
      z.object({
        recurringDonationId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { recurringDonationId, userId } = input

      const recurringDonation = await prisma.recurringDonation.findUnique({
        where: { id: recurringDonationId },
        include: {
          band: { select: { id: true, name: true, slug: true } },
        },
      })

      if (!recurringDonation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recurring donation not found' })
      }

      // Only the donor can cancel
      if (recurringDonation.donorId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the donor can cancel this recurring donation' })
      }

      // Already cancelled?
      if (recurringDonation.status === 'CANCELLED' || recurringDonation.status === 'AUTO_CANCELLED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This recurring donation is already cancelled' })
      }

      // Update recurring donation
      const updatedRecurring = await prisma.recurringDonation.update({
        where: { id: recurringDonationId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      })

      // Cancel any EXPECTED donations
      await prisma.donation.updateMany({
        where: {
          recurringDonationId,
          status: 'EXPECTED',
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      })

      // Get donor name
      const donor = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })

      // Notify treasurers
      const treasurers = await getBandTreasurers(recurringDonation.bandId)
      for (const treasurer of treasurers) {
        await notificationService.create({
          userId: treasurer.userId,
          type: 'RECURRING_DONATION_CANCELLED',
          title: 'Recurring Donation Cancelled',
          message: `${donor?.name || 'A member'} has cancelled their ${recurringDonation.frequency.toLowerCase()} donation of $${(recurringDonation.amount / 100).toFixed(2)}.`,
          actionUrl: `/bands/${recurringDonation.band.slug}/billing?tab=donations`,
          priority: 'LOW',
          metadata: {
            bandId: recurringDonation.bandId,
            bandName: recurringDonation.band.name,
            recurringDonationId: recurringDonation.id,
            amount: recurringDonation.amount,
            frequency: recurringDonation.frequency,
            donorName: donor?.name,
          },
          relatedId: recurringDonation.id,
          relatedType: 'RecurringDonation',
        })
      }

      return { success: true, recurringDonation: updatedRecurring }
    }),

  /**
   * Pause a recurring donation (donor only)
   */
  pauseRecurring: publicProcedure
    .input(
      z.object({
        recurringDonationId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { recurringDonationId, userId } = input

      const recurringDonation = await prisma.recurringDonation.findUnique({
        where: { id: recurringDonationId },
      })

      if (!recurringDonation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recurring donation not found' })
      }

      if (recurringDonation.donorId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the donor can pause this recurring donation' })
      }

      if (recurringDonation.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only active recurring donations can be paused' })
      }

      const updatedRecurring = await prisma.recurringDonation.update({
        where: { id: recurringDonationId },
        data: {
          status: 'PAUSED',
          pausedAt: new Date(),
        },
      })

      return { success: true, recurringDonation: updatedRecurring }
    }),

  /**
   * Resume a paused recurring donation (donor only)
   */
  resumeRecurring: publicProcedure
    .input(
      z.object({
        recurringDonationId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { recurringDonationId, userId } = input

      const recurringDonation = await prisma.recurringDonation.findUnique({
        where: { id: recurringDonationId },
      })

      if (!recurringDonation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recurring donation not found' })
      }

      if (recurringDonation.donorId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the donor can resume this recurring donation' })
      }

      if (recurringDonation.status !== 'PAUSED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only paused recurring donations can be resumed' })
      }

      // Calculate next due date from now
      const nextDueDate = calculateNextDueDate(
        new Date(),
        recurringDonation.frequency,
        recurringDonation.dayOfWeek ?? undefined,
        recurringDonation.dayOfMonth ?? undefined
      )

      const updatedRecurring = await prisma.recurringDonation.update({
        where: { id: recurringDonationId },
        data: {
          status: 'ACTIVE',
          pausedAt: null,
          nextDueDate,
        },
      })

      // Create next EXPECTED donation
      const settings = await prisma.bandFinanceSettings.findUnique({
        where: { bandId: recurringDonation.bandId },
      })
      const dueWindowDays = settings?.donationDueWindowDays ?? 7

      await prisma.donation.create({
        data: {
          bandId: recurringDonation.bandId,
          donorId: recurringDonation.donorId,
          amount: recurringDonation.amount,
          paymentMethod: recurringDonation.paymentMethod,
          paymentMethodOther: recurringDonation.paymentMethodOther,
          recurringDonationId: recurringDonation.id,
          status: 'EXPECTED',
          expectedDate: nextDueDate,
          dueWindowDays,
        },
      })

      return { success: true, recurringDonation: updatedRecurring }
    }),

  // ============================================
  // LIST & QUERY
  // ============================================

  /**
   * List donations for a band (treasurer sees all, members see own)
   */
  list: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        status: z.enum(['EXPECTED', 'PENDING', 'CONFIRMED', 'MISSED', 'REJECTED', 'CANCELLED']).optional(),
        donorId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { bandId, userId, status, donorId, limit, cursor } = input

      // Verify user is member
      const member = await getMemberForUser(userId, bandId)
      if (!member || member.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active member' })
      }

      // Determine if user can see all donations
      const isTreasurer = await isUserTreasurer(userId, bandId)

      // Build where clause
      const where: any = { bandId }
      if (status) where.status = status
      if (donorId) where.donorId = donorId

      // Non-treasurers can only see their own donations
      if (!isTreasurer) {
        where.donorId = userId
      }

      if (cursor) {
        where.id = { lt: cursor }
      }

      const donations = await prisma.donation.findMany({
        where,
        include: {
          recurringDonation: {
            select: { id: true, frequency: true, status: true },
          },
          confirmedBy: { select: { id: true, name: true } },
          rejectedBy: { select: { id: true, name: true } },
          files: { select: { id: true, filename: true, url: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      })

      // Include donor info for treasurers
      const donationsWithDonor = await Promise.all(
        donations.map(async (d) => {
          const donor = await prisma.user.findUnique({
            where: { id: d.donorId },
            select: { id: true, name: true },
          })
          return { ...d, donor }
        })
      )

      let nextCursor: string | undefined
      if (donationsWithDonor.length > limit) {
        const nextItem = donationsWithDonor.pop()
        nextCursor = nextItem?.id
      }

      return {
        success: true,
        donations: donationsWithDonor,
        nextCursor,
      }
    }),

  /**
   * List recurring donations
   */
  listRecurring: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED', 'AUTO_CANCELLED']).optional(),
      })
    )
    .query(async ({ input }) => {
      const { bandId, userId, status } = input

      // Verify user is member
      const member = await getMemberForUser(userId, bandId)
      if (!member || member.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active member' })
      }

      // Determine if user can see all
      const isTreasurer = await isUserTreasurer(userId, bandId)

      const where: any = { bandId }
      if (status) where.status = status

      // Non-treasurers can only see their own
      if (!isTreasurer) {
        where.donorId = userId
      }

      const recurringDonations = await prisma.recurringDonation.findMany({
        where,
        include: {
          donations: {
            where: { status: { in: ['EXPECTED', 'PENDING'] } },
            orderBy: { expectedDate: 'asc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Include donor info for treasurers
      const recurringWithDonor = await Promise.all(
        recurringDonations.map(async (rd) => {
          const donor = await prisma.user.findUnique({
            where: { id: rd.donorId },
            select: { id: true, name: true },
          })
          return { ...rd, donor }
        })
      )

      return {
        success: true,
        recurringDonations: recurringWithDonor,
      }
    }),

  /**
   * Get donation summary for treasurer dashboard
   */
  getSummary: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { bandId, userId } = input

      // Only treasurer can see summary
      const isTreasurer = await isUserTreasurer(userId, bandId)
      if (!isTreasurer) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only treasurers can view donation summary' })
      }

      const [
        pendingCount,
        expectedCount,
        confirmedThisMonth,
        activeRecurringCount,
        totalConfirmedAmount,
      ] = await Promise.all([
        prisma.donation.count({
          where: { bandId, status: 'PENDING' },
        }),
        prisma.donation.count({
          where: { bandId, status: 'EXPECTED' },
        }),
        prisma.donation.count({
          where: {
            bandId,
            status: 'CONFIRMED',
            confirmedAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        prisma.recurringDonation.count({
          where: { bandId, status: 'ACTIVE' },
        }),
        prisma.donation.aggregate({
          where: { bandId, status: 'CONFIRMED' },
          _sum: { amount: true },
        }),
      ])

      return {
        success: true,
        summary: {
          pendingCount,
          expectedCount,
          confirmedThisMonth,
          activeRecurringCount,
          totalConfirmedAmount: totalConfirmedAmount._sum.amount || 0,
        },
      }
    }),

  /**
   * Get my donations (for donor view)
   */
  getMyDonations: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { bandId, userId } = input

      // Verify user is member
      const member = await getMemberForUser(userId, bandId)
      if (!member || member.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be an active member' })
      }

      const [donations, recurringDonations, totalDonated] = await Promise.all([
        prisma.donation.findMany({
          where: { bandId, donorId: userId },
          include: {
            recurringDonation: {
              select: { id: true, frequency: true, status: true },
            },
            confirmedBy: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.recurringDonation.findMany({
          where: { bandId, donorId: userId },
          include: {
            donations: {
              where: { status: 'EXPECTED' },
              orderBy: { expectedDate: 'asc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.donation.aggregate({
          where: { bandId, donorId: userId, status: 'CONFIRMED' },
          _sum: { amount: true },
        }),
      ])

      return {
        success: true,
        donations,
        recurringDonations,
        totalDonated: totalDonated._sum.amount || 0,
      }
    }),
})
