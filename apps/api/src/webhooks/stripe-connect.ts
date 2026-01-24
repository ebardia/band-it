/**
 * Stripe Connect Webhooks
 *
 * Handles webhook events from connected Stripe accounts for band dues.
 * Events: checkout.session.completed, subscription updates, invoice failures
 */

import { Request, Response } from 'express'
import Stripe from 'stripe'
import { prisma } from '../lib/prisma'
import { logAuditEvent } from '../lib/auditContext'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const STRIPE_CONNECT_WEBHOOK_SECRET = process.env.STRIPE_CONNECT_WEBHOOK_SECRET

/**
 * Main webhook handler for Stripe Connect events
 */
export async function handleStripeConnectWebhook(req: Request, res: Response) {
  // Verify webhook secret is configured
  if (!STRIPE_CONNECT_WEBHOOK_SECRET) {
    console.error('STRIPE_CONNECT_WEBHOOK_SECRET is not configured')
    return res.status(500).json({ error: 'Webhook not configured' })
  }

  const signature = req.headers['stripe-signature'] as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw body
      signature,
      STRIPE_CONNECT_WEBHOOK_SECRET
    )
  } catch (err: any) {
    console.error('Stripe Connect webhook signature verification failed:', err.message)
    return res.status(400).json({ error: 'Webhook signature verification failed' })
  }

  // Get connected account ID
  const connectedAccountId = event.account
  if (!connectedAccountId) {
    console.warn('Stripe Connect webhook: No account ID in event', event.id)
    return res.status(200).json({ received: true, ignored: true })
  }

  // Idempotency check - have we already processed this event?
  const existingReceipt = await prisma.stripeEventReceipt.findUnique({
    where: { stripeEventId: event.id },
  })

  if (existingReceipt) {
    console.log(`Stripe Connect: Duplicate event ${event.id}, already processed`)
    return res.status(200).json({ received: true, duplicate: true })
  }

  // Create receipt before processing (for idempotency)
  const receipt = await prisma.stripeEventReceipt.create({
    data: {
      stripeEventId: event.id,
      stripeAccountId: connectedAccountId,
      eventType: event.type,
      processingStatus: 'OK', // Will update if error
    },
  })

  try {
    // Route to appropriate handler
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event, connectedAccountId)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event, connectedAccountId)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event)
        break

      default:
        // Event type we don't handle - mark as ignored
        await prisma.stripeEventReceipt.update({
          where: { id: receipt.id },
          data: {
            processedAt: new Date(),
            processingStatus: 'IGNORED',
          },
        })
        console.log(`Stripe Connect: Ignored event type ${event.type}`)
        return res.status(200).json({ received: true, ignored: true })
    }

    // Mark as processed successfully
    await prisma.stripeEventReceipt.update({
      where: { id: receipt.id },
      data: {
        processedAt: new Date(),
        processingStatus: 'OK',
      },
    })

    return res.status(200).json({ received: true })
  } catch (error: any) {
    console.error(`Stripe Connect webhook error (${event.type}):`, error)

    // Mark as error but still return 200 to prevent Stripe retries
    await prisma.stripeEventReceipt.update({
      where: { id: receipt.id },
      data: {
        processedAt: new Date(),
        processingStatus: 'ERROR',
        errorMessage: error.message,
      },
    })

    // Return 200 to acknowledge receipt (prevents Stripe from retrying)
    return res.status(200).json({ received: true, error: error.message })
  }
}

/**
 * Handle checkout.session.completed
 * Member completed checkout - create/update their billing record
 */
