'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Button,
  useToast,
  PageWrapper,
  DashboardContainer,
  Flex,
  Card,
  Alert,
  Loading,
  Badge
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function InvitationsPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const { data: invitationsData, isLoading, refetch } = trpc.band.getMyInvitations.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const acceptMutation = trpc.band.acceptInvitation.useMutation({
    onSuccess: () => {
      showToast('Invitation accepted!', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const declineMutation = trpc.band.declineInvitation.useMutation({
    onSuccess: () => {
      showToast('Invitation declined', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleAccept = (membershipId: string) => {
    if (!userId) return
    acceptMutation.mutate({ membershipId, userId })
  }

  const handleDecline = (membershipId: string) => {
    if (!userId) return
    declineMutation.mutate({ membershipId, userId })
  }

  if (isLoading) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer>
          <Loading message="Loading invitations..." />
        </DashboardContainer>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper variant="dashboard">
      <AppNav />

      <DashboardContainer>
        <Stack spacing="xl">
          <Heading level={1}>Band Invitations</Heading>
          <Text variant="muted">You've been invited to join these bands</Text>

          {invitationsData?.invitations && invitationsData.invitations.length > 0 ? (
            <Stack spacing="md">
              {invitationsData.invitations.map((invitation: any) => (
                <Card key={invitation.id}>
                  <Stack spacing="md">
                    <Flex justify="between">
                      <Stack spacing="sm">
                        <Heading level={2}>{invitation.band.name}</Heading>
                        <Badge variant="warning">Pending Invitation</Badge>
                      </Stack>
                    </Flex>

                    <Text>{invitation.band.description}</Text>

                    {invitation.notes && (
                      <Alert variant="info">
                        <Text variant="small" weight="semibold">Invitation Message:</Text>
                        <Text variant="small">{invitation.notes}</Text>
                      </Alert>
                    )}

                    <Flex gap="md">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => handleAccept(invitation.id)}
                        disabled={acceptMutation.isPending || declineMutation.isPending}
                      >
                        {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={() => handleDecline(invitation.id)}
                        disabled={acceptMutation.isPending || declineMutation.isPending}
                      >
                        {declineMutation.isPending ? 'Declining...' : 'Decline'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => router.push(`/bands/${invitation.band.slug}/about`)}
                      >
                        View Band
                      </Button>
                    </Flex>
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : (
            <Alert variant="info">
              <Text>You don't have any pending invitations.</Text>
            </Alert>
          )}
        </Stack>
      </DashboardContainer>
    </PageWrapper>
  )
}