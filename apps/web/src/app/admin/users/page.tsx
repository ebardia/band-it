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

export default function AdminUsersPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const utils = trpc.useUtils()

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

  const { data: usersData, isLoading: usersLoading } = trpc.admin.getUsers.useQuery(
    { userId: userId!, search: search || undefined, page, limit: 20 },
    { enabled: !!userId && profileData?.user?.isAdmin }
  )

  const setAdminMutation = trpc.admin.setUserAdmin.useMutation({
    onSuccess: () => {
      utils.admin.getUsers.invalidate()
    },
  })

  // Check if user is admin
  if (profileLoading) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Users" subtitle="Loading...">
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

  const handleToggleAdmin = (targetUserId: string, currentIsAdmin: boolean) => {
    if (targetUserId === userId && currentIsAdmin) {
      alert('You cannot remove your own admin status')
      return
    }
    setAdminMutation.mutate({
      adminUserId: userId!,
      targetUserId,
      isAdmin: !currentIsAdmin,
    })
  }

  return (
    <>
      <AppNav />
      <AdminLayout pageTitle="Users" subtitle="Manage platform users">
        <Stack spacing="lg">
          {/* Search */}
          <Flex gap="md">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="flex-1"
            />
          </Flex>

          {/* Users List */}
          {usersLoading ? (
            <Loading message="Loading users..." />
          ) : usersData?.users && usersData.users.length > 0 ? (
            <>
              <Card>
                <div className="divide-y divide-gray-100">
                  {usersData.users.map((user: any) => (
                    <Flex
                      key={user.id}
                      justify="between"
                      align="center"
                      className="py-3"
                    >
                      <Stack spacing="xs">
                        <Flex gap="sm" align="center">
                          <Text weight="semibold">{user.name}</Text>
                          {user.isAdmin && <Badge variant="info">Admin</Badge>}
                          {!user.emailVerified && <Badge variant="warning">Unverified</Badge>}
                        </Flex>
                        <Text variant="small" color="muted">{user.email}</Text>
                        <Text variant="small" color="muted">
                          {user._count.memberships} band{user._count.memberships !== 1 ? 's' : ''} · Joined {new Date(user.createdAt).toLocaleDateString()}
                        </Text>
                      </Stack>
                      <Flex gap="sm">
                        <Button
                          variant={user.isAdmin ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                          disabled={setAdminMutation.isPending}
                        >
                          {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </Button>
                      </Flex>
                    </Flex>
                  ))}
                </div>
              </Card>

              {/* Pagination */}
              {usersData.pages > 1 && (
                <Flex justify="between" align="center">
                  <Text variant="small" color="muted">
                    Page {page} of {usersData.pages} ({usersData.total} users)
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
                      onClick={() => setPage(p => Math.min(usersData.pages, p + 1))}
                      disabled={page === usersData.pages}
                    >
                      Next →
                    </Button>
                  </Flex>
                </Flex>
              )}
            </>
          ) : (
            <Alert variant="info">
              <Text>No users found{search ? ` matching "${search}"` : ''}</Text>
            </Alert>
          )}
        </Stack>
      </AdminLayout>
    </>
  )
}
