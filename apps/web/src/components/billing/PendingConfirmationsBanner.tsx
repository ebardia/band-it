'use client'

import { trpc } from '@/lib/trpc'
import { Flex, Text, Button, Alert } from '@/components/ui'

interface PendingConfirmationsBannerProps {
  bandId: string
  userId: string
  onViewClick?: () => void
}

export function PendingConfirmationsBanner({
  bandId,
  userId,
  onViewClick,
}: PendingConfirmationsBannerProps) {
  const { data, isLoading } = trpc.manualPayment.myPending.useQuery(
    { bandId, userId },
    { refetchInterval: 60000 } // Refresh every minute
  )

  if (isLoading || !data?.payments?.length) {
    return null
  }

  const count = data.payments.length
  const totalAmount = data.payments.reduce((sum, p) => sum + p.amount, 0)
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalAmount / 100)

  return (
    <div className="mb-4">
      <Alert variant="warning">
        <Flex justify="between" align="center" wrap="wrap" gap="md">
          <Text>
            <strong>{count}</strong> manual payment{count !== 1 ? 's' : ''} ({formattedTotal} total)
            {count === 1 ? ' requires' : ' require'} your confirmation.
          </Text>
          <Button variant="primary" size="sm" onClick={onViewClick}>
            Review Payments
          </Button>
        </Flex>
      </Alert>
    </div>
  )
}
