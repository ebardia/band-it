import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

/**
 * Get or create the Stripe instance for the platform account.
 * Used for platform-level payments.
 */
export const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key) {
      console.warn('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
      return null
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}

/**
 * Get a Stripe instance for a connected account (band's Stripe account).
 * Used for dues and donations that go directly to bands.
 */
export const getStripeForConnectedAccount = (stripeAccountId: string) => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) {
    console.warn('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
    return null
  }
  return loadStripe(key, {
    stripeAccount: stripeAccountId,
  })
}
