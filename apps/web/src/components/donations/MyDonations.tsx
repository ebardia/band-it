'use client'

import { trpc } from '@/lib/trpc'
import { Text, Badge, Loading, Button, Flex, Stack, useToast, Modal } from '@/components/ui'
import { useState } from 'react'

interface MyDonationsProps {
  bandId: string
  userId: string
  bandSlug: string
}

const STATUS_BADGES: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info'; label: string }> = {
  EXPECTED: { variant: 'info', label: 'Due' },
  PENDING: { variant: 'warning', label: 'Pending' },
  CONFIRMED: { variant: 'success', label: 'Confirmed' },
  MISSED: { variant: 'danger', label: 'Missed' },
  REJECTED: { variant: 'danger', label: 'Rejected' },
  CANCELLED: { variant: 'neutral', label: 'Cancelled' },
}

const RECURRING_STATUS_BADGES: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral'; label: string }> = {
  ACTIVE: { variant: 'success', label: 'Active' },
  PAUSED: { variant: 'warning', label: 'Paused' },
  CANCELLED: { variant: 'neutral', label: 'Cancelled' },
  AUTO_CANCELLED: { variant: 'danger', label: 'Auto-Cancelled' },
}

const PAYMENT_METHODS: Record<string, string> = {
  ZELLE: 'Zelle',
  VENMO: 'Venmo',
  CASHAPP: 'Cash App',
  CASH: 'Cash',
  CHECK: 'Check',
  OTHER: 'Other',
}

