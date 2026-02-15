'use client'

import { useState } from 'react'
import { Button, Text, Stack, Badge, Modal, Flex } from '@/components/ui'
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
      <div className="border border-gray-200 rounded-lg bg-white p-3">
        <Text weight="semibold">Billing Settings</Text>
        <Text variant="small" color="muted">Loading...</Text>
      </div>
    )
  }

  if (!billingInfo) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-3">
        <Text weight="semibold">Billing Settings</Text>
        <Text variant="small" color="muted">Unable to load billing information.</Text>
      </div>
    )
  }

  // In test mode, show a simplified message
  if (!REQUIRE_PAYMENT_TO_ACTIVATE) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-3">
        <div className="flex items-center justify-between mb-2">
          <Text weight="semibold">Billing Settings</Text>
          <Badge variant="success">Test Mode</Badge>
        </div>
        <Text variant="small" color="muted">
          Billing disabled.{MIN_MEMBERS_TO_ACTIVATE > 1 && ` Auto-activated at ${MIN_MEMBERS_TO_ACTIVATE} members.`}
        </Text>
      </div>
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
      <div className="border border-gray-200 rounded-lg bg-white p-3">
        <div className="flex items-center justify-between mb-2">
          <Text weight="semibold">Billing Settings</Text>
          {getStatusBadge()}
        </div>

        {/* Billing Status Details */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-2">
          <span><span className="text-gray-500">Plan:</span> ${currentPriceAmount}/mo</span>
          <span><span className="text-gray-500">Members:</span> {memberCount}</span>
          <span>
            <span className="text-gray-500">Owner:</span>{' '}
            {billingOwner ? (
              <>{billingOwner.name}{isBillingOwner && <span className="text-blue-600"> (You)</span>}</>
            ) : (
              <span className="text-orange-600">None</span>
            )}
          </span>
          {billingCycleStart && <span><span className="text-gray-500">Cycle:</span> {new Date(billingCycleStart).toLocaleDateString()}</span>}
        </div>

        {/* Notices */}
        {willUpgrade && <Text variant="small" className="text-blue-600 mb-1">Upgrades to $100/mo at 21 members</Text>}
        {willDowngrade && <Text variant="small" className="text-yellow-600 mb-1">Downgrades to $20/mo end of cycle</Text>}
        {billingStatus === 'PAST_DUE' && gracePeriodDaysLeft !== null && (
          <Text variant="small" className="text-red-600 font-medium mb-1">{gracePeriodDaysLeft} days to update payment</Text>
        )}

        {/* Actions */}
        <Flex gap="sm" className="pt-2 border-t mt-2" wrap="wrap">
          {!hasBillingOwner && memberCount >= MIN_MEMBERS_TO_ACTIVATE && (
            <Button variant="primary" size="sm" onClick={handleClaim} disabled={claimOwnership.isPending}>
              {claimOwnership.isPending ? 'Claiming...' : 'Become Billing Owner'}
            </Button>
          )}

          {isBillingOwner && (
            <>
              {billingStatus === 'PENDING' && (
                <Button variant="primary" size="sm" onClick={handlePayment} disabled={createCheckout.isPending}>
                  {createCheckout.isPending ? 'Loading...' : `Set Up Payment ($${currentPriceAmount}/mo)`}
                </Button>
              )}
              {(billingStatus === 'ACTIVE' || billingStatus === 'PAST_DUE') && (
                <Button variant={billingStatus === 'PAST_DUE' ? 'danger' : 'secondary'} size="sm" onClick={handleManagePayment} disabled={createPortal.isPending}>
                  {createPortal.isPending ? 'Loading...' : 'Manage Payment'}
                </Button>
              )}
              {billingStatus === 'INACTIVE' && memberCount >= MIN_MEMBERS_TO_ACTIVATE && (
                <Button variant="primary" size="sm" onClick={handlePayment} disabled={createCheckout.isPending}>
                  {createCheckout.isPending ? 'Loading...' : 'Reactivate'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowTransferModal(true)}>Transfer</Button>
            </>
          )}

          {hasBillingOwner && !isBillingOwner && (
            <Text variant="small" color="muted">Only {billingOwner.name} can manage billing.</Text>
          )}
        </Flex>
      </div>

      {/* Transfer Ownership Modal */}
      <Modal isOpen={showTransferModal} onClose={() => { setShowTransferModal(false); setSelectedNewOwner(null) }}>
        <Stack spacing="md">
          <Text weight="semibold" className="text-lg">Transfer Billing Ownership</Text>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {candidates?.candidates
              ?.filter((c: { isBillingOwner: boolean }) => !c.isBillingOwner)
              .map((candidate: { userId: string; name: string; role: string }) => (
                <div
                  key={candidate.userId}
                  className={`p-2 border rounded cursor-pointer text-sm ${
                    selectedNewOwner === candidate.userId ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedNewOwner(candidate.userId)}
                >
                  <span className="font-medium">{candidate.name}</span>
                  <span className="text-gray-500 ml-2">{candidate.role}</span>
                </div>
              ))}
          </div>
          <Flex gap="sm" justify="end">
            <Button variant="ghost" size="sm" onClick={() => { setShowTransferModal(false); setSelectedNewOwner(null) }}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleTransfer} disabled={!selectedNewOwner || transferOwnership.isPending}>
              {transferOwnership.isPending ? 'Transferring...' : 'Transfer'}
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </>
  )
}
