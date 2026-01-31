'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Button,
  useToast,
  Flex,
  Card,
  Alert,
  Loading,
  Badge,
  Select,
  List,
  ListItem,
  BandLayout
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function BandApplicationsPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [approveRoles, setApproveRoles] = useState<Record<string, string>>({})

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

  const { data: bandData } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const { data: applicationsData, isLoading, refetch } = trpc.band.getPendingApplications.useQuery(
    { bandId: bandData?.band?.id || '' },
    { enabled: !!bandData?.band?.id }
  )

  const approveMutation = trpc.band.approveApplication.useMutation({
    onSuccess: () => {
      showToast('Application approved!', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const rejectMutation = trpc.band.rejectApplication.useMutation({
    onSuccess: () => {
      showToast('Application rejected', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const getApproveRole = (application: any) => {
    return approveRoles[application.id] || application.requestedRole || 'VOTING_MEMBER'
  }

  const handleApprove = (membershipId: string, role: string) => {
    if (!userId) return
    approveMutation.mutate({ membershipId, approverId: userId, role: role as any })
  }

  const handleReject = (membershipId: string) => {
    if (!userId) return
    rejectMutation.mutate({ membershipId, approverId: userId })
  }

  // Check permissions
  const currentMember = bandData?.band?.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && bandData?.band?.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)

  if (isLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Pending Applications"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading applications..." />
        </BandLayout>
      </>
    )
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={bandData?.band?.name || ''}
        pageTitle="Pending Applications"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        bandId={bandData?.band?.id}
        userId={userId || undefined}
      >
        <Stack spacing="xl">
          <Text color="muted">Review and manage membership applications for {bandData?.band?.name}</Text>

          {applicationsData?.applications && applicationsData.applications.length > 0 ? (
            <Stack spacing="md">
              {applicationsData.applications.map((application: any) => (
                <Card key={application.id}>
                  <Stack spacing="md">
                    <Flex justify="between">
                      <Heading level={3}>{application.user.name}</Heading>
                      <Flex gap="sm">
                        <Badge variant="warning">Pending</Badge>
                        {application.requestedRole && (
                          <Badge variant="info">
                            Requested: {application.requestedRole.replace('_', ' ')}
                          </Badge>
                        )}
                      </Flex>
                    </Flex>

                    <Stack spacing="sm">
                      <Text variant="small" weight="semibold">Why they want to join:</Text>
                      <Text variant="small">{application.notes}</Text>
                    </Stack>

                    {application.user.strengths && application.user.strengths.length > 0 && (
                      <Stack spacing="sm">
                        <Text variant="small" weight="semibold">Strengths:</Text>
                        <List>
                          {application.user.strengths.map((strength: string, idx: number) => (
                            <ListItem key={idx}>{strength}</ListItem>
                          ))}
                        </List>
                      </Stack>
                    )}

                    {application.user.passions && application.user.passions.length > 0 && (
                      <Stack spacing="sm">
                        <Text variant="small" weight="semibold">Passions:</Text>
                        <List>
                          {application.user.passions.map((passion: string, idx: number) => (
                            <ListItem key={idx}>{passion}</ListItem>
                          ))}
                        </List>
                      </Stack>
                    )}

                    {application.user.developmentPath && application.user.developmentPath.length > 0 && (
                      <Stack spacing="sm">
                        <Text variant="small" weight="semibold">What they want to learn:</Text>
                        <List>
                          {application.user.developmentPath.map((goal: string, idx: number) => (
                            <ListItem key={idx}>{goal}</ListItem>
                          ))}
                        </List>
                      </Stack>
                    )}

                    <Flex gap="md" align="end">
                      <Select
                        label="Assign Role"
                        value={getApproveRole(application)}
                        onChange={(e) =>
                          setApproveRoles((prev) => ({ ...prev, [application.id]: e.target.value }))
                        }
                      >
                        <option value="OBSERVER">Observer</option>
                        <option value="VOTING_MEMBER">Voting Member</option>
                        <option value="CONDUCTOR">Conductor</option>
                        <option value="MODERATOR">Moderator</option>
                        <option value="GOVERNOR">Governor</option>
                      </Select>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => handleApprove(application.id, getApproveRole(application))}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        {approveMutation.isPending ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button
                        variant="danger"
                        size="md"
                        onClick={() => handleReject(application.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </Flex>
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : (
            <Alert variant="info">
              <Text>No pending applications at this time.</Text>
            </Alert>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}
