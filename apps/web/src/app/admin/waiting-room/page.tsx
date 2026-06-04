'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import {
  Text,
  Stack,
  Card,
  Loading,
  Alert,
  AdminLayout,
  Flex,
  Badge,
  Button,
  Input,
  useToast,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function AdminWaitingRoomPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const utils = trpc.useUtils()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded = jwtDecode<{ userId: string }>(token)
        setUserId(decoded.userId)
      } catch {
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

  const { data: pendingData, isLoading: pendingLoading } = trpc.admin.getUsersPendingAccess.useQuery(
    { userId: userId!, search: search || undefined, page, limit: 50 },
    { enabled: !!userId && profileData?.user?.isAdmin }
  )

  const approveMutation = trpc.admin.approveUsersAccess.useMutation({
    onSuccess: (result) => {
      const emailNote =
        result.emailsFailed > 0
          ? ` (${result.emailsFailed} email${result.emailsFailed !== 1 ? 's' : ''} failed to send)`
          : ''
      showToast(
        `Invited ${result.approvedCount} user${result.approvedCount !== 1 ? 's' : ''} to enter Band It${emailNote}`,
        result.emailsFailed > 0 ? 'warning' : 'success'
      )
      setSelectedIds(new Set())
      utils.admin.getUsersPendingAccess.invalidate()
      utils.admin.getUsers.invalidate()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const pageUserIds = useMemo(
    () => pendingData?.users.map((u) => u.id) ?? [],
    [pendingData?.users]
  )

  const allOnPageSelected =
    pageUserIds.length > 0 && pageUserIds.every((id) => selectedIds.has(id))

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of pageUserIds) {
          next.delete(id)
        }
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of pageUserIds) {
          next.add(id)
        }
        return next
      })
    }
  }

  const handleApprove = () => {
    if (selectedIds.size === 0) return
    if (
      !confirm(
        `Invite ${selectedIds.size} user${selectedIds.size !== 1 ? 's' : ''} to enter Band It? They will receive an email and can access the platform immediately.`
      )
    ) {
      return
    }
    approveMutation.mutate({
      adminUserId: userId!,
      targetUserIds: Array.from(selectedIds),
    })
  }

  if (profileLoading) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Waiting room" subtitle="Loading...">
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

  const inviteAction =
    selectedIds.size > 0 ? (
      <Button
        variant="primary"
        onClick={handleApprove}
        disabled={approveMutation.isPending}
      >
        {approveMutation.isPending
          ? 'Sending invites…'
          : `Invite ${selectedIds.size} to enter`}
      </Button>
    ) : null

  return (
    <>
      <AppNav />
      <AdminLayout
        pageTitle="Waiting room"
        subtitle="Approve members one at a time or in bulk — each receives an email when invited in"
        action={inviteAction}
      >
        <Stack spacing="lg">
          <Alert variant="info">
            <Text variant="small">
              These users registered but are still outside the members&apos; entrance. Check the
              boxes for everyone you want to let in, then click Invite to enter. They get
              platform access and an email with a login link.
            </Text>
          </Alert>

          <Flex gap="md" align="center">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
                setSelectedIds(new Set())
              }}
              className="flex-1"
            />
            {pendingData && pendingData.total > 0 && (
              <Text variant="small" color="muted">
                {pendingData.total} waiting
              </Text>
            )}
          </Flex>

          {pendingLoading ? (
            <Loading message="Loading waiting room..." />
          ) : pendingData?.users && pendingData.users.length > 0 ? (
            <>
              <Card>
                <div className="divide-y divide-gray-100">
                  <Flex align="center" className="py-2 px-1 border-b border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleAllOnPage}
                        className="h-4 w-4 rounded border-gray-300"
                        aria-label="Select all on this page"
                      />
                      <Text variant="small" weight="semibold" color="muted">
                        Select all on page
                      </Text>
                    </label>
                  </Flex>
                  {pendingData.users.map((user) => (
                    <Flex
                      key={user.id}
                      justify="between"
                      align="center"
                      className="py-3 gap-3"
                    >
                      <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="h-4 w-4 mt-1 rounded border-gray-300 flex-shrink-0"
                          aria-label={`Select ${user.name}`}
                        />
                        <Stack spacing="xs" className="min-w-0">
                          <Flex gap="sm" align="center" wrap="wrap">
                            <Text weight="semibold">{user.name}</Text>
                            {!user.emailVerified && (
                              <Badge variant="secondary">Unverified email</Badge>
                            )}
                          </Flex>
                          <Text variant="small" color="muted">
                            {user.email}
                          </Text>
                          <Text variant="small" color="muted">
                            Joined {new Date(user.createdAt).toLocaleString()}
                          </Text>
                        </Stack>
                      </label>
                    </Flex>
                  ))}
                </div>
              </Card>

              {pendingData.pages > 1 && (
                <Flex justify="between" align="center">
                  <Text variant="small" color="muted">
                    Page {page} of {pendingData.pages}
                  </Text>
                  <Flex gap="sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPage((p) => Math.max(1, p - 1))
                        setSelectedIds(new Set())
                      }}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPage((p) => Math.min(pendingData.pages, p + 1))
                        setSelectedIds(new Set())
                      }}
                      disabled={page === pendingData.pages}
                    >
                      Next
                    </Button>
                  </Flex>
                </Flex>
              )}
            </>
          ) : (
            <Alert variant="info">
              <Text>
                No one is waiting{search ? ` matching "${search}"` : ''}. New signups will appear
                here until you invite them in.
              </Text>
            </Alert>
          )}
        </Stack>
      </AdminLayout>
    </>
  )
}
