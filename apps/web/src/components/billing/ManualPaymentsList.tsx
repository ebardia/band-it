'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Stack,
  Flex,
  Text,
  Card,
  Badge,
  Button,
  Select,
  Loading,
  Alert,
} from '@/components/ui'
import { PaymentConfirmationCard } from './PaymentConfirmationCard'
import { DisputeResolutionCard } from './DisputeResolutionCard'

interface ManualPaymentsListProps {
  bandId: string
  userId: string
  canViewAll: boolean
  isGovernor: boolean
  isTreasurer: boolean
  bandSlug: string
}

type PaymentStatus = 'ALL' | 'PENDING' | 'CONFIRMED' | 'DISPUTED' | 'REJECTED' | 'AUTO_CONFIRMED'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ZELLE: 'Zelle',
  VENMO: 'Venmo',
  CASHAPP: 'Cash App',
  CASH: 'Cash',
  CHECK: 'Check',
  OTHER: 'Other',
}

export function ManualPaymentsList({
  bandId,
  userId,
  canViewAll,
  isGovernor,
  isTreasurer,
  bandSlug,
}: ManualPaymentsListProps) {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>('ALL')
  const utils = trpc.useUtils()

  const { data, isLoading, error } = trpc.manualPayment.list.useQuery({
    bandId,
    userId,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    limit: 50,
  })

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
      PENDING: 'warning',
      CONFIRMED: 'success',
      AUTO_CONFIRMED: 'success',
      DISPUTED: 'danger',
      REJECTED: 'danger',
    }
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      AUTO_CONFIRMED: 'Auto-Confirmed',
      DISPUTED: 'Disputed',
      REJECTED: 'Rejected',
    }
    return <Badge variant={variants[status] || 'neutral'}>{labels[status] || status}</Badge>
  }

  const handleRefresh = () => {
    utils.manualPayment.list.invalidate({ bandId, userId })
    utils.manualPayment.myPending.invalidate({ bandId, userId })
    utils.manualPayment.getDisputedPayments.invalidate({ bandId, userId })
  }

  if (isLoading) {
    return <Loading message="Loading payments..." />
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Text>Failed to load payments: {error.message}</Text>
      </Alert>
    )
  }

  const payments = data?.payments || []

  return (
    <Stack spacing="md">
      {/* Filters */}
      <Flex gap="md" align="center" wrap="wrap">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PaymentStatus)}
          className="w-48"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="AUTO_CONFIRMED">Auto-Confirmed</option>
          <option value="DISPUTED">Disputed</option>
          <option value="REJECTED">Rejected</option>
        </Select>

        <Button variant="ghost" size="sm" onClick={handleRefresh}>
          Refresh
        </Button>
      </Flex>

      {/* Payments List */}
      {payments.length === 0 ? (
        <Alert variant="info">
          <Text>No payments found matching your criteria.</Text>
        </Alert>
      ) : (
        <Stack spacing="sm">
          {payments.map((payment) => {
            // Check if this payment needs user action
            const needsUserAction =
              payment.status === 'PENDING' &&
              ((payment.initiatedByRole === 'MEMBER' && isTreasurer && payment.initiatedById !== userId) ||
                (payment.initiatedByRole === 'TREASURER' && payment.memberUserId === userId))

            const needsGovernorResolution = payment.status === 'DISPUTED' && isGovernor

            if (needsUserAction) {
              return (
                <PaymentConfirmationCard
                  key={payment.id}
                  payment={payment}
                  userId={userId}
                  onAction={handleRefresh}
                />
              )
            }

            if (needsGovernorResolution) {
              return (
                <DisputeResolutionCard
                  key={payment.id}
                  payment={payment}
                  userId={userId}
                  onAction={handleRefresh}
                />
              )
            }

            // Regular payment card (read-only view)
            return (
              <Card key={payment.id} className="border">
                <Flex justify="between" align="start">
                  <Stack spacing="sm">
                    <Flex gap="md" align="center">
                      <Text weight="semibold">{payment.member.user.name}</Text>
                      {getStatusBadge(payment.status)}
                    </Flex>
                    <Flex gap="lg" wrap="wrap">
                      <Stack spacing="xs">
                        <Text variant="small" color="muted">
                          Amount
                        </Text>
                        <Text weight="semibold">{formatCurrency(payment.amount)}</Text>
                      </Stack>
                      <Stack spacing="xs">
                        <Text variant="small" color="muted">
                          Method
                        </Text>
                        <Text>
                          {PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
                          {payment.paymentMethodOther && ` (${payment.paymentMethodOther})`}
                        </Text>
                      </Stack>
                      <Stack spacing="xs">
                        <Text variant="small" color="muted">
                          Payment Date
                        </Text>
                        <Text>{new Date(payment.paymentDate).toLocaleDateString()}</Text>
                      </Stack>
                      <Stack spacing="xs">
                        <Text variant="small" color="muted">
                          Initiated By
                        </Text>
                        <Text>
                          {payment.initiatedBy.name} ({payment.initiatedByRole.toLowerCase()})
                        </Text>
                      </Stack>
                    </Flex>
                    {payment.note && (
                      <Text variant="small" color="muted">
                        Note: {payment.note}
                      </Text>
                    )}
                    {payment.status === 'DISPUTED' && payment.disputeReason && (
                      <Text variant="small" className="text-red-600">
                        Dispute reason: {payment.disputeReason}
                      </Text>
                    )}
                    {payment.resolutionNote && (
                      <Text variant="small" color="muted">
                        Resolution: {payment.resolutionNote}
                      </Text>
                    )}
                  </Stack>
                  <Stack spacing="xs" className="text-right">
                    <Text variant="small" color="muted">
                      Created
                    </Text>
                    <Text variant="small">{new Date(payment.createdAt).toLocaleDateString()}</Text>
                    {payment.confirmedAt && (
                      <>
                        <Text variant="small" color="muted" className="mt-2">
                          Confirmed
                        </Text>
                        <Text variant="small">
                          {new Date(payment.confirmedAt).toLocaleDateString()}
                        </Text>
                      </>
                    )}
                  </Stack>
                </Flex>
              </Card>
            )
          })}
        </Stack>
      )}
    </Stack>
  )
}
