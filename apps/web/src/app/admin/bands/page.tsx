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
  Input
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function AdminBandsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

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

  const { data: bandsData, isLoading: bandsLoading } = trpc.admin.getBands.useQuery(
    { userId: userId!, search: search || undefined, page, limit: 20 },
    { enabled: !!userId && profileData?.user?.isAdmin }
  )

  // Check if user is admin
  if (profileLoading) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Bands" subtitle="Loading...">
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>
      case 'INACTIVE':
        return <Badge variant="neutral">Inactive</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  const getBillingBadge = (billingStatus: string) => {
    switch (billingStatus) {
      case 'ACTIVE':
        return <Badge variant="success">Paid</Badge>
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>
      case 'PAST_DUE':
        return <Badge variant="danger">Past Due</Badge>
      case 'NONE':
        return <Badge variant="neutral">Free</Badge>
      default:
        return <Badge variant="neutral">{billingStatus}</Badge>
    }
  }

  return (
    <>
      <AppNav />
      <AdminLayout pageTitle="Bands" subtitle="Manage platform bands">
        <Stack spacing="lg">
          {/* Search */}
          <Flex gap="md">
            <Input
              placeholder="Search by name or slug..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="flex-1"
            />
          </Flex>

          {/* Bands List */}
          {bandsLoading ? (
            <Loading message="Loading bands..." />
          ) : bandsData?.bands && bandsData.bands.length > 0 ? (
            <>
              <Card>
                <div className="divide-y divide-gray-100">
                  {bandsData.bands.map((band: any) => (
                    <Flex
                      key={band.id}
                      justify="between"
                      align="center"
                      className="py-3"
                    >
                      <Stack spacing="xs">
                        <Flex gap="sm" align="center">
                          <Text weight="semibold">{band.name}</Text>
                          {getStatusBadge(band.status)}
                          {getBillingBadge(band.billingStatus)}
                        </Flex>
                        <Text variant="small" color="muted">/{band.slug}</Text>
                        <Text variant="small" color="muted">
                          {band._count.members} member{band._count.members !== 1 ? 's' : ''} · {band._count.proposals} proposal{band._count.proposals !== 1 ? 's' : ''} · {band._count.projects} project{band._count.projects !== 1 ? 's' : ''} · Created {new Date(band.createdAt).toLocaleDateString()}
                        </Text>
                      </Stack>
                      <Flex gap="sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/bands/${band.slug}`)}
                        >
                          View →
                        </Button>
                      </Flex>
                    </Flex>
                  ))}
                </div>
              </Card>

              {/* Pagination */}
              {bandsData.pages > 1 && (
                <Flex justify="between" align="center">
                  <Text variant="small" color="muted">
                    Page {page} of {bandsData.pages} ({bandsData.total} bands)
                  </Text>
                  <Flex gap="sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      ← Previous
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage(p => Math.min(bandsData.pages, p + 1))}
                      disabled={page === bandsData.pages}
                    >
                      Next →
                    </Button>
                  </Flex>
                </Flex>
              )}
            </>
          ) : (
            <Alert variant="info">
              <Text>No bands found{search ? ` matching "${search}"` : ''}</Text>
            </Alert>
          )}
        </Stack>
      </AdminLayout>
    </>
  )
}