export function MyDonations({ bandId, userId, bandSlug }: MyDonationsProps) {
  const { showToast } = useToast()
  const utils = trpc.useUtils()

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submittingDonationId, setSubmittingDonationId] = useState<string | null>(null)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [submitNote, setSubmitNote] = useState('')

  const { data, isLoading } = trpc.donation.getMyDonations.useQuery(
    { bandId, userId },
    { enabled: !!bandId && !!userId }
  )

  const submitPaymentMutation = trpc.donation.submitPayment.useMutation({
    onSuccess: () => {
      showToast('Payment submitted! Awaiting treasurer confirmation.', 'success')
      utils.donation.getMyDonations.invalidate()
      setShowSubmitModal(false)
      setSubmittingDonationId(null)
      setReferenceNumber('')
      setSubmitNote('')
    },
    onError: (error) => {
      showToast(error.message || 'Failed to submit payment', 'error')
    },
  })

  const cancelRecurringMutation = trpc.donation.cancelRecurring.useMutation({
    onSuccess: () => {
      showToast('Recurring donation cancelled', 'success')
      utils.donation.getMyDonations.invalidate()
      setShowCancelModal(false)
      setCancellingId(null)
    },
    onError: (error) => {
      showToast(error.message || 'Failed to cancel recurring donation', 'error')
    },
  })

  const pauseRecurringMutation = trpc.donation.pauseRecurring.useMutation({
    onSuccess: () => {
      showToast('Recurring donation paused', 'success')
      utils.donation.getMyDonations.invalidate()
    },
    onError: (error) => {
      showToast(error.message || 'Failed to pause recurring donation', 'error')
    },
  })

  const resumeRecurringMutation = trpc.donation.resumeRecurring.useMutation({
    onSuccess: () => {
      showToast('Recurring donation resumed', 'success')
      utils.donation.getMyDonations.invalidate()
    },
    onError: (error) => {
      showToast(error.message || 'Failed to resume recurring donation', 'error')
    },
  })

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const handleSubmitPayment = (donationId: string) => {
    setSubmittingDonationId(donationId)
    setShowSubmitModal(true)
  }

  const confirmSubmitPayment = () => {
    if (!submittingDonationId) return
    submitPaymentMutation.mutate({
      donationId: submittingDonationId,
      userId,
      referenceNumber: referenceNumber || undefined,
      note: submitNote || undefined,
    })
  }

  if (isLoading) {
    return <Loading message="Loading your donations..." />
  }

  const { donations = [], recurringDonations = [], totalDonated = 0 } = data || {}

  // Find expected donations (due soon)
  const expectedDonations = donations.filter((d) => d.status === 'EXPECTED')

  return (
    <Stack spacing="md">
      {/* Total Donated */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <Text variant="small" color="muted">Total Donated</Text>
        <Text weight="bold" className="text-xl text-green-600">
          {formatCurrency(totalDonated)}
        </Text>
      </div>

      {/* Expected/Due Donations */}
      {expectedDonations.length > 0 && (
        <div className="border border-blue-200 rounded-lg bg-blue-50 p-3">
          <Text weight="semibold" className="mb-2">Donations Due</Text>
          <div className="space-y-2">
            {expectedDonations.map((donation) => {
              const paymentMethod = PAYMENT_METHODS[donation.paymentMethod] || 'Unknown'
              return (
                <div key={donation.id} className="bg-white rounded p-2 border border-blue-100">
                  <Flex justify="between" align="center">
                    <div>
                      <Text weight="semibold">{formatCurrency(donation.amount)}</Text>
                      <Text variant="small" color="muted">
                        {paymentMethod} | Due {donation.expectedDate ? new Date(donation.expectedDate).toLocaleDateString() : 'Soon'}
                      </Text>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSubmitPayment(donation.id)}
                    >
                      Mark as Paid
                    </Button>
                  </Flex>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recurring Donations */}
      {recurringDonations.length > 0 && (
        <div>
          <Text weight="semibold" className="mb-2">Recurring Donations</Text>
          <div className="space-y-2">
            {recurringDonations.map((recurring) => {
              const statusInfo = RECURRING_STATUS_BADGES[recurring.status] || RECURRING_STATUS_BADGES.ACTIVE
              const paymentMethod = PAYMENT_METHODS[recurring.paymentMethod] || 'Unknown'
              const nextDue = recurring.donations?.[0]

              return (
                <div key={recurring.id} className="border border-gray-200 rounded p-2">
                  <Flex justify="between" align="start">
                    <div>
                      <Flex gap="sm" align="center">
                        <Text weight="semibold">{formatCurrency(recurring.amount)}</Text>
                        <Badge variant="info">{recurring.frequency}</Badge>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </Flex>
                      <Text variant="small" color="muted" className="mt-1">
                        {paymentMethod}
                        {nextDue && recurring.status === 'ACTIVE' && (
                          <> | Next due: {new Date(nextDue.expectedDate).toLocaleDateString()}</>
                        )}
                        {recurring.missedCount > 0 && (
                          <span className="text-red-600"> | {recurring.missedCount} missed</span>
                        )}
                      </Text>
                    </div>

                    {recurring.status === 'ACTIVE' && (
                      <Flex gap="xs">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => pauseRecurringMutation.mutate({ recurringDonationId: recurring.id, userId })}
                          disabled={pauseRecurringMutation.isPending}
                        >
                          Pause
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setCancellingId(recurring.id)
                            setShowCancelModal(true)
                          }}
                        >
                          Cancel
                        </Button>
                      </Flex>
                    )}

                    {recurring.status === 'PAUSED' && (
                      <Flex gap="xs">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => resumeRecurringMutation.mutate({ recurringDonationId: recurring.id, userId })}
                          disabled={resumeRecurringMutation.isPending}
                        >
                          Resume
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setCancellingId(recurring.id)
                            setShowCancelModal(true)
                          }}
                        >
                          Cancel
                        </Button>
                      </Flex>
                    )}
                  </Flex>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Donations */}
      <div>
        <Text weight="semibold" className="mb-2">Recent Donations</Text>
        {donations.filter((d) => d.status !== 'EXPECTED').length > 0 ? (
          <div className="space-y-1">
            {donations.filter((d) => d.status !== 'EXPECTED').slice(0, 10).map((donation) => {
              const statusInfo = STATUS_BADGES[donation.status] || STATUS_BADGES.PENDING
              const paymentMethod = PAYMENT_METHODS[donation.paymentMethod] || 'Unknown'

              return (
                <div key={donation.id} className="flex items-center justify-between py-1 text-sm border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(donation.amount)}</span>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    {donation.recurringDonation && (
                      <Badge variant="neutral">{donation.recurringDonation.frequency}</Badge>
                    )}
                  </div>
                  <span className="text-gray-500">
                    {paymentMethod} | {new Date(donation.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <Text variant="small" color="muted">No donations yet.</Text>
        )}
      </div>

      {/* Submit Payment Modal */}
      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)}>
        <Stack spacing="md">
          <Text weight="semibold" className="text-lg">Submit Payment</Text>
          <Text variant="small" color="muted">
            Confirm that you've sent the payment. The treasurer will verify and confirm.
          </Text>

          <div>
            <label className="block text-sm font-medium mb-1">Reference Number (Optional)</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Transaction ID or confirmation number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Note (Optional)</label>
            <textarea
              value={submitNote}
              onChange={(e) => setSubmitNote(e.target.value)}
              placeholder="Any additional details"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Flex gap="sm" justify="end">
            <Button variant="ghost" size="sm" onClick={() => setShowSubmitModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={confirmSubmitPayment}
              disabled={submitPaymentMutation.isPending}
            >
              {submitPaymentMutation.isPending ? 'Submitting...' : 'Confirm Payment Sent'}
            </Button>
          </Flex>
        </Stack>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)}>
        <Stack spacing="md">
          <Text weight="semibold" className="text-lg">Cancel Recurring Donation?</Text>
          <Text variant="small" color="muted">
            This will stop all future expected donations. Any pending donations will also be cancelled.
          </Text>

          <Flex gap="sm" justify="end">
            <Button variant="ghost" size="sm" onClick={() => setShowCancelModal(false)}>
              Keep Donation
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (cancellingId) {
                  cancelRecurringMutation.mutate({ recurringDonationId: cancellingId, userId })
                }
              }}
              disabled={cancelRecurringMutation.isPending}
            >
              {cancelRecurringMutation.isPending ? 'Cancelling...' : 'Cancel Donation'}
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </Stack>
  )
}

export default MyDonations
