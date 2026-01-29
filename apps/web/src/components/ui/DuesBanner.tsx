'use client'

import { trpc } from '@/lib/trpc'
import { Alert, Text, Button, Flex } from '.'
import { useRouter } from 'next/navigation'

interface DuesBannerProps {
  bandId: string
  bandSlug: string
  userId: string
}

/**
 * Banner shown to members who haven't paid their dues.
 * Displays different messages based on standing status.
 */
export function DuesBanner({ bandId, bandSlug, userId }: DuesBannerProps) {
  const router = useRouter()

  const { data: standing, isLoading } = trpc.band.getMyStanding.useQuery(
    { bandId, userId },
    { enabled: !!bandId && !!userId }
  )

  // Don't show anything while loading or if in good standing
  if (isLoading || !standing || standing.inGoodStanding) {
    return null
  }

  // Exempt member banner (billing owner / treasurer with unpaid dues)
  if (standing.exempt) {
    const formattedAmount = standing.duesPlan
      ? `$${(standing.duesPlan.amountCents / 100).toFixed(2)}`
      : ''
    const interval = standing.duesPlan?.interval?.toLowerCase() || 'month'

    return (
      <Alert variant="info" className="mb-4">
        <Flex justify="between" align="center" className="flex-wrap gap-4">
          <div>
            <Text weight="semibold">You have not paid your dues.</Text>
            <Text variant="small" color="muted" className="mt-1">
              As billing owner/treasurer you can still participate, but your unpaid status is recorded.
            </Text>
          </div>
          <Flex gap="sm" align="center">
            {standing.duesPlan && (
              <Text variant="small" color="muted">
                {formattedAmount}/{interval}
              </Text>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/bands/${bandSlug}/billing`)}
            >
              Pay Dues
            </Button>
          </Flex>
        </Flex>
      </Alert>
    )
  }

  // Unpaid member banner
  const formattedAmount = standing.duesPlan
    ? `$${(standing.duesPlan.amountCents / 100).toFixed(2)}`
    : ''
  const interval = standing.duesPlan?.interval?.toLowerCase() || 'month'

  return (
    <Alert variant="warning" className="mb-4">
      <Flex justify="between" align="center" className="flex-wrap gap-4">
        <div>
          <Text weight="semibold">{standing.reason}</Text>
          <Text variant="small" color="muted" className="mt-1">
            You can view band content but cannot participate in discussions, proposals, or other activities until you pay.
          </Text>
        </div>
        <Flex gap="sm" align="center">
          {standing.duesPlan && (
            <Text variant="small" color="muted">
              {formattedAmount}/{interval}
            </Text>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/bands/${bandSlug}/billing`)}
          >
            Pay Dues Now
          </Button>
        </Flex>
      </Flex>
    </Alert>
  )
}
