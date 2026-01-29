'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Card,
  Loading,
  Alert,
  AdminLayout,
  Flex,
  Badge,
  Button,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function AdminArchivedBandsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedBandId, setSelectedBandId] = useState<string | null>(null)

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

  const { data: profileData, isLoading: profileLoading } = trpc.auth.getProfile.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: archivedData, isLoading: archivedLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.band.getArchivedBands.useInfiniteQuery(
      { userId: userId!, limit: 20 },
      {
        enabled: !!userId && profileData?.user?.isAdmin,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    )

  const { data: detailsData, isLoading: detailsLoading } = trpc.band.getArchivedBandDetails.useQuery(
    { userId: userId!, bandId: selectedBandId! },
    { enabled: !!userId && !!selectedBandId && profileData?.user?.isAdmin }
  )

  // Check if user is admin
  if (profileLoading) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Archived Bands" subtitle="Loading...">
          <Loading message="Checking permissions..." />
        </AdminLayout>
      </>
    )
  }

  if (!profileData?.user?.isAdmin) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Access Denied">
          <Alert variant="danger">
            <Text>You do not have permission to access the admin area.</Text>
          </Alert>
        </AdminLayout>
      </>
    )
  }

  const getMethodBadge = (method: string | null) => {
    switch (method) {
      case 'DIRECT':
        return <Badge variant="warning">Direct</Badge>
      case 'PROPOSAL':
        return <Badge variant="info">Proposal</Badge>
      default:
        return <Badge variant="neutral">Unknown</Badge>
    }
  }

  const allBands = archivedData?.pages.flatMap(page => page.bands) || []

  return (
    <>
      <AppNav />
      <AdminLayout pageTitle="Archived Bands" subtitle="View dissolved bands">
        <Stack spacing="lg">
          {/* Back to active bands */}
          <Flex>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/bands')}
            >
              ← Back to Active Bands
            </Button>
          </Flex>

          {/* Two column layout: list and details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bands List */}
            <Card>
              <Stack spacing="md">
                <Heading level={3}>Dissolved Bands</Heading>

                {archivedLoading ? (
                  <Loading message="Loading archived bands..." />
                ) : allBands.length > 0 ? (
                  <>
                    <div className="divide-y divide-gray-100">
                      {allBands.map((band: any) => (
                        <div
                          key={band.id}
                          className={`py-3 cursor-pointer hover:bg-gray-50 px-2 rounded ${selectedBandId === band.id ? 'bg-blue-50' : ''}`}
                          onClick={() => setSelectedBandId(band.id)}
                        >
                          <Stack spacing="xs">
                            <Flex gap="sm" align="center">
                              <Text weight="semibold">{band.name}</Text>
                              {getMethodBadge(band.dissolutionMethod)}
                            </Flex>
                            <Text variant="small" color="muted">/{band.slug}</Text>
                            <Text variant="small" color="muted">
                              Dissolved {new Date(band.dissolvedAt).toLocaleDateString()}
                              {band.dissolvedBy && ` by ${band.dissolvedBy.name}`}
                            </Text>
                          </Stack>
                        </div>
                      ))}
                    </div>

                    {/* Load more */}
                    {hasNextPage && (
                      <Button
                        variant="ghost"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? 'Loading...' : 'Load More'}
                      </Button>
                    )}
                  </>
                ) : (
                  <Alert variant="info">
                    <Text>No dissolved bands found</Text>
                  </Alert>
                )}
              </Stack>
            </Card>

            {/* Band Details */}
            <Card>
              <Stack spacing="md">
                <Heading level={3}>Details</Heading>

                {!selectedBandId ? (
                  <Text color="muted">Select a band to view details</Text>
                ) : detailsLoading ? (
                  <Loading message="Loading details..." />
                ) : detailsData?.band ? (
                  <Stack spacing="md">
                    {/* Basic Info */}
                    <div>
                      <Text variant="small" color="muted">Band Name</Text>
                      <Text weight="semibold">{detailsData.band.name}</Text>
                    </div>

                    <div>
                      <Text variant="small" color="muted">Slug</Text>
                      <Text>/{detailsData.band.slug}</Text>
                    </div>

                    <div>
                      <Text variant="small" color="muted">Dissolution Method</Text>
                      <Flex gap="sm" align="center">
                        {getMethodBadge(detailsData.band.dissolutionMethod)}
                        <Text variant="small">
                          {detailsData.band.dissolutionMethod === 'DIRECT'
                            ? '(Founder dissolved directly)'
                            : '(Dissolved via unanimous vote)'}
                        </Text>
                      </Flex>
                    </div>

                    <div>
                      <Text variant="small" color="muted">Dissolved At</Text>
                      <Text>{new Date(detailsData.band.dissolvedAt!).toLocaleString()}</Text>
                    </div>

                    {detailsData.band.dissolvedBy && (
                      <div>
                        <Text variant="small" color="muted">Dissolved By</Text>
                        <Text>{detailsData.band.dissolvedBy.name} ({detailsData.band.dissolvedBy.email})</Text>
                      </div>
                    )}

                    <div>
                      <Text variant="small" color="muted">Reason</Text>
                      <Text className="whitespace-pre-wrap bg-gray-50 p-3 rounded text-sm">
                        {detailsData.band.dissolutionReason || 'No reason provided'}
                      </Text>
                    </div>

                    {/* Members at time of dissolution */}
                    <div>
                      <Text variant="small" color="muted">Members ({detailsData.band.members.length})</Text>
                      <div className="mt-2 space-y-1">
                        {detailsData.band.members.map((member: any) => (
                          <Flex key={member.id} gap="sm" align="center">
                            <Text variant="small">{member.user.name}</Text>
                            <Badge variant="neutral" size="sm">{member.role}</Badge>
                            <Badge
                              variant={member.status === 'ACTIVE' ? 'success' : 'neutral'}
                              size="sm"
                            >
                              {member.status}
                            </Badge>
                          </Flex>
                        ))}
                      </div>
                    </div>

                    {/* Recent Audit Logs */}
                    {detailsData.band.auditLogs && detailsData.band.auditLogs.length > 0 && (
                      <div>
                        <Text variant="small" color="muted">Recent Activity</Text>
                        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                          {detailsData.band.auditLogs.slice(0, 10).map((log: any) => (
                            <div key={log.id} className="text-xs bg-gray-50 p-2 rounded">
                              <Text variant="small">
                                <span className="font-medium">{log.action}</span>
                                {' '}{log.entityType} {log.entityName && `"${log.entityName}"`}
                              </Text>
                              <Text variant="small" color="muted">
                                {new Date(log.createdAt).toLocaleString()}
                              </Text>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Stack>
                ) : (
                  <Alert variant="danger">
                    <Text>Failed to load band details</Text>
                  </Alert>
                )}
              </Stack>
            </Card>
          </div>
        </Stack>
      </AdminLayout>
    </>
  )
}
