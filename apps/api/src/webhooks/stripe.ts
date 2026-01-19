import { Request, Response } from 'express'
import Stripe from 'stripe'
import { bandBillingService } from '../server/services/band-billing.service'
import { notificationService } from '../services/notification.service'
import { prisma } from '../lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

/**
 * Handle Stripe webhook events
 *
 * Events handled:
 * - checkout.session.completed: Initial payment successful
 * - invoice.payment_succeeded: Recurring payment successful
 * - invoice.payment_failed: Payment failed, start grace period
 * - customer.subscription.deleted: Subscription cancelled
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string

  if (!sig) {
    console.error('No Stripe signature in webhook request')
    return res.status(400).send('No signature')
  }

  let event: Stripe.Event

  try {
    // req.body should be raw buffer for signature verification
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook signature verification failed: ${message}`)
    return res.status(400).send(`Webhook Error: ${message}`)
  }

  console.log(`Stripe webhook received: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(session)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.json({ received: true })
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error)
    // Return 200 to prevent Stripe from retrying (we log the error)
    res.json({ received: true, error: 'Processing error logged' })
  }
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const bandId = session.metadata?.bandId
  if (!bandId) {
    console.error('No bandId in checkout session metadata')
    return
  }

  console.log(`Processing checkout complete for band ${bandId}`)

  await bandBillingService.handleCheckoutComplete(session)

  // Get band info for notifications
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    include: {
      members: {
        where: { status: 'ACTIVE' },
        select: { userId: true }
      }
    }
  })

  if (!band) return

  // Notify all members that band is now active
  for (const member of band.members) {
    await notificationService.create({
      userId: member.userId,
      type: 'BILLING_PAYMENT_SUCCEEDED',
      title: 'Band Activated!',
      message: `${band.name} is now active. Payment was successful.`,
      actionUrl: `/bands/${band.slug}`,
      priority: 'HIGH',
      metadata: { bandId: band.id, bandName: band.name },
      relatedId: band.id,
      relatedType: 'Band',
    })
  }

  console.log(`Band ${bandId} activated successfully`)
}

/**
 * Handle successful recurring payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  // Skip if this is the first invoice (handled by checkout.session.completed)
  if (invoice.billing_reason === 'subscription_create') {
    console.log('Skipping initial subscription invoice (handled by checkout)')
    return
  }

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const bandId = subscription.metadata?.bandId

  if (!bandId) {
    console.error('No bandId in subscription metadata')
    return
  }

  console.log(`Processing recurring payment success for band ${bandId}`)

  await bandBillingService.handlePaymentSucceeded(invoice)

  // Get band to check if it was in PAST_DUE status
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: { name: true, slug: true, billingOwnerId: true }
  })

  if (!band) return

  // Notify billing owner that payment succeeded (especially important if they were past due)
  if (band.billingOwnerId) {
    await notificationService.create({
      userId: band.billingOwnerId,
      type: 'BILLING_PAYMENT_SUCCEEDED',
      title: 'Payment Successful',
      message: `Monthly payment for ${band.name} was successful.`,
      actionUrl: `/bands/${band.slug}`,
      priority: 'MEDIUM',
      metadata: { bandId, bandName: band.name },
      relatedId: bandId,
      relatedType: 'Band',
    })
  }

  console.log(`Recurring payment processed for band ${bandId}`)
}

/**
 * Handle failed payment - start grace period
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const result = await bandBillingService.handlePaymentFailed(invoice)

  if (!result) return

  const { bandId, gracePeriodEndsAt } = result

  console.log(`Payment failed for band ${bandId}, grace period ends ${gracePeriodEndsAt}`)

  // Get band and members for notifications
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    include: {
      billingOwner: { select: { id: true, name: true } },
      members: {
        where: { status: 'ACTIVE' },
        select: { userId: true }
      }
    }
  })

  if (!band) return

  const daysLeft = Math.ceil((gracePeriodEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  // Notify billing owner (high priority)
  if (band.billingOwnerId) {
    await notificationService.create({
      userId: band.billingOwnerId,
      type: 'BILLING_PAYMENT_FAILED',
      title: 'Payment Failed',
      message: `Payment for ${band.name} failed. Please update your payment method within ${daysLeft} days to avoid deactivation.`,
      actionUrl: `/bands/${band.slug}/settings`,
      priority: 'URGENT',
      metadata: { bandId: band.id, bandName: band.name, daysLeft },
      relatedId: band.id,
      relatedType: 'Band',
    })
  }

  // Notify all other members (medium priority)
  for (const member of band.members) {
    if (member.userId === band.billingOwnerId) continue

    await notificationService.create({
      userId: member.userId,
      type: 'BILLING_GRACE_PERIOD_WARNING',
      title: 'Payment Issue',
      message: `${band.name} has a payment issue. The billing owner has ${daysLeft} days to resolve it.`,
      actionUrl: `/bands/${band.slug}`,
      priority: 'HIGH',
      metadata: { bandId: band.id, bandName: band.name, daysLeft },
      relatedId: band.id,
      relatedType: 'Band',
    })
  }

  console.log(`Notifications sent for payment failure on band ${bandId}`)
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const bandId = subscription.metadata?.bandId

  if (!bandId) {
    console.error('No bandId in subscription metadata')
    return
  }

  console.log(`Processing subscription deletion for band ${bandId}`)

  // Get band info before deactivation
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    include: {
      members: {
        where: { status: 'ACTIVE' },
        select: { userId: true }
      }
    }
  })

  if (!band) return

  await bandBillingService.handleSubscriptionDeleted(subscription)

  // Notify all members
  for (const member of band.members) {
    await notificationService.create({
      userId: member.userId,
      type: 'BILLING_BAND_DEACTIVATED',
      title: 'Band Deactivated',
      message: `${band.name} has been deactivated due to subscription cancellation.`,
      actionUrl: `/bands/${band.slug}`,
      priority: 'HIGH',
      metadata: { bandId: band.id, bandName: band.name },
      relatedId: band.id,
      relatedType: 'Band',
    })
  }

  console.log(`Band ${bandId} deactivated, members notified`)
}
