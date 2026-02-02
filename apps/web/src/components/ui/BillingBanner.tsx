'use client'

import { Button, Text, Heading, Stack } from '@/components/ui'
import { trpc } from '@/lib/trpc'
import { MIN_MEMBERS_TO_ACTIVATE } from '@band-it/shared'

interface BillingBannerProps {
  bandId: string
  bandSlug: string
  userId: string
}

export function BillingBanner({ bandId, bandSlug, userId }: BillingBannerProps) {
  const { data, isLoading } = trpc.band.getPaymentStatus.useQuery(
    { bandId, userId },
    { enabled: !!bandId && !!userId }
  )

  const createCheckout = trpc.band.createCheckoutSession.useMutation()
  const createPortal = trpc.band.createPortalSession.useMutation()
  const claimOwnership = trpc.band.claimBillingOwnership.useMutation()

  if (isLoading || !data) return null

  const {
    billingStatus,
    isBillingOwner,
    billingOwnerName,
    needsPayment,
    isPastDue,
    isInactive,
    noBillingOwner,
    gracePeriodDaysLeft,
    priceAmount,
  } = data

  // Handle checkout
  const handlePayment = async () => {
    try {
      const result = await createCheckout.mutateAsync({ bandId, userId })
      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      console.error('Failed to create checkout:', error)
    }
  }

  // Handle portal (update payment method)
  const handleUpdatePayment = async () => {
    try {
      const result = await createPortal.mutateAsync({ bandId, userId })
      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      console.error('Failed to create portal:', error)
    }
  }

  // Handle claim ownership
  const handleClaimOwnership = async () => {
    try {
      await claimOwnership.mutateAsync({ bandId, userId })
      window.location.reload()
    } catch (error) {
      console.error('Failed to claim ownership:', error)
    }
  }

  // No billing owner but band needs one
  if (noBillingOwner && billingStatus !== 'NONE') {
    return (
      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-r-lg">
        <Stack spacing="sm">
          <Heading level={3} className="text-orange-800">Billing Owner Needed</Heading>
          <Text variant="small" className="text-orange-700">
            This band needs a billing owner to manage payments. Any member can claim this responsibility.
          </Text>
          <Button
            variant="primary"
            size="sm"
            onClick={handleClaimOwnership}
            disabled={claimOwnership.isPending}
          >
            {claimOwnership.isPending ? 'Claiming...' : 'Become Billing Owner'}
          </Button>
        </Stack>
      </div>
    )
  }

  // Payment required (minimum members reached, no subscription yet)
  if (needsPayment) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
        <Stack spacing="sm">
          <Heading level={3} className="text-yellow-800">Payment Required</Heading>
          <Text variant="small" className="text-yellow-700">
            This band has {MIN_MEMBERS_TO_ACTIVATE}+ members and requires a subscription to become active.
          </Text>
          {isBillingOwner ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handlePayment}
              disabled={createCheckout.isPending}
            >
              {createCheckout.isPending ? 'Loading...' : `Set Up Payment ($${priceAmount}/month)`}
            </Button>
          ) : (
            <Text variant="small" className="text-yellow-600 font-medium">
              Waiting for {billingOwnerName || 'billing owner'} to complete payment.
            </Text>
          )}
        </Stack>
      </div>
    )
  }

  // Past due (payment failed, in grace period)
  if (isPastDue) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
        <Stack spacing="sm">
          <Heading level={3} className="text-red-800">Payment Failed</Heading>
          <Text variant="small" className="text-red-700">
            {gracePeriodDaysLeft !== null && gracePeriodDaysLeft > 0 ? (
              <>Your payment failed. Please update your payment method within <strong>{gracePeriodDaysLeft} days</strong> or this band will be deactivated.</>
            ) : (
              <>Your payment failed. Please update your payment method immediately to avoid deactivation.</>
            )}
          </Text>
          {isBillingOwner ? (
            <Button
              variant="danger"
              size="sm"
              onClick={handleUpdatePayment}
              disabled={createPortal.isPending}
            >
              {createPortal.isPending ? 'Loading...' : 'Update Payment Method'}
            </Button>
          ) : (
            <Text variant="small" className="text-red-600 font-medium">
              {billingOwnerName || 'The billing owner'} needs to update the payment method.
            </Text>
          )}
        </Stack>
      </div>
    )
  }

  // Band is inactive
  if (isInactive) {
    return (
      <div className="bg-gray-100 border-l-4 border-gray-500 p-4 mb-6 rounded-r-lg">
        <Stack spacing="sm">
          <Heading level={3} className="text-gray-800">Band Inactive</Heading>
          <Text variant="small" className="text-gray-700">
            This band is currently inactive. To reactivate, the band needs at least {MIN_MEMBERS_TO_ACTIVATE} member{MIN_MEMBERS_TO_ACTIVATE === 1 ? '' : 's'} and an active subscription.
          </Text>
          {isBillingOwner && billingStatus === 'INACTIVE' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handlePayment}
              disabled={createCheckout.isPending}
            >
              {createCheckout.isPending ? 'Loading...' : 'Reactivate Band'}
            </Button>
          )}
          {noBillingOwner && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClaimOwnership}
              disabled={claimOwnership.isPending}
            >
              {claimOwnership.isPending ? 'Claiming...' : 'Become Billing Owner'}
            </Button>
          )}
        </Stack>
      </div>
    )
  }

  // No banner needed
  return null
}
