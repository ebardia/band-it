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
  DashboardContainer,
  Flex,
  Card,
  Badge,
  Loading,
  Alert
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { DashboardSidebar } from '@/components/DashboardSidebar'

export default function MyProjectsPage() {
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

  const { data: myProposalsData } = trpc.proposal.getMyProposals.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: myProjectsData, isLoading } = trpc.project.getMyProjects.useQuery(
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
        <DashboardContainer>
          <Loading message="Loading projects..." />
        </DashboardContainer>
      </PageWrapper>
    )
  }

  const bandCount = myBandsData?.bands.length || 0
  const proposalCount = myProposalsData?.proposals.length || 0
  const projectCount = myProjectsData?.projects.length || 0
  const taskCount = myTasksData?.tasks.length || 0
  const projects = myProjectsData?.projects || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return <Badge variant="info">Planning</Badge>
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>
      case 'ON_HOLD':
        return <Badge variant="warning">On Hold</Badge>
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <PageWrapper variant="dashboard">
      <AppNav />

      <DashboardContainer>
        <Flex gap="md" align="start">
          <DashboardSidebar 
            bandCount={bandCount}
            proposalCount={proposalCount}
            projectCount={projectCount}
            taskCount={taskCount}
          />

          <div className="flex-1">
            <Stack spacing="xl">
              <Heading level={1}>My Projects</Heading>
              <Text color="muted">Projects you lead or created across all bands</Text>

              {projects.length > 0 ? (
                <Stack spacing="md">
                  {projects.map((project: any) => (
                    <Card 
                      key={project.id}
                      hover
                      onClick={() => router.push(`/bands/${project.band.slug}/projects/${project.id}`)}
                    >
                      <Flex justify="between" align="start">
                        <Stack spacing="sm">
                          <Heading level={3}>{project.name}</Heading>
                          <Text variant="small" color="muted">
                            Band: {project.band.name}
                          </Text>
                          <Flex gap="sm">
                            {getStatusBadge(project.status)}
                            <Badge variant="neutral">{project._count.tasks} tasks</Badge>
                            {project.lead && (
                              <Badge variant="info">Lead: {project.lead.name}</Badge>
                            )}
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
                    <Text>You're not leading any projects yet.</Text>
                    <Text variant="small" color="muted">
                      Projects are created from approved proposals.
                    </Text>
                  </Stack>
                </Alert>
              )}
            </Stack>
          </div>
        </Flex>
      </DashboardContainer>
    </PageWrapper>
  )
}