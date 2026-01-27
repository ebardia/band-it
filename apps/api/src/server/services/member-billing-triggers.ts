import { prisma } from '../../lib/prisma'
import { bandBillingService } from './band-billing.service'
import { notificationService } from '../../services/notification.service'

/**
 * Centralized service for handling billing-related triggers when member count changes
 */
export const memberBillingTriggers = {
  /**
   * Called when a member becomes ACTIVE in a band
   * Handles:
   * - 3rd member: Set billingStatus to PENDING, assign billing owner
   * - 21st member: Auto-upgrade subscription
   */
  async onMemberActivated(bandId: string): Promise<void> {
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        billingStatus: true,
        billingOwnerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        createdById: true,
      },
    })

    if (!band) return

    // Count active members
    const activeCount = await prisma.member.count({
      where: { bandId, status: 'ACTIVE' },
    })

    console.log(`Band ${band.name}: ${activeCount} active members`)

    // === 3rd member joined - require payment ===
    if (activeCount === 3 && band.billingStatus === 'NONE') {
      // Find the founder to be initial billing owner
      const founder = await prisma.member.findFirst({
        where: { bandId, role: 'FOUNDER', status: 'ACTIVE' },
        select: { userId: true },
      })

      const billingOwnerId = founder?.userId || band.createdById

      await prisma.band.update({
        where: { id: bandId },
        data: {
          billingStatus: 'PENDING',
          billingOwnerId,
        },
      })

      console.log(`Band ${band.name}: Billing status set to PENDING, owner: ${billingOwnerId}`)

      // Notify billing owner that payment is required
      await notificationService.create({
        userId: billingOwnerId,
        type: 'BILLING_PAYMENT_REQUIRED',
        title: 'Payment Required',
        message: `${band.name} now has 3 members! Please set up payment to activate the band.`,
        actionUrl: `/bands/${band.slug}/settings`,
        priority: 'URGENT',
        metadata: { bandId: band.id, bandName: band.name, memberCount: activeCount },
        relatedId: band.id,
        relatedType: 'Band',
      })

      // Notify other members that payment is pending
      const otherMembers = await prisma.member.findMany({
        where: { bandId, status: 'ACTIVE', userId: { not: billingOwnerId } },
        select: { userId: true },
      })

      for (const member of otherMembers) {
        await notificationService.create({
          userId: member.userId,
          type: 'BILLING_PAYMENT_REQUIRED',
          title: 'Payment Pending',
          message: `${band.name} has 3 members! Waiting for billing owner to complete payment.`,
          actionUrl: `/bands/${band.slug}`,
          priority: 'HIGH',
          metadata: { bandId: band.id, bandName: band.name, memberCount: activeCount },
          relatedId: band.id,
          relatedType: 'Band',
        })
      }
    }

    // === 21st member joined - upgrade subscription ===
    if (activeCount === 21 && band.stripeSubscriptionId && band.billingStatus === 'ACTIVE') {
      const currentPriceId = band.stripePriceId
      const largePriceId = process.env.STRIPE_PRICE_LARGE

      if (currentPriceId !== largePriceId) {
        try {
          await bandBillingService.upgradeSubscription(bandId)

          console.log(`Band ${band.name}: Upgraded to $100/month tier`)

          // Notify billing owner of upgrade
          if (band.billingOwnerId) {
            await notificationService.create({
              userId: band.billingOwnerId,
              type: 'BILLING_SUBSCRIPTION_UPGRADED',
              title: 'Subscription Upgraded',
              message: `${band.name} now has 21+ members. Your subscription has been upgraded to $100/month.`,
              actionUrl: `/bands/${band.slug}/settings`,
              priority: 'HIGH',
              metadata: { bandId: band.id, bandName: band.name, memberCount: activeCount, newPrice: 100 },
              relatedId: band.id,
              relatedType: 'Band',
            })
          }
        } catch (error) {
          console.error(`Failed to upgrade subscription for band ${bandId}:`, error)
        }
      }
    }
  },

  /**
   * Called when a member leaves or is removed from a band
   * Handles:
   * - Below 21 members: Schedule downgrade
   * - Below 3 members: Band stays active until billing cycle, then goes INACTIVE
   * - Billing owner left: Clear owner, notify members
   */
  async onMemberRemoved(bandId: string, removedUserId: string): Promise<void> {
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        billingStatus: true,
        billingOwnerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
      },
    })

    if (!band) return

    // Count remaining active members
    const activeCount = await prisma.member.count({
      where: { bandId, status: 'ACTIVE' },
    })

    console.log(`Band ${band.name}: ${activeCount} active members after removal`)

    // === Check if billing owner left ===
    if (band.billingOwnerId === removedUserId) {
      await prisma.band.update({
        where: { id: bandId },
        data: { billingOwnerId: null },
      })

      console.log(`Band ${band.name}: Billing owner left`)

      // Notify all remaining members that billing owner left
      const remainingMembers = await prisma.member.findMany({
        where: { bandId, status: 'ACTIVE' },
        select: { userId: true },
      })

      for (const member of remainingMembers) {
        await notificationService.create({
          userId: member.userId,
          type: 'BILLING_OWNER_LEFT',
          title: 'Billing Owner Left',
          message: `The billing owner for ${band.name} has left. A new member must claim billing ownership to continue.`,
          actionUrl: `/bands/${band.slug}/settings`,
          priority: 'URGENT',
          metadata: { bandId: band.id, bandName: band.name },
          relatedId: band.id,
          relatedType: 'Band',
        })
      }
    }

    // === Below 21 members - schedule downgrade ===
    if (activeCount < 21 && band.stripeSubscriptionId && band.billingStatus === 'ACTIVE') {
      const smallPriceId = process.env.STRIPE_PRICE_SMALL

      if (band.stripePriceId !== smallPriceId) {
        try {
          await bandBillingService.downgradeSubscription(bandId)

          console.log(`Band ${band.name}: Scheduled downgrade to $20/month tier at billing cycle end`)

          // Notify billing owner of downgrade
          if (band.billingOwnerId) {
            await notificationService.create({
              userId: band.billingOwnerId,
              type: 'BILLING_SUBSCRIPTION_DOWNGRADED',
              title: 'Subscription Downgrade Scheduled',
              message: `${band.name} now has fewer than 21 members. Your subscription will be downgraded to $20/month at the end of the billing cycle.`,
              actionUrl: `/bands/${band.slug}/settings`,
              priority: 'MEDIUM',
              metadata: { bandId: band.id, bandName: band.name, memberCount: activeCount, newPrice: 20 },
              relatedId: band.id,
              relatedType: 'Band',
            })
          }
        } catch (error) {
          console.error(`Failed to downgrade subscription for band ${bandId}:`, error)
        }
      }
    }

    // === Below 3 members ===
    if (activeCount < 3) {
      // If band has active subscription, it stays active until billing cycle ends
      // The grace period / billing cycle handling will take care of deactivation
      // If no subscription (billingStatus is NONE or PENDING), just ensure band is INACTIVE

      if (band.billingStatus === 'NONE' || band.billingStatus === 'PENDING') {
        await prisma.band.update({
          where: { id: bandId },
          data: {
            status: 'INACTIVE',
            billingStatus: 'NONE', // Reset to NONE since they don't have payment yet
          },
        })

        console.log(`Band ${band.name}: Set to INACTIVE (no subscription, below 3 members)`)

        // Notify remaining members
        const remainingMembers = await prisma.member.findMany({
          where: { bandId, status: 'ACTIVE' },
          select: { userId: true },
        })

        for (const member of remainingMembers) {
          await notificationService.create({
            userId: member.userId,
            type: 'BAND_STATUS_CHANGED',
            title: 'Band Inactive',
            message: `${band.name} now has fewer than 3 members and is inactive. Invite more members to reactivate.`,
            actionUrl: `/bands/${band.slug}/members`,
            priority: 'HIGH',
            metadata: { bandId: band.id, bandName: band.name, memberCount: activeCount },
            relatedId: band.id,
            relatedType: 'Band',
          })
        }
      } else if (band.billingStatus === 'ACTIVE') {
        // Band has active subscription - it stays active until billing cycle ends
        // We just notify members that they need more members
        console.log(`Band ${band.name}: Below 3 members but has active subscription - stays active until billing cycle ends`)

        const remainingMembers = await prisma.member.findMany({
          where: { bandId, status: 'ACTIVE' },
          select: { userId: true },
        })

        for (const member of remainingMembers) {
          await notificationService.create({
            userId: member.userId,
            type: 'BAND_STATUS_CHANGED',
            title: 'Members Needed',
            message: `${band.name} now has fewer than 3 members. The band will remain active until the end of the billing cycle. Invite more members to continue.`,
            actionUrl: `/bands/${band.slug}/members`,
            priority: 'HIGH',
            metadata: { bandId: band.id, bandName: band.name, memberCount: activeCount },
            relatedId: band.id,
            relatedType: 'Band',
          })
        }
      }
    }
  },
}
