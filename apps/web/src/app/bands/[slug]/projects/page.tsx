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
  PageWrapper,
  DashboardContainer,
  Flex,
  Card,
  Badge,
  Loading,
  Alert,
  BandSidebar
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function BandProjectsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

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

  const { data: bandData, isLoading: bandLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const { data: projectsData, isLoading: projectsLoading } = trpc.project.getByBand.useQuery(
    { bandId: bandData?.band?.id || '', status: statusFilter as any },
    { enabled: !!bandData?.band?.id }
  )

  if (bandLoading || projectsLoading) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer>
          <Loading message="Loading projects..." />
        </DashboardContainer>
      </PageWrapper>
    )
  }

  if (!bandData?.band) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer>
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </DashboardContainer>
      </PageWrapper>
    )
  }

  const band = bandData.band
  const projects = projectsData?.projects || []
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const isMember = !!currentMember
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)

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

  const statusFilters = [
    { value: undefined, label: 'All' },
    { value: 'PLANNING', label: 'Planning' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ON_HOLD', label: 'On Hold' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ]

  // Group projects by status for summary
  const statusCounts = {
    PLANNING: projects.filter((p: any) => p.status === 'PLANNING').length,
    ACTIVE: projects.filter((p: any) => p.status === 'ACTIVE').length,
    ON_HOLD: projects.filter((p: any) => p.status === 'ON_HOLD').length,
    COMPLETED: projects.filter((p: any) => p.status === 'COMPLETED').length,
    CANCELLED: projects.filter((p: any) => p.status === 'CANCELLED').length,
  }

  return (
    <PageWrapper variant="dashboard">
      <AppNav />

      <DashboardContainer>
        <Flex gap="md" align="start">
          {/* Left Sidebar */}
          <BandSidebar 
            bandSlug={slug} 
            canApprove={canApprove} 
            isMember={isMember}
          />

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-lg shadow p-8">
            <Stack spacing="xl">
              {/* Header */}
              <Stack spacing="sm">
                <Heading level={1}>Projects</Heading>
                <Text variant="muted">{band.name}</Text>
              </Stack>

              {/* Summary Stats */}
              <Flex gap="md" className="flex-wrap">
                <Card className="flex-1 min-w-[120px]">
                  <Stack spacing="xs">
                    <Text variant="small" className="text-gray-500">Active</Text>
                    <Heading level={2}>{statusCounts.ACTIVE}</Heading>
                  </Stack>
                </Card>
                <Card className="flex-1 min-w-[120px]">
                  <Stack spacing="xs">
                    <Text variant="small" className="text-gray-500">Planning</Text>
                    <Heading level={2}>{statusCounts.PLANNING}</Heading>
                  </Stack>
                </Card>
                <Card className="flex-1 min-w-[120px]">
                  <Stack spacing="xs">
                    <Text variant="small" className="text-gray-500">On Hold</Text>
                    <Heading level={2}>{statusCounts.ON_HOLD}</Heading>
                  </Stack>
                </Card>
                <Card className="flex-1 min-w-[120px]">
                  <Stack spacing="xs">
                    <Text variant="small" className="text-gray-500">Completed</Text>
                    <Heading level={2}>{statusCounts.COMPLETED}</Heading>
                  </Stack>
                </Card>
              </Flex>

              {/* Filter */}
              <Flex gap="sm" className="flex-wrap">
                {statusFilters.map((filter) => (
                  <Button
                    key={filter.value || 'all'}
                    variant={statusFilter === filter.value ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter(filter.value)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </Flex>

              {/* Projects List */}
              {projects.length > 0 ? (
                <Stack spacing="md">
                  {projects.map((project: any) => (
                    <Card 
                      key={project.id}
                      className="cursor-pointer hover:shadow-lg transition"
                      onClick={() => router.push(`/bands/${slug}/projects/${project.id}`)}
                    >
                      <Flex justify="between" align="start">
                        <Stack spacing="sm">
                          <Flex gap="sm" align="center">
                            <Heading level={3}>{project.name}</Heading>
                            {project.aiGenerated && (
                              <Badge variant="info">AI</Badge>
                            )}
                          </Flex>
                          {project.description && (
                            <Text variant="muted" className="line-clamp-2">
                              {project.description}
                            </Text>
                          )}
                          <Flex gap="sm" align="center">
                            {getStatusBadge(project.status)}
                            <Text variant="small" className="text-gray-500">
                              From: {project.proposal.title}
                            </Text>
                          </Flex>
                          <Flex gap="md">
                            <Text variant="small" className="text-gray-500">
                              Created by {project.createdBy.name}
                            </Text>
                            {project.targetDate && (
                              <Text variant="small" className="text-gray-500">
                                Target: {new Date(project.targetDate).toLocaleDateString()}
                              </Text>
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
                    <Text>No projects yet.</Text>
                    <Text variant="small" className="text-gray-600">
                      Projects are created from approved proposals. Go to Proposals to create and vote on ideas.
                    </Text>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push(`/bands/${slug}/proposals`)}
                    >
                      View Proposals
                    </Button>
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