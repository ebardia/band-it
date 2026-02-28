'use client'

import { trpc } from '@/lib/trpc'
import { Text, Badge, Loading, Button, Flex, Stack } from '@/components/ui'

interface DonationsListProps {
  bandId: string
  userId: string
  isTreasurer: boolean
  onConfirm?: (donationId: string) => void
  onReject?: (donationId: string) => void
}

const STATUS_BADGES: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info'; label: string }> = {
  EXPECTED: { variant: 'info', label: 'Expected' },
  PENDING: { variant: 'warning', label: 'Pending' },
  CONFIRMED: { variant: 'success', label: 'Confirmed' },
  MISSED: { variant: 'danger', label: 'Missed' },
  REJECTED: { variant: 'danger', label: 'Rejected' },
  CANCELLED: { variant: 'neutral', label: 'Cancelled' },
}

const PAYMENT_METHODS: Record<string, string> = {
  ZELLE: 'Zelle',
  VENMO: 'Venmo',
  CASHAPP: 'Cash App',
  CASH: 'Cash',
  CHECK: 'Check',
  OTHER: 'Other',
}

export function DonationsList({ bandId, userId, isTreasurer, onConfirm, onReject }: DonationsListProps) {
  const { data, isLoading, refetch } = trpc.donation.list.useQuery(
    { bandId, userId, limit: 50 },
    { enabled: !!bandId && !!userId }
  )

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  if (isLoading) {
    return <Loading message="Loading donations..." />
  }

  const donations = data?.donations || []

  if (donations.length === 0) {
    return (
      <Text variant="small" color="muted">No donations yet.</Text>
    )
  }

  return (
    <div className="space-y-2">
      {donations.map((donation) => {
        const statusInfo = STATUS_BADGES[donation.status] || STATUS_BADGES.PENDING
        const paymentMethod = PAYMENT_METHODS[donation.paymentMethod] || donation.paymentMethodOther || 'Unknown'

        return (
          <div key={donation.id} className="border border-gray-200 rounded p-2 hover:bg-gray-50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <Flex gap="sm" align="center" className="flex-wrap">
                  <Text weight="semibold">{formatCurrency(donation.amount)}</Text>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  {donation.recurringDonation && (
                    <Badge variant="info">{donation.recurringDonation.frequency}</Badge>
                  )}
                </Flex>
                <div className="text-xs text-gray-500 mt-1">
                  {isTreasurer && donation.donor && (
                    <span>From: {donation.donor.name} | </span>
                  )}
                  <span>{paymentMethod}</span>
                  {donation.referenceNumber && <span> | Ref: {donation.referenceNumber}</span>}
                  <span> | {new Date(donation.createdAt).toLocaleDateString()}</span>
                </div>
                {donation.donorNote && (
                  <Text variant="small" color="muted" className="mt-1 truncate">
                    {donation.donorNote}
                  </Text>
                )}
              </div>

              {/* Treasurer actions for pending donations */}
              {isTreasurer && donation.status === 'PENDING' && (
                <Flex gap="xs">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => onConfirm?.(donation.id)}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onReject?.(donation.id)}
                  >
                    Reject
                  </Button>
                </Flex>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default DonationsList
