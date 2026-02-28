'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Text,
  Stack,
  Button,
  Flex,
  Badge,
  Loading,
  useToast,
  Modal,
  Alert,
} from '@/components/ui'
import { DonationsList } from './DonationsList'
import { MyDonations } from './MyDonations'

interface DonationsTabContentProps {
  bandId: string
  userId: string
  bandSlug: string
  isTreasurer: boolean
  onOpenDonationModal: () => void
}

const PAYMENT_METHODS: Record<string, string> = {
  ZELLE: 'Zelle',
  VENMO: 'Venmo',
  CASHAPP: 'Cash App',
  CASH: 'Cash',
  CHECK: 'Check',
  OTHER: 'Other',
}

export function DonationsTabContent({
  bandId,
  userId,
  bandSlug,
  isTreasurer,
  onOpenDonationModal,
}: DonationsTabContentProps) {
  const { showToast } = useToast()
  const utils = trpc.useUtils()

  const [activeSubTab, setActiveSubTab] = useState<'my' | 'all'>('my')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null)
  const [confirmNote, setConfirmNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  // Get donation settings
  const { data: settingsData, isLoading: settingsLoading } = trpc.donation.getSettings.useQuery(
    { bandId, userId },
    { enabled: !!bandId && !!userId }
  )

  // Get summary for treasurers
  const { data: summaryData } = trpc.donation.getSummary.useQuery(
    { bandId, userId },
    { enabled: !!bandId && !!userId && isTreasurer }
  )

  const confirmMutation = trpc.donation.confirm.useMutation({
    onSuccess: () => {
      showToast('Donation confirmed!', 'success')
      utils.donation.list.invalidate()
      utils.donation.getSummary.invalidate()
      setShowConfirmModal(false)
      setSelectedDonationId(null)
      setConfirmNote('')
    },
    onError: (error) => {
      showToast(error.message || 'Failed to confirm donation', 'error')
    },
  })

  const rejectMutation = trpc.donation.reject.useMutation({
    onSuccess: () => {
      showToast('Donation rejected', 'success')
      utils.donation.list.invalidate()
      utils.donation.getSummary.invalidate()
      setShowRejectModal(false)
      setSelectedDonationId(null)
      setRejectReason('')
    },
    onError: (error) => {
      showToast(error.message || 'Failed to reject donation', 'error')
    },
  })

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const handleConfirm = (donationId: string) => {
    setSelectedDonationId(donationId)
    setShowConfirmModal(true)
  }

  const handleReject = (donationId: string) => {
    setSelectedDonationId(donationId)
    setShowRejectModal(true)
  }

  const confirmDonation = () => {
    if (!selectedDonationId) return
    confirmMutation.mutate({
      donationId: selectedDonationId,
      userId,
      note: confirmNote || undefined,
    })
  }

  const rejectDonation = () => {
    if (!selectedDonationId || !rejectReason.trim()) {
      showToast('Please provide a rejection reason', 'error')
      return
    }
    rejectMutation.mutate({
      donationId: selectedDonationId,
      userId,
      reason: rejectReason,
    })
  }

  if (settingsLoading) {
    return <Loading message="Loading donation settings..." />
  }

  const settings = settingsData?.settings
  const donationsEnabled = settings?.donationsEnabled

  // Payment info from settings
  const paymentInfo = settings?.donationPaymentInfo as Record<string, string> | null

  return (
    <Stack spacing="md">
      {/* Donations Status */}
      {!donationsEnabled && (
        <Alert variant="warning">
          <Text variant="small">
            Donations are not enabled for this band.
            {isTreasurer && ' Enable them in Finance settings.'}
          </Text>
        </Alert>
      )}

      {/* Treasurer Summary */}
      {isTreasurer && summaryData?.summary && (
        <div className="border border-gray-200 rounded-lg bg-white p-3">
          <Text weight="semibold" className="mb-2">Donation Summary</Text>
          <Flex gap="sm" className="flex-wrap">
            <Badge variant="warning">{summaryData.summary.pendingCount} pending</Badge>
            <Badge variant="info">{summaryData.summary.expectedCount} expected</Badge>
            <Badge variant="success">{summaryData.summary.confirmedThisMonth} confirmed this month</Badge>
            <Badge variant="neutral">{summaryData.summary.activeRecurringCount} recurring</Badge>
          </Flex>
          <Text variant="small" color="muted" className="mt-2">
            Total confirmed: {formatCurrency(summaryData.summary.totalConfirmedAmount)}
          </Text>
        </div>
      )}

      {/* Sub-tabs for treasurers */}
      {isTreasurer && (
        <Flex gap="sm" className="border-b pb-2">
          <button
            onClick={() => setActiveSubTab('my')}
            className={`px-3 py-1 text-sm rounded ${
              activeSubTab === 'my'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Donations
          </button>
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-3 py-1 text-sm rounded ${
              activeSubTab === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Donations
          </button>
        </Flex>
      )}

      {/* Main Content */}
      <div className="border border-gray-200 rounded-lg bg-white p-3">
        <div className="flex justify-between items-center mb-3">
          <Text weight="semibold">
            {activeSubTab === 'all' ? 'All Donations' : 'My Donations'}
          </Text>
          {donationsEnabled && (
            <Button variant="primary" size="sm" onClick={onOpenDonationModal}>
              Make Donation
            </Button>
          )}
        </div>

        {activeSubTab === 'my' ? (
          <MyDonations
            bandId={bandId}
            userId={userId}
            bandSlug={bandSlug}
          />
        ) : (
          <DonationsList
            bandId={bandId}
            userId={userId}
            isTreasurer={isTreasurer}
            onConfirm={handleConfirm}
            onReject={handleReject}
          />
        )}
      </div>

      {/* Payment Info */}
      {donationsEnabled && paymentInfo && Object.keys(paymentInfo).length > 0 && (
        <div className="border border-blue-200 rounded-lg bg-blue-50 p-3">
          <Text weight="semibold" className="mb-2">Payment Information</Text>
          <div className="space-y-1 text-sm">
            {Object.entries(paymentInfo).map(([method, info]) => (
              <div key={method} className="flex items-center gap-2">
                <Badge variant="neutral">{PAYMENT_METHODS[method.toUpperCase()] || method}</Badge>
                <span>{info}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
        <Text variant="small" color="muted">
          Donations require treasurer confirmation. Recurring donations auto-cancel after 3 missed payments.
        </Text>
      </div>

      {/* Confirm Modal */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)}>
        <Stack spacing="md">
          <Text weight="semibold" className="text-lg">Confirm Donation</Text>
          <Text variant="small" color="muted">
            Confirm that you've received this donation payment.
          </Text>

          <div>
            <label className="block text-sm font-medium mb-1">Note (Optional)</label>
            <textarea
              value={confirmNote}
              onChange={(e) => setConfirmNote(e.target.value)}
              placeholder="Any notes about this confirmation"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Flex gap="sm" justify="end">
            <Button variant="ghost" size="sm" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={confirmDonation}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? 'Confirming...' : 'Confirm'}
            </Button>
          </Flex>
        </Stack>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)}>
        <Stack spacing="md">
          <Text weight="semibold" className="text-lg">Reject Donation</Text>
          <Text variant="small" color="muted">
            Provide a reason for rejecting this donation.
          </Text>

          <div>
            <label className="block text-sm font-medium mb-1">Reason *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Payment not received, incorrect amount"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <Flex gap="sm" justify="end">
            <Button variant="ghost" size="sm" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={rejectDonation}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </Stack>
  )
}

export default DonationsTabContent
