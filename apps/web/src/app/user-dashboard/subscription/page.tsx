'use client'

import { useState, useEffect } from 'react'
import { UserDashboardLayout } from '@/components/UserDashboardLayout'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Button,
  useToast,
  Alert,
  Loading,
  Badge,
  Flex,
  Modal
} from '@/components/ui'

export default function SubscriptionPage() {
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
      }
    }
  }, [])

  const { data: profileData, isLoading, refetch } = trpc.auth.getProfile.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: subscriptionData } = trpc.payment.getSubscriptionStatus.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const cancelSubscriptionMutation = trpc.payment.cancelSubscription.useMutation({
    onSuccess: () => {
      showToast('Subscription canceled successfully', 'success')
      setShowCancelModal(false)
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleCancelConfirm = () => {
    if (!userId) return
    cancelSubscriptionMutation.mutate({ userId })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>
      case 'PAST_DUE':
        return <Badge variant="warning">Past Due</Badge>
      case 'CANCELED':
        return <Badge variant="danger">Canceled</Badge>
      case 'INCOMPLETE':
        return <Badge variant="neutral">Incomplete</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <UserDashboardLayout>
        <Loading message="Loading subscription..." />
      </UserDashboardLayout>
    )
  }

  const status = profileData?.user.subscriptionStatus || 'INCOMPLETE'

  return (
    <UserDashboardLayout>
      <Stack spacing="lg">
        <Heading level={1}>Subscription</Heading>
        <Text variant="muted">Manage your Band IT membership</Text>

        <Alert variant={status === 'ACTIVE' ? 'success' : 'warning'}>
          <Stack spacing="sm">
            <Flex justify="between">
              <Text variant="small" weight="semibold">Subscription Status</Text>
              {getStatusBadge(status)}
            </Flex>
            {status === 'ACTIVE' && (
              <Text variant="small">Your subscription is active and all features are available.</Text>
            )}
            {status === 'INCOMPLETE' && (
              <Text variant="small">Please complete payment to activate your subscription.</Text>
            )}
            {status === 'PAST_DUE' && (
              <Text variant="small">Your payment failed. Please update your payment method.</Text>
            )}
            {status === 'CANCELED' && (
              <Text variant="small">Your subscription has been canceled.</Text>
            )}
          </Stack>
        </Alert>

        <Alert variant="info">
          <Stack spacing="sm">
            <Text variant="small" weight="semibold">Plan Details</Text>
            <Text variant="small">Plan: Band IT Membership</Text>
            <Text variant="small">Price: $5.00 / month</Text>
            {subscriptionData?.startedAt && (
              <Text variant="small">
                Started: {new Date(subscriptionData.startedAt).toLocaleDateString()}
              </Text>
            )}
          </Stack>
        </Alert>

        {status === 'INCOMPLETE' && (
          <Button
            variant="primary"
            size="md"
            onClick={() => window.location.href = '/payment'}
          >
            Complete Payment
          </Button>
        )}

        {status === 'ACTIVE' && (
          <Stack spacing="sm">
            <Text variant="small" variant="muted">
              You can cancel your subscription at any time. Your access will continue until the end of your billing period.
            </Text>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelModal(true)}
            >
              Cancel subscription
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Cancel Confirmation Modal */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)}>
        <Stack spacing="lg">
          <Heading level={2}>Cancel Subscription?</Heading>
          <Text variant="muted">
            Are you sure you want to cancel your Band IT membership? You'll lose access to all features at the end of your billing period.
          </Text>
          <Alert variant="warning">
            <Text variant="small">
              This action cannot be undone. You can resubscribe anytime.
            </Text>
          </Alert>
          <Flex gap="md" justify="end">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setShowCancelModal(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleCancelConfirm}
              disabled={cancelSubscriptionMutation.isPending}
            >
              {cancelSubscriptionMutation.isPending ? 'Canceling...' : 'Yes, Cancel'}
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </UserDashboardLayout>
  )
}