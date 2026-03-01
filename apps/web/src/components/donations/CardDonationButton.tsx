'use client'

import { useState, useEffect } from 'react'
import { loadStripe, PaymentRequest } from '@stripe/stripe-js'
import {
  Elements,
  PaymentRequestButtonElement,
  useStripe,
} from '@stripe/react-stripe-js'
import { Text, Button, Loading, Alert } from '@/components/ui'

interface CardDonationButtonProps {
  bandId: string
  bandName: string
  stripeAccountId: string
  amount: number // in cents
  onSuccess: () => void
  onError: (error: string) => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/trpc', '') || 'http://localhost:3001'

function CardDonationButtonInner({
  bandId,
  bandName,
  stripeAccountId,
  amount,
  onSuccess,
  onError,
}: CardDonationButtonProps) {
  const stripe = useStripe()
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)
  const [canMakePayment, setCanMakePayment] = useState<boolean | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!stripe || amount < 50) return // Stripe minimum is $0.50

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: `Donation to ${bandName}`,
        amount: amount,
      },
      requestPayerName: true,
      requestPayerEmail: true,
    })

    // Check if Apple Pay or Google Pay is available
    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr)
        setCanMakePayment(true)
      } else {
        setCanMakePayment(false)
      }
    })

    // Handle the payment
    pr.on('paymentmethod', async (event) => {
      setProcessing(true)

      try {
        // Get token from localStorage
        const token = localStorage.getItem('accessToken')
        if (!token) {
          event.complete('fail')
          onError('Not authenticated')
          return
        }

        // Create PaymentIntent on the server
        const response = await fetch(`${API_URL}/api/bands/${bandId}/card-donation`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            paymentMethodId: event.paymentMethod.id,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          event.complete('fail')
          onError(result.message || 'Payment failed')
          setProcessing(false)
          return
        }

        if (result.error) {
          event.complete('fail')
          onError(result.error)
          setProcessing(false)
          return
        }

        // Handle requires_action (3D Secure, etc.)
        if (result.requiresAction) {
          const { error: confirmError } = await stripe.confirmCardPayment(
            result.clientSecret
          )
          if (confirmError) {
            event.complete('fail')
            onError(confirmError.message || 'Payment confirmation failed')
            setProcessing(false)
            return
          }
        }

        event.complete('success')
        onSuccess()
      } catch (error: any) {
        event.complete('fail')
        onError(error.message || 'Payment failed')
      } finally {
        setProcessing(false)
      }
    })

    return () => {
      // Cleanup
    }
  }, [stripe, amount, bandId, bandName, onSuccess, onError])

  if (!stripe) {
    return <Loading message="Loading payment..." />
  }

  if (canMakePayment === null) {
    return <Loading message="Checking payment options..." />
  }

  if (canMakePayment === false) {
    return (
      <Alert variant="info">
        <Text variant="small">
          Apple Pay and Google Pay are not available on this device/browser.
          Please use Safari on iOS/Mac for Apple Pay or Chrome for Google Pay.
        </Text>
      </Alert>
    )
  }

  if (!paymentRequest) {
    return null
  }

  if (processing) {
    return <Loading message="Processing payment..." />
  }

  return (
    <div className="w-full">
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: {
            paymentRequestButton: {
              type: 'donate',
              theme: 'dark',
              height: '44px',
            },
          },
        }}
      />
    </div>
  )
}

export function CardDonationButton(props: CardDonationButtonProps) {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (key && props.stripeAccountId) {
      setStripePromise(
        loadStripe(key, {
          stripeAccount: props.stripeAccountId,
        })
      )
    }
  }, [props.stripeAccountId])

  if (!stripePromise) {
    return (
      <Alert variant="warning">
        <Text variant="small">Card payments not configured.</Text>
      </Alert>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <CardDonationButtonInner {...props} />
    </Elements>
  )
}

export default CardDonationButton
