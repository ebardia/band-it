import Stripe from 'stripe'
import { prisma } from '../../lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export const stripeService = {
  /**
   * Create a subscription for a user
   */
  async createSubscription(userId: string, email: string, name: string) {
    // Create or get Stripe customer
    let customer: Stripe.Customer

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })

    if (user?.stripeCustomerId) {
      // Customer already exists
      customer = await stripe.customers.retrieve(user.stripeCustomerId) as Stripe.Customer
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      })

      // Save customer ID to database
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customer.id },
      })
    }

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Band IT Membership',
              description: 'Monthly membership to Band IT platform',
            },
            unit_amount: 500, // $5.00 in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment`,
      metadata: {
        userId,
      },
    })

    return {
      sessionId: session.id,
      url: session.url,
    }
  },

  /**
   * Verify payment and activate subscription
   */
  async verifyPayment(sessionId: string) {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid' && session.subscription) {
      const userId = session.metadata?.userId

      if (userId) {
        // Update user subscription status
        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeSubscriptionId: session.subscription as string,
            subscriptionStatus: 'ACTIVE',
            subscriptionStartedAt: new Date(),
          },
        })

        return { success: true, userId }
      }
    }

    return { success: false }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true },
    })

    if (user?.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId)

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'CANCELED',
        },
      })

      return { success: true }
    }

    return { success: false, message: 'No active subscription found' }
  },
}