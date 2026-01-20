import Stripe from 'stripe'
import { prisma } from '../../lib/prisma'
import { BillingStatus } from '@prisma/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Price IDs from environment variables
const STRIPE_PRICE_20 = process.env.STRIPE_PRICE_20 // $20/month for 3-20 members
const STRIPE_PRICE_100 = process.env.STRIPE_PRICE_100 // $100/month for 21+ members

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const GRACE_PERIOD_DAYS = 7

export const bandBillingService = {
  /**
   * Get the appropriate price ID based on member count
   */
  getPriceId(memberCount: number): string {
    const priceId = memberCount >= 21 ? STRIPE_PRICE_100 : STRIPE_PRICE_20
    if (!priceId) {
      throw new Error(`Stripe price not configured. Please set ${memberCount >= 21 ? 'STRIPE_PRICE_100' : 'STRIPE_PRICE_20'} environment variable.`)
    }
    return priceId
  },

  /**
   * Get the price amount for display
   */
  getPriceAmount(memberCount: number): number {
    return memberCount >= 21 ? 100 : 20
  },

  /**
   * Create or retrieve Stripe customer for a band
   */
  async getOrCreateCustomer(bandId: string, billingOwnerEmail: string, billingOwnerName: string): Promise<string> {
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: { stripeCustomerId: true, name: true }
    })

    if (!band) {
      throw new Error('Band not found')
    }

    if (band.stripeCustomerId) {
      return band.stripeCustomerId
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: billingOwnerEmail,
      name: billingOwnerName,
      metadata: {
        bandId,
        bandName: band.name,
      },
    })

    // Save customer ID to band
    await prisma.band.update({
      where: { id: bandId },
      data: { stripeCustomerId: customer.id }
    })

    return customer.id
  },

  /**
   * Create a checkout session for initial band subscription
   */
  async createCheckoutSession(bandId: string, userId: string): Promise<{ url: string; sessionId: string }> {
    // Get band with billing owner info
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      include: {
        billingOwner: {
          select: { id: true, email: true, name: true }
        },
        members: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        }
      }
    })

    if (!band) {
      throw new Error('Band not found')
    }

    // Verify user is billing owner
    if (band.billingOwnerId !== userId) {
      throw new Error('Only the billing owner can initiate payment')
    }

    if (!band.billingOwner) {
      throw new Error('Billing owner not found')
    }

    // Get member count to determine price
    const memberCount = band.members.length
    const priceId = this.getPriceId(memberCount)

    // Get or create Stripe customer
    const customerId = await this.getOrCreateCustomer(
      bandId,
      band.billingOwner.email,
      band.billingOwner.name
    )

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${FRONTEND_URL}/bands/${band.slug}?payment=success`,
      cancel_url: `${FRONTEND_URL}/bands/${band.slug}?payment=cancelled`,
      metadata: {
        bandId: band.id,
        bandSlug: band.slug,
      },
      subscription_data: {
        metadata: {
          bandId: band.id,
          bandSlug: band.slug,
        },
      },
    })

    return {
      url: session.url!,
      sessionId: session.id,
    }
  },

  /**
   * Create a portal session for managing payment methods
   */
  async createPortalSession(bandId: string, userId: string): Promise<{ url: string }> {
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: {
        stripeCustomerId: true,
        billingOwnerId: true,
        slug: true,
      }
    })

    if (!band) {
      throw new Error('Band not found')
    }

    // Verify user is billing owner
    if (band.billingOwnerId !== userId) {
      throw new Error('Only the billing owner can manage payment methods')
    }

    if (!band.stripeCustomerId) {
      throw new Error('No payment method on file')
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: band.stripeCustomerId,
      return_url: `${FRONTEND_URL}/bands/${band.slug}/settings`,
    })

    return { url: session.url }
  },

  /**
   * Handle successful checkout completion
   */
  async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const bandId = session.metadata?.bandId
    if (!bandId) {
      console.error('No bandId in checkout session metadata')
      return
    }

    const subscriptionId = session.subscription as string
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    await prisma.band.update({
      where: { id: bandId },
      data: {
        status: 'ACTIVE',
        billingStatus: 'ACTIVE',
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        billingCycleStart: new Date(subscription.current_period_start * 1000),
        paymentFailedAt: null,
        gracePeriodEndsAt: null,
      }
    })
  },

  /**
   * Handle successful recurring payment
   */
  async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const bandId = subscription.metadata?.bandId

    if (!bandId) {
      console.error('No bandId in subscription metadata')
      return
    }

    await prisma.band.update({
      where: { id: bandId },
      data: {
        billingStatus: 'ACTIVE',
        paymentFailedAt: null,
        gracePeriodEndsAt: null,
        billingCycleStart: new Date(subscription.current_period_start * 1000),
      }
    })
  },

  /**
   * Handle failed payment - start grace period
   */
  async handlePaymentFailed(invoice: Stripe.Invoice): Promise<{ bandId: string; gracePeriodEndsAt: Date } | null> {
    if (!invoice.subscription) return null

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const bandId = subscription.metadata?.bandId

    if (!bandId) {
      console.error('No bandId in subscription metadata')
      return null
    }

    const now = new Date()
    const gracePeriodEndsAt = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)

    await prisma.band.update({
      where: { id: bandId },
      data: {
        billingStatus: 'PAST_DUE',
        paymentFailedAt: now,
        gracePeriodEndsAt,
      }
    })

    return { bandId, gracePeriodEndsAt }
  },

  /**
   * Handle subscription deleted/cancelled
   */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const bandId = subscription.metadata?.bandId

    if (!bandId) {
      console.error('No bandId in subscription metadata')
      return
    }

    await prisma.band.update({
      where: { id: bandId },
      data: {
        status: 'INACTIVE',
        billingStatus: 'INACTIVE',
        stripeSubscriptionId: null,
        stripePriceId: null,
      }
    })
  },

  /**
   * Upgrade subscription to larger tier (21+ members)
   */
  async upgradeSubscription(bandId: string): Promise<void> {
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: { stripeSubscriptionId: true, stripePriceId: true }
    })

    if (!band?.stripeSubscriptionId) {
      throw new Error('No active subscription')
    }

    // Already on large tier
    if (band.stripePriceId === STRIPE_PRICE_100) {
      return
    }

    const subscription = await stripe.subscriptions.retrieve(band.stripeSubscriptionId)

    // Update subscription with proration (charge difference immediately)
    await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: STRIPE_PRICE_100,
        },
      ],
      proration_behavior: 'create_prorations',
    })

    await prisma.band.update({
      where: { id: bandId },
      data: { stripePriceId: STRIPE_PRICE_100 }
    })
  },

  /**
   * Downgrade subscription to smaller tier (at billing cycle end)
   */
  async downgradeSubscription(bandId: string): Promise<void> {
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: { stripeSubscriptionId: true, stripePriceId: true }
    })

    if (!band?.stripeSubscriptionId) {
      throw new Error('No active subscription')
    }

    // Already on small tier
    if (band.stripePriceId === STRIPE_PRICE_20) {
      return
    }

    const subscription = await stripe.subscriptions.retrieve(band.stripeSubscriptionId)

    // Downgrade at end of billing period (no refund)
    await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: STRIPE_PRICE_20,
        },
      ],
      proration_behavior: 'none',
    })

    await prisma.band.update({
      where: { id: bandId },
      data: { stripePriceId: STRIPE_PRICE_20 }
    })
  },

  /**
   * Cancel subscription (deactivate band)
   */
  async cancelSubscription(bandId: string): Promise<void> {
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: { stripeSubscriptionId: true }
    })

    if (band?.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(band.stripeSubscriptionId)
    }

    await prisma.band.update({
      where: { id: bandId },
      data: {
        status: 'INACTIVE',
        billingStatus: 'INACTIVE',
        stripeSubscriptionId: null,
        stripePriceId: null,
      }
    })
  },

  /**
   * Check and deactivate bands past grace period
   * This should be called by a cron job daily
   */
  async checkGracePeriods(): Promise<string[]> {
    const now = new Date()

    const expiredBands = await prisma.band.findMany({
      where: {
        billingStatus: 'PAST_DUE',
        gracePeriodEndsAt: { lt: now }
      },
      select: {
        id: true,
        stripeSubscriptionId: true,
      }
    })

    const deactivatedBandIds: string[] = []

    for (const band of expiredBands) {
      try {
        // Cancel Stripe subscription
        if (band.stripeSubscriptionId) {
          await stripe.subscriptions.cancel(band.stripeSubscriptionId)
        }

        // Deactivate band
        await prisma.band.update({
          where: { id: band.id },
          data: {
            status: 'INACTIVE',
            billingStatus: 'INACTIVE',
            stripeSubscriptionId: null,
            stripePriceId: null,
          }
        })

        deactivatedBandIds.push(band.id)
      } catch (error) {
        console.error(`Failed to deactivate band ${band.id}:`, error)
      }
    }

    return deactivatedBandIds
  },

  /**
   * Claim billing ownership (self-service)
   */
  async claimBillingOwnership(bandId: string, userId: string): Promise<void> {
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: { billingOwnerId: true }
    })

    if (!band) {
      throw new Error('Band not found')
    }

    // Check if there's already a billing owner
    if (band.billingOwnerId) {
      throw new Error('Band already has a billing owner')
    }

    // Verify user is an active member
    const member = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId, bandId }
      },
      select: { status: true }
    })

    if (!member || member.status !== 'ACTIVE') {
      throw new Error('Only active members can claim billing ownership')
    }

    // Update billing owner
    await prisma.band.update({
      where: { id: bandId },
      data: { billingOwnerId: userId }
    })
  },

  /**
   * Transfer billing ownership to another member
   */
  async transferBillingOwnership(bandId: string, currentOwnerId: string, newOwnerId: string): Promise<void> {
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: {
        billingOwnerId: true,
        stripeCustomerId: true,
      }
    })

    if (!band) {
      throw new Error('Band not found')
    }

    // Verify current user is billing owner
    if (band.billingOwnerId !== currentOwnerId) {
      throw new Error('Only the current billing owner can transfer ownership')
    }

    // Verify new owner is an active member
    const newOwnerMember = await prisma.member.findUnique({
      where: {
        userId_bandId: { userId: newOwnerId, bandId }
      },
      select: { status: true }
    })

    if (!newOwnerMember || newOwnerMember.status !== 'ACTIVE') {
      throw new Error('New owner must be an active band member')
    }

    // Get new owner's email for Stripe
    const newOwner = await prisma.user.findUnique({
      where: { id: newOwnerId },
      select: { email: true }
    })

    if (!newOwner) {
      throw new Error('New owner not found')
    }

    // Update billing owner
    await prisma.band.update({
      where: { id: bandId },
      data: { billingOwnerId: newOwnerId }
    })

    // Update Stripe customer email
    if (band.stripeCustomerId) {
      await stripe.customers.update(band.stripeCustomerId, {
        email: newOwner.email,
      })
    }
  },

  /**
   * Handle billing owner leaving the band
   * Called when a member leaves or is removed
   */
  async handleBillingOwnerLeft(bandId: string, userId: string): Promise<boolean> {
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: { billingOwnerId: true }
    })

    if (!band || band.billingOwnerId !== userId) {
      return false // User was not the billing owner
    }

    // Clear billing owner - another member can claim
    await prisma.band.update({
      where: { id: bandId },
      data: { billingOwnerId: null }
    })

    return true // Billing owner was cleared
  },

  /**
   * Get billing info for a band
   */
  async getBillingInfo(bandId: string) {
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: {
        billingStatus: true,
        billingOwnerId: true,
        stripePriceId: true,
        billingCycleStart: true,
        paymentFailedAt: true,
        gracePeriodEndsAt: true,
        billingOwner: {
          select: { id: true, name: true, email: true }
        },
        members: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        }
      }
    })

    if (!band) {
      throw new Error('Band not found')
    }

    const memberCount = band.members.length
    const currentPriceAmount = band.stripePriceId === STRIPE_PRICE_100 ? 100 : 20
    const expectedPriceAmount = this.getPriceAmount(memberCount)

    return {
      billingStatus: band.billingStatus,
      billingOwner: band.billingOwner,
      memberCount,
      currentPriceAmount,
      expectedPriceAmount,
      willUpgrade: memberCount >= 21 && band.stripePriceId === STRIPE_PRICE_20,
      willDowngrade: memberCount < 21 && band.stripePriceId === STRIPE_PRICE_100,
      billingCycleStart: band.billingCycleStart,
      paymentFailedAt: band.paymentFailedAt,
      gracePeriodEndsAt: band.gracePeriodEndsAt,
      gracePeriodDaysLeft: band.gracePeriodEndsAt
        ? Math.max(0, Math.ceil((band.gracePeriodEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null,
    }
  },
}
