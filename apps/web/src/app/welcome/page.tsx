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
  Badge,
  Box
} from '@/components/ui'
import Image from 'next/image'

export default function WelcomePage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

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

  // Get user welcome state
  const { data: welcomeState, isLoading: stateLoading } = trpc.onboarding.getUserWelcomeState.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  // Get available templates
  const { data: templatesData, isLoading: templatesLoading } = trpc.onboarding.getTemplates.useQuery()

  // Get pending invitations
  const { data: invitationsData, isLoading: invitationsLoading, refetch: refetchInvitations } = trpc.band.getMyInvitations.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  // Mark welcome as complete
  const completeWelcomeMutation = trpc.onboarding.completeWelcome.useMutation({
    onSuccess: () => {
      router.push('/bands/my-bands')
    },
  })

  // Accept invitation
  const acceptMutation = trpc.band.acceptInvitation.useMutation({
    onSuccess: () => {
      showToast('Invitation accepted! Redirecting...', 'success')
      // Mark welcome complete and redirect
      if (userId) {
        completeWelcomeMutation.mutate({ userId })
      }
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleAcceptInvitation = (membershipId: string) => {
    if (!userId) return
    acceptMutation.mutate({ membershipId, userId })
  }

  const handleCreateBand = () => {
    if (!selectedTemplate) {
      showToast('Please select a template', 'error')
      return
    }
    // Navigate to create band with selected template
    router.push(`/bands/create?template=${selectedTemplate}`)
  }

  const handleSkipToDiscover = () => {
    if (userId) {
      completeWelcomeMutation.mutate({ userId })
    }
    router.push('/discover')
  }

  // Redirect if already completed welcome and has bands
  useEffect(() => {
    if (welcomeState && welcomeState.hasCompletedWelcome && welcomeState.hasBands) {
      router.push('/bands/my-bands')
    }
  }, [welcomeState, router])

  const isLoading = stateLoading || templatesLoading || invitationsLoading

  if (isLoading) {
    return (
      <PageWrapper variant="dashboard">
        <DashboardContainer>
          <Loading message="Loading..." />
        </DashboardContainer>
      </PageWrapper>
    )
  }

  const templates = templatesData?.templates || []
  const invitations = invitationsData?.invitations || []

  return (
    <PageWrapper variant="dashboard">
      <DashboardContainer>
        <div className="max-w-3xl mx-auto py-8">
          <Stack spacing="xl">
            {/* Header */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Image
                  src="/logo.png"
                  alt="Band IT Logo"
                  width={150}
                  height={150}
                  priority
                />
              </div>
              <Heading level={1}>Welcome to Band IT</Heading>
              <Text variant="muted" className="mt-2">
                Let's get you started with collective decision-making
              </Text>
            </div>

            {/* Pending Invitations Section */}
            {invitations.length > 0 && (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <Stack spacing="md">
                  <Flex justify="between" align="center">
                    <Heading level={3}>You've Been Invited!</Heading>
                    <Badge variant="info">{invitations.length} pending</Badge>
                  </Flex>
                  <Text variant="muted">
                    Someone wants you to join their band. Accept to get started right away.
                  </Text>
                  <Stack spacing="sm">
                    {invitations.map((invitation: any) => (
                      <Card key={invitation.id} className="bg-white">
                        <Flex justify="between" align="center" gap="md">
                          <div className="flex-1">
                            <Text weight="semibold">{invitation.band.name}</Text>
                            <Text variant="small" color="muted">{invitation.band.description}</Text>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            disabled={acceptMutation.isPending}
                          >
                            {acceptMutation.isPending ? 'Joining...' : 'Join'}
                          </Button>
                        </Flex>
                      </Card>
                    ))}
                  </Stack>
                </Stack>
              </Card>
            )}

            {/* Create Band Section */}
            <Card>
              <Stack spacing="lg">
                <div>
                  <Heading level={2}>Create Your Own Band</Heading>
                  <Text variant="muted" className="mt-1">
                    What kind of group are you organizing? Choose a template to get started with tailored guidance.
                  </Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template: any) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{template.emoji}</span>
                        <div className="flex-1">
                          <Text weight="semibold">{template.name}</Text>
                          <Text variant="small" color="muted">{template.description}</Text>
                        </div>
                        {selectedTemplate === template.id && (
                          <span className="text-blue-500 text-xl">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleCreateBand}
                  disabled={!selectedTemplate}
                  className="w-full"
                >
                  Continue with {selectedTemplate ? templates.find((t: any) => t.id === selectedTemplate)?.name : 'Selected Template'}
                </Button>
              </Stack>
            </Card>

            {/* Alternative Options */}
            <div className="text-center">
              <Text variant="small" color="muted">
                Not ready to start a band?
              </Text>
              <Button
                variant="link"
                onClick={handleSkipToDiscover}
                className="mt-1"
              >
                Browse existing bands instead
              </Button>
            </div>
          </Stack>
        </div>
      </DashboardContainer>
    </PageWrapper>
  )
}