async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  connectedAccountId: string
) {
  const session = event.data.object as Stripe.Checkout.Session

  // Extract metadata
  const bandId = session.metadata?.band_id
  const memberUserId = session.metadata?.member_user_id
  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  if (!bandId || !memberUserId) {
    console.warn('Stripe Connect: checkout.session.completed missing metadata', {
      eventId: event.id,
      bandId,
      memberUserId,
    })
    return
  }

  // Verify the band from metadata has this Stripe account connected
  const bandStripeAccount = await prisma.bandStripeAccount.findFirst({
    where: {
      bandId: bandId,
      stripeAccountId: connectedAccountId,
      disconnectedAt: null,
    },
  })

  if (!bandStripeAccount) {
    console.warn('Stripe Connect: Band does not have this Stripe account connected', {
      bandId,
      stripeAccountId: connectedAccountId,
    })
    return
  }

  // Fetch subscription for period info
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    stripeAccount: connectedAccountId,
  })

  // Upsert billing record
  await prisma.bandMemberBilling.upsert({
    where: {
      bandId_memberUserId: { bandId, memberUserId },
    },
    create: {
      bandId,
      memberUserId,
      status: 'ACTIVE',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      lastPaymentAt: new Date(),
    },
    update: {
      status: 'ACTIVE',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      lastPaymentAt: new Date(),
    },
  })

  // Update event receipt with bandId for easier querying
  await prisma.stripeEventReceipt.updateMany({
    where: { stripeEventId: event.id },
    data: { bandId },
  })

  console.log('Stripe Connect: Member billing activated', {
    bandId,
    memberUserId,
    subscriptionId,
  })

  // Log audit event (no user context since this is a webhook)
  // Look up member name for better audit display
  const member = await prisma.user.findUnique({
    where: { id: memberUserId },
    select: { name: true },
  })

  await logAuditEvent({
    bandId,
    action: 'dues_payment_received',
    entityType: 'BandMemberBilling',
    entityId: subscriptionId,
    entityName: `Dues Payment from ${member?.name || 'Unknown'}`,
  })
}

/**
 * Handle customer.subscription.updated
 * Subscription status changed - update billing record
 */
async function handleSubscriptionUpdated(
  event: Stripe.Event,
  connectedAccountId: string
) {
  const subscription = event.data.object as Stripe.Subscription

  // Find billing record by subscription ID
  const billing = await prisma.bandMemberBilling.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!billing) {
    console.warn('Stripe Connect: No billing record for subscription', subscription.id)
    return
  }

  // Map Stripe status to our status
  let status = billing.status
  switch (subscription.status) {
    case 'active':
      status = 'ACTIVE'
      break
    case 'past_due':
    case 'unpaid':
      status = 'PAST_DUE'
      break
    case 'canceled':
      status = 'CANCELED'
      break
    // Other statuses (trialing, incomplete, etc.) - keep current status
  }

  await prisma.bandMemberBilling.update({
    where: { id: billing.id },
    data: {
      status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  })

  // Update event receipt with bandId
  await prisma.stripeEventReceipt.updateMany({
    where: { stripeEventId: event.id },
    data: { bandId: billing.bandId },
  })

  console.log('Stripe Connect: Subscription updated', {
    subscriptionId: subscription.id,
    stripeStatus: subscription.status,
    ourStatus: status,
  })

  // Log audit event for status changes
  await logAuditEvent({
    bandId: billing.bandId,
    action: 'dues_subscription_updated',
    entityType: 'BandMemberBilling',
    entityId: subscription.id,
    entityName: `Subscription Status: ${status}`,
    changes: {
      status: { from: billing.status, to: status },
    },
  })
}

/**
 * Handle customer.subscription.deleted
 * Subscription was canceled/ended
 */
async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription

  // Find the billing record first to get bandId for audit
  const billing = await prisma.bandMemberBilling.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  const result = await prisma.bandMemberBilling.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'CANCELED' },
  })

  if (result.count > 0) {
    console.log('Stripe Connect: Subscription deleted', subscription.id)

    // Log audit event
    if (billing) {
      await logAuditEvent({
        bandId: billing.bandId,
        action: 'dues_subscription_canceled',
        entityType: 'BandMemberBilling',
        entityId: subscription.id,
        entityName: 'Subscription Canceled',
      })
    }
  } else {
    console.warn('Stripe Connect: No billing record for deleted subscription', subscription.id)
  }
}

/**
 * Handle invoice.payment_failed
 * Payment attempt failed - mark as past due
 */
async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    // One-time invoice, not subscription-related
    return
  }

  // Find the billing record first to get bandId for audit
  const billing = await prisma.bandMemberBilling.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  })

  const result = await prisma.bandMemberBilling.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: 'PAST_DUE' },
  })

  if (result.count > 0) {
    console.log('Stripe Connect: Payment failed, marked past due', subscriptionId)

    // Log audit event
    if (billing) {
      await logAuditEvent({
        bandId: billing.bandId,
        action: 'dues_payment_failed',
        entityType: 'BandMemberBilling',
        entityId: subscriptionId,
        entityName: 'Payment Failed',
      })
    }
  }
}
