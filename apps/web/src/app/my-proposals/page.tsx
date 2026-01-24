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
  PageWrapper,
  Flex,
  Card,
  Badge,
  Loading,
  Alert
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { DashboardSidebar } from '@/components/DashboardSidebar'

export default function MyProposalsPage() {
  const router = useRouter()
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

  const { data: myBandsData } = trpc.band.getMyBands.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: myProposalsData, isLoading } = trpc.proposal.getMyProposals.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: myProjectsData } = trpc.project.getMyProjects.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: myTasksData } = trpc.task.getMyTasks.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  if (!userId || isLoading) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <div className="flex-1 p-8">
          <Loading message="Loading proposals..." />
        </div>
      </PageWrapper>
    )
  }

  const bandCount = myBandsData?.bands.length || 0
  const proposalCount = myProposalsData?.proposals.length || 0
  const projectCount = myProjectsData?.projects.length || 0
  const taskCount = myTasksData?.tasks.length || 0
  const proposals = myProposalsData?.proposals || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="info">Open</Badge>
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>
      case 'CLOSED':
        return <Badge variant="neutral">Closed</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <PageWrapper variant="dashboard">
      <AppNav />

      <div className="flex min-h-[calc(100vh-64px)] gap-6 p-6">
        {/* Left Sidebar */}
        <DashboardSidebar
          bandCount={bandCount}
          proposalCount={proposalCount}
          projectCount={projectCount}
          taskCount={taskCount}
        />

        {/* Main Content Area */}
        <div className="flex-1">
          <Stack spacing="lg">
            <Stack spacing="xs">
              <Heading level={1}>My Proposals</Heading>
              <Text color="muted">Proposals you've created across all bands</Text>
            </Stack>
              {proposals.length > 0 ? (
                <Stack spacing="md">
                  {proposals.map((proposal: any) => (
                    <Card 
                      key={proposal.id}
                      hover
                      onClick={() => router.push(`/bands/${proposal.band.slug}/proposals/${proposal.id}`)}
                    >
                      <Flex justify="between" align="start">
                        <Stack spacing="sm">
                          <Heading level={3}>{proposal.title}</Heading>
                          <Text variant="small" color="muted">
                            Band: {proposal.band.name}
                          </Text>
                          <Flex gap="sm">
                            {getStatusBadge(proposal.status)}
                            <Badge variant="neutral">{proposal._count.votes} votes</Badge>
                          </Flex>
                        </Stack>
                        <Button variant="secondary" size="sm">
                          View →
                        </Button>
                      </Flex>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Alert variant="info">
                  <Stack spacing="sm">
                    <Text>You haven't created any proposals yet.</Text>
                    <Text variant="small" color="muted">
                      Go to one of your bands to create a proposal.
                    </Text>
                  </Stack>
                </Alert>
              )}
          </Stack>
        </div>
      </div>
    </PageWrapper>
  )
}