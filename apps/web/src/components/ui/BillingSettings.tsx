'use client'

import { useState } from 'react'
import { Button, Text, Heading, Stack, Card, Badge, Modal } from '@/components/ui'
import { trpc } from '@/lib/trpc'
import { MIN_MEMBERS_TO_ACTIVATE, REQUIRE_PAYMENT_TO_ACTIVATE } from '@band-it/shared'

interface BillingSettingsProps {
  bandId: string
  bandSlug: string
  userId: string
}

export function BillingSettings({ bandId, bandSlug, userId }: BillingSettingsProps) {
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null)

  const { data: billingInfo, isLoading, refetch } = trpc.band.getBillingInfo.useQuery(
    { bandId, userId },
    { enabled: !!bandId && !!userId }
  )

  const { data: candidates } = trpc.band.getBillingOwnerCandidates.useQuery(
    { bandId, userId },
    { enabled: !!bandId && !!userId && showTransferModal }
  )

  const createCheckout = trpc.band.createCheckoutSession.useMutation()
  const createPortal = trpc.band.createPortalSession.useMutation()
  const transferOwnership = trpc.band.transferBillingOwnership.useMutation()
  const claimOwnership = trpc.band.claimBillingOwnership.useMutation()

  if (isLoading) {
    return (
      <Card>
        <Stack spacing="md">
          <Heading level={3}>Billing Settings</Heading>
          <Text variant="muted">Loading...</Text>
        </Stack>
      </Card>
    )
  }

  if (!billingInfo) {
    return (
      <Card>
        <Stack spacing="md">
          <Heading level={3}>Billing Settings</Heading>
          <Text variant="muted">Unable to load billing information.</Text>
        </Stack>
      </Card>
    )
  }

  // In test mode, show a simplified message
  if (!REQUIRE_PAYMENT_TO_ACTIVATE) {
    return (
      <Card>
        <Stack spacing="md">
          <Heading level={3}>Billing Settings</Heading>
          <div className="bg-green-50 p-3 rounded-lg">
            <Text variant="small" className="text-green-700">
              Billing is currently disabled (test mode).{MIN_MEMBERS_TO_ACTIVATE > 1 && ` Bands are automatically activated when they reach ${MIN_MEMBERS_TO_ACTIVATE} members.`}
            </Text>
          </div>
          {MIN_MEMBERS_TO_ACTIVATE > 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text variant="small" className="text-gray-500">Members</Text>
                <Text weight="semibold">{billingInfo.memberCount}</Text>
              </div>
            </div>
          )}
        </Stack>
      </Card>
    )
  }

  const {
    billingStatus,
    billingOwner,
    memberCount,
    currentPriceAmount,
    willUpgrade,
    willDowngrade,
    billingCycleStart,
    gracePeriodDaysLeft,
  } = billingInfo

  const isBillingOwner = billingOwner?.id === userId
  const hasBillingOwner = !!billingOwner

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

  // Handle portal
  const handleManagePayment = async () => {
    try {
      const result = await createPortal.mutateAsync({ bandId, userId })
      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      console.error('Failed to create portal:', error)
    }
  }

  // Handle transfer
  const handleTransfer = async () => {
    if (!selectedNewOwner) return
    try {
      await transferOwnership.mutateAsync({
        bandId,
        userId,
        newOwnerId: selectedNewOwner,
      })
      setShowTransferModal(false)
      refetch()
    } catch (error) {
      console.error('Failed to transfer ownership:', error)
    }
  }

  // Handle claim
  const handleClaim = async () => {
    try {
      await claimOwnership.mutateAsync({ bandId, userId })
      refetch()
    } catch (error) {
      console.error('Failed to claim ownership:', error)
    }
  }

  // Get status badge color
  const getStatusBadge = () => {
    switch (billingStatus) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>
      case 'PENDING':
        return <Badge variant="warning">Payment Required</Badge>
      case 'PAST_DUE':
        return <Badge variant="danger">Past Due</Badge>
      case 'INACTIVE':
        return <Badge variant="neutral">Inactive</Badge>
      case 'NONE':
        return <Badge variant="neutral">Not Required</Badge>
      default:
        return <Badge variant="neutral">{billingStatus}</Badge>
    }
  }

  return (
    <>
      <Card>
        <Stack spacing="lg">
          <div className="flex items-center justify-between">
            <Heading level={3}>Billing Settings</Heading>
            {getStatusBadge()}
          </div>

          {/* Billing Status Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text variant="small" className="text-gray-500">Plan</Text>
              <Text weight="semibold">
                ${currentPriceAmount}/month ({memberCount >= 21 ? '21+ members' : `${MIN_MEMBERS_TO_ACTIVATE}-20 members`})
              </Text>
            </div>
            <div>
              <Text variant="small" className="text-gray-500">Members</Text>
              <Text weight="semibold">{memberCount}</Text>
            </div>
            <div>
              <Text variant="small" className="text-gray-500">Billing Owner</Text>
              <Text weight="semibold">
                {billingOwner ? (
                  <>
                    {billingOwner.name}
                    {isBillingOwner && <span className="text-blue-600 ml-2">(You)</span>}
                  </>
                ) : (
                  <span className="text-orange-600">No owner assigned</span>
                )}
              </Text>
            </div>
            {billingCycleStart && (
              <div>
                <Text variant="small" className="text-gray-500">Billing Cycle Start</Text>
                <Text weight="semibold">
                  {new Date(billingCycleStart).toLocaleDateString()}
                </Text>
              </div>
            )}
          </div>

          {/* Upgrade/Downgrade Notice */}
          {willUpgrade && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <Text variant="small" className="text-blue-700">
                Your subscription will be upgraded to $100/month when the 21st member joins.
              </Text>
            </div>
          )}
          {willDowngrade && (
            <div className="bg-yellow-50 p-3 rounded-lg">
              <Text variant="small" className="text-yellow-700">
                Your subscription will be downgraded to $20/month at the end of the billing cycle.
              </Text>
            </div>
          )}

          {/* Grace Period Warning */}
          {billingStatus === 'PAST_DUE' && gracePeriodDaysLeft !== null && (
            <div className="bg-red-50 p-3 rounded-lg">
              <Text variant="small" className="text-red-700 font-medium">
                Payment failed! {gracePeriodDaysLeft} days remaining to update payment method before band is deactivated.
              </Text>
            </div>
          )}

          {/* Actions */}
          <div className="border-t pt-4">
            <Stack spacing="sm">
              {/* No owner - show claim button */}
              {!hasBillingOwner && memberCount >= MIN_MEMBERS_TO_ACTIVATE && (
                <Button
                  variant="primary"
                  onClick={handleClaim}
                  disabled={claimOwnership.isPending}
                >
                  {claimOwnership.isPending ? 'Claiming...' : 'Become Billing Owner'}
                </Button>
              )}

              {/* Billing owner actions */}
              {isBillingOwner && (
                <>
                  {billingStatus === 'PENDING' && (
                    <Button
                      variant="primary"
                      onClick={handlePayment}
                      disabled={createCheckout.isPending}
                    >
                      {createCheckout.isPending ? 'Loading...' : `Set Up Payment ($${currentPriceAmount}/month)`}
                    </Button>
                  )}

                  {(billingStatus === 'ACTIVE' || billingStatus === 'PAST_DUE') && (
                    <Button
                      variant={billingStatus === 'PAST_DUE' ? 'danger' : 'secondary'}
                      onClick={handleManagePayment}
                      disabled={createPortal.isPending}
                    >
                      {createPortal.isPending ? 'Loading...' : 'Manage Payment Method'}
                    </Button>
                  )}

                  {billingStatus === 'INACTIVE' && memberCount >= MIN_MEMBERS_TO_ACTIVATE && (
                    <Button
                      variant="primary"
                      onClick={handlePayment}
                      disabled={createCheckout.isPending}
                    >
                      {createCheckout.isPending ? 'Loading...' : 'Reactivate Subscription'}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    onClick={() => setShowTransferModal(true)}
                  >
                    Transfer Billing Ownership
                  </Button>
                </>
              )}

              {/* Non-owner, but owner exists */}
              {hasBillingOwner && !isBillingOwner && (
                <Text variant="small" className="text-gray-500">
                  Only the billing owner ({billingOwner.name}) can manage payment settings.
                </Text>
              )}
            </Stack>
          </div>
        </Stack>
      </Card>

      {/* Transfer Ownership Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false)
          setSelectedNewOwner(null)
        }}
      >
        <Stack spacing="md">
          <Heading level={3}>Transfer Billing Ownership</Heading>
          <Text>
            Select a member to transfer billing ownership to. They will be responsible for managing payments.
          </Text>

          <div className="max-h-60 overflow-y-auto">
            {candidates?.candidates
              ?.filter((c: { isBillingOwner: boolean }) => !c.isBillingOwner)
              .map((candidate: { userId: string; name: string; role: string }) => (
                <div
                  key={candidate.userId}
                  className={`p-3 border rounded-lg mb-2 cursor-pointer transition-colors ${
                    selectedNewOwner === candidate.userId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedNewOwner(candidate.userId)}
                >
                  <Text weight="semibold">{candidate.name}</Text>
                  <Text variant="small" className="text-gray-500">
                    {candidate.role}
                  </Text>
                </div>
              ))}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowTransferModal(false)
                setSelectedNewOwner(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleTransfer}
              disabled={!selectedNewOwner || transferOwnership.isPending}
            >
              {transferOwnership.isPending ? 'Transferring...' : 'Transfer Ownership'}
            </Button>
          </div>
        </Stack>
      </Modal>
    </>
  )
}
