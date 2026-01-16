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
  Input
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { DashboardSidebar } from '@/components/DashboardSidebar'

export default function BrowseBandsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

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

  const { data: bandsData, isLoading } = trpc.band.getAll.useQuery()

  // Fetch counts for sidebar
  const { data: myBandsData } = trpc.band.getMyBands.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: myProposalsData } = trpc.proposal.getMyProposals.useQuery(
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>
      case 'INACTIVE':
        return <Badge variant="neutral">Inactive</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  const filteredBands = bandsData?.bands.filter((band: any) => {
    const search = searchTerm.toLowerCase()
    return (
      band.name.toLowerCase().includes(search) ||
      band.description.toLowerCase().includes(search) ||
      band.values.some((v: string) => v.toLowerCase().includes(search))
    )
  })

  const bandCount = myBandsData?.bands.length || 0
  const proposalCount = myProposalsData?.proposals.length || 0
  const projectCount = myProjectsData?.projects.length || 0
  const taskCount = myTasksData?.tasks.length || 0

  if (isLoading) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer wide>
          <Flex gap="md" align="start">
            <DashboardSidebar />
            <div className="flex-1">
              <Loading message="Loading bands..." />
            </div>
          </Flex>
        </DashboardContainer>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper variant="dashboard">
      <AppNav />
      <DashboardContainer wide>
        <Flex gap="md" align="start">
          <DashboardSidebar
            bandCount={bandCount}
            proposalCount={proposalCount}
            projectCount={projectCount}
            taskCount={taskCount}
          />

          <div className="flex-1">
            <Stack spacing="xl">
              <Flex justify="between" align="center">
                <Heading level={1}>Discover Bands</Heading>
                <Button variant="primary" size="md" onClick={() => router.push('/bands/create')}>
                  Create Band
                </Button>
              </Flex>

              <Input
                label="Search Bands"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, description, or values..."
              />

              {filteredBands && filteredBands.length > 0 ? (
                <Stack spacing="md">
                  {filteredBands.map((band: any) => (
                    <Card key={band.id} hover>
                      <Stack spacing="md">
                        <Flex justify="between" align="center">
                          <Heading level={2}>{band.name}</Heading>
                          {getStatusBadge(band.status)}
                        </Flex>
                        <Text color="muted">{band.description}</Text>
                        <Flex justify="between">
                          <Text variant="small">
                            Founded by: <Text variant="small" weight="semibold">{band.createdBy.name}</Text>
                          </Text>
                          <Text variant="small">
                            Members: <Text variant="small" weight="semibold">{band._count?.members || 0}</Text>
                          </Text>
                        </Flex>
                        <Flex gap="sm">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push(`/bands/${band.slug}`)}
                          >
                            View Details
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => router.push(`/bands/${band.slug}/apply`)}
                          >
                            Apply to Join
                          </Button>
                        </Flex>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Card>
                  <Text>No bands found matching your search.</Text>
                </Card>
              )}
            </Stack>
          </div>
        </Flex>
      </DashboardContainer>
    </PageWrapper>
  )
}
