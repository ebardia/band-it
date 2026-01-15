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
  Flex,
  Card,
  Badge,
  Loading,
  Alert,
  BandLayout
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
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Band Projects"
          isMember={false}
        >
          <Loading message="Loading projects..." />
        </BandLayout>
      </>
    )
  }

  if (!bandData?.band) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Band Projects"
          isMember={false}
        >
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </BandLayout>
      </>
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

  const statusCounts = {
    PLANNING: projects.filter((p: any) => p.status === 'PLANNING').length,
    ACTIVE: projects.filter((p: any) => p.status === 'ACTIVE').length,
    ON_HOLD: projects.filter((p: any) => p.status === 'ON_HOLD').length,
    COMPLETED: projects.filter((p: any) => p.status === 'COMPLETED').length,
    CANCELLED: projects.filter((p: any) => p.status === 'CANCELLED').length,
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        pageTitle="Band Projects"
        canApprove={canApprove}
        isMember={isMember}
      >
        <Stack spacing="xl">
          {/* Summary Stats */}
          <Flex gap="md" className="flex-wrap">
            <Card className="flex-1 min-w-[120px]">
              <Stack spacing="xs">
                <Text variant="small" color="muted">Active</Text>
                <Heading level={2}>{statusCounts.ACTIVE}</Heading>
              </Stack>
            </Card>
            <Card className="flex-1 min-w-[120px]">
              <Stack spacing="xs">
                <Text variant="small" color="muted">Planning</Text>
                <Heading level={2}>{statusCounts.PLANNING}</Heading>
              </Stack>
            </Card>
            <Card className="flex-1 min-w-[120px]">
              <Stack spacing="xs">
                <Text variant="small" color="muted">On Hold</Text>
                <Heading level={2}>{statusCounts.ON_HOLD}</Heading>
              </Stack>
            </Card>
            <Card className="flex-1 min-w-[120px]">
              <Stack spacing="xs">
                <Text variant="small" color="muted">Completed</Text>
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
                  hover
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
                        <Text color="muted" className="line-clamp-2">
                          {project.description}
                        </Text>
                      )}
                      <Flex gap="sm" align="center">
                        {getStatusBadge(project.status)}
                        <Text variant="small" color="muted">
                          From: {project.proposal.title}
                        </Text>
                      </Flex>
                      <Flex gap="md">
                        <Text variant="small" color="muted">
                          Created by {project.createdBy.name}
                        </Text>
                        {project.targetDate && (
                          <Text variant="small" color="muted">
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
                <Text variant="small" color="muted">
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
      </BandLayout>
    </>
  )
}