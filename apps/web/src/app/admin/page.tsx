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
  Badge
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function AdminDashboardPage() {
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

  const { data: profileData, isLoading: profileLoading } = trpc.auth.getProfile.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: statsData, isLoading: statsLoading } = trpc.admin.getStats.useQuery(
    undefined,
    { enabled: !!userId && profileData?.user?.isAdmin }
  )

  // Check if user is admin
  if (profileLoading) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Admin Dashboard" subtitle="Loading...">
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
            <Stack spacing="sm">
              <Text weight="semibold">You do not have permission to access the admin area.</Text>
              <Text variant="small">This area is restricted to platform administrators only.</Text>
            </Stack>
          </Alert>
        </AdminLayout>
      </>
    )
  }

  return (
    <>
      <AppNav />
      <AdminLayout pageTitle="Admin Dashboard" subtitle="Platform Overview">
        <Stack spacing="xl">
          {/* Stats Cards */}
          {statsLoading ? (
            <Loading message="Loading statistics..." />
          ) : statsData ? (
            <>
              <Flex gap="md" className="flex-wrap">
                <Card className="flex-1 min-w-[200px]">
                  <Stack spacing="sm">
                    <Text variant="small" color="muted">Total Users</Text>
                    <Heading level={2}>{statsData.totalUsers}</Heading>
                  </Stack>
                </Card>
                <Card className="flex-1 min-w-[200px]">
                  <Stack spacing="sm">
                    <Text variant="small" color="muted">Total Bands</Text>
                    <Heading level={2}>{statsData.totalBands}</Heading>
                  </Stack>
                </Card>
                <Card className="flex-1 min-w-[200px]">
                  <Stack spacing="sm">
                    <Text variant="small" color="muted">Active Proposals</Text>
                    <Heading level={2}>{statsData.activeProposals}</Heading>
                  </Stack>
                </Card>
                <Card className="flex-1 min-w-[200px]">
                  <Stack spacing="sm">
                    <Text variant="small" color="muted">Open Tasks</Text>
                    <Heading level={2}>{statsData.openTasks}</Heading>
                  </Stack>
                </Card>
              </Flex>

              {/* Recent Activity */}
              <Card>
                <Stack spacing="md">
                  <Heading level={3}>Recent Activity</Heading>
                  {statsData.recentUsers && statsData.recentUsers.length > 0 ? (
                    <Stack spacing="sm">
                      <Text variant="small" weight="semibold" color="muted">New Users (Last 7 Days)</Text>
                      {statsData.recentUsers.map((user: any) => (
                        <Flex key={user.id} justify="between" align="center" className="py-2 border-b border-gray-100">
                          <Stack spacing="xs">
                            <Text weight="semibold">{user.name}</Text>
                            <Text variant="small" color="muted">{user.email}</Text>
                          </Stack>
                          <Text variant="small" color="muted">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </Text>
                        </Flex>
                      ))}
                    </Stack>
                  ) : (
                    <Text color="muted">No recent user registrations</Text>
                  )}
                </Stack>
              </Card>

              {/* Quick Links */}
              <Card>
                <Stack spacing="md">
                  <Heading level={3}>Quick Actions</Heading>
                  <Flex gap="md" className="flex-wrap">
                    <Badge
                      variant="info"
                      className="cursor-pointer hover:opacity-80 px-4 py-2"
                      onClick={() => router.push('/admin/users')}
                    >
                      Manage Users →
                    </Badge>
                    <Badge
                      variant="warning"
                      className="cursor-pointer hover:opacity-80 px-4 py-2"
                      onClick={() => router.push('/admin/moderation')}
                    >
                      Moderation Queue →
                    </Badge>
                    <Badge
                      variant="neutral"
                      className="cursor-pointer hover:opacity-80 px-4 py-2"
                      onClick={() => router.push('/admin/blocked-terms')}
                    >
                      Blocked Terms →
                    </Badge>
                  </Flex>
                </Stack>
              </Card>
            </>
          ) : (
            <Alert variant="warning">
              <Text>Unable to load statistics</Text>
            </Alert>
          )}
        </Stack>
      </AdminLayout>
    </>
  )
}
