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
  Input,
  Modal,
  Select,
  Textarea
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function AdminUsersPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const utils = trpc.useUtils()

  // Modal states
  const [warnModal, setWarnModal] = useState<{ open: boolean; user: any }>({ open: false, user: null })
  const [suspendModal, setSuspendModal] = useState<{ open: boolean; user: any }>({ open: false, user: null })
  const [banModal, setBanModal] = useState<{ open: boolean; user: any }>({ open: false, user: null })

  // Form states
  const [warnReason, setWarnReason] = useState('')
  const [suspendDays, setSuspendDays] = useState('7')
  const [suspendReason, setSuspendReason] = useState('')
  const [banReason, setBanReason] = useState('')

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

  const warnMutation = trpc.admin.warnUser.useMutation({
    onSuccess: () => {
      utils.admin.getUsers.invalidate()
      setWarnModal({ open: false, user: null })
      setWarnReason('')
    },
  })

  const suspendMutation = trpc.admin.suspendUser.useMutation({
    onSuccess: () => {
      utils.admin.getUsers.invalidate()
      setSuspendModal({ open: false, user: null })
      setSuspendDays('7')
      setSuspendReason('')
    },
  })

  const unsuspendMutation = trpc.admin.unsuspendUser.useMutation({
    onSuccess: () => {
      utils.admin.getUsers.invalidate()
    },
  })

  const banMutation = trpc.admin.banUser.useMutation({
    onSuccess: () => {
      utils.admin.getUsers.invalidate()
      setBanModal({ open: false, user: null })
      setBanReason('')
    },
  })

  const unbanMutation = trpc.admin.unbanUser.useMutation({
    onSuccess: () => {
      utils.admin.getUsers.invalidate()
    },
  })

  const resetWarningsMutation = trpc.admin.resetWarnings.useMutation({
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

  const handleWarn = () => {
    if (!warnModal.user || !warnReason.trim()) return
    warnMutation.mutate({
      adminUserId: userId!,
      targetUserId: warnModal.user.id,
      reason: warnReason.trim(),
    })
  }

  const handleSuspend = () => {
    if (!suspendModal.user || !suspendReason.trim()) return
    suspendMutation.mutate({
      adminUserId: userId!,
      targetUserId: suspendModal.user.id,
      days: parseInt(suspendDays),
      reason: suspendReason.trim(),
    })
  }

  const handleUnsuspend = (targetUserId: string) => {
    if (confirm('Are you sure you want to remove this user\'s suspension?')) {
      unsuspendMutation.mutate({
        adminUserId: userId!,
        targetUserId,
      })
    }
  }

  const handleBan = () => {
    if (!banModal.user || !banReason.trim()) return
    banMutation.mutate({
      adminUserId: userId!,
      targetUserId: banModal.user.id,
      reason: banReason.trim(),
    })
  }

  const handleUnban = (targetUserId: string) => {
    if (confirm('Are you sure you want to unban this user?')) {
      unbanMutation.mutate({
        adminUserId: userId!,
        targetUserId,
      })
    }
  }

  const handleResetWarnings = (targetUserId: string) => {
    if (confirm('Are you sure you want to reset this user\'s warnings? This will delete all warning records.')) {
      resetWarningsMutation.mutate({
        adminUserId: userId!,
        targetUserId,
      })
    }
  }

  const isAnyMutationPending = setAdminMutation.isPending || warnMutation.isPending ||
    suspendMutation.isPending || unsuspendMutation.isPending ||
    banMutation.isPending || unbanMutation.isPending || resetWarningsMutation.isPending

  const getUserStatusBadges = (user: any) => {
    const badges = []

    if (user.bannedAt) {
      badges.push(<Badge key="banned" variant="danger">Banned</Badge>)
    } else if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      badges.push(<Badge key="suspended" variant="warning">Suspended</Badge>)
    }

    if (user.warningCount > 0) {
      badges.push(
        <Badge key="warnings" variant="warning" className="cursor-pointer" onClick={() => handleResetWarnings(user.id)}>
          {user.warningCount} warning{user.warningCount !== 1 ? 's' : ''}
        </Badge>
      )
    }

    if (user.isAdmin) {
      badges.push(<Badge key="admin" variant="info">Admin</Badge>)
    }

    if (!user.emailVerified) {
      badges.push(<Badge key="unverified" variant="secondary">Unverified</Badge>)
    }

    return badges
  }

  const getActionButtons = (user: any) => {
    // Don't show moderation actions for admins (except toggle admin)
    if (user.isAdmin) {
      return (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
          disabled={isAnyMutationPending || user.id === userId}
        >
          Remove Admin
        </Button>
      )
    }

    // User is banned
    if (user.bannedAt) {
      return (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleUnban(user.id)}
          disabled={isAnyMutationPending}
        >
          Unban
        </Button>
      )
    }

    // User is suspended
    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      return (
        <Flex gap="sm">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleUnsuspend(user.id)}
            disabled={isAnyMutationPending}
          >
            Unsuspend
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setBanModal({ open: true, user })}
            disabled={isAnyMutationPending}
          >
            Ban
          </Button>
        </Flex>
      )
    }

    // Normal user - show all actions
    return (
      <Flex gap="sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
          disabled={isAnyMutationPending}
        >
          Make Admin
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setWarnModal({ open: true, user })}
          disabled={isAnyMutationPending}
        >
          Warn
        </Button>
        <Button
          variant="warning"
          size="sm"
          onClick={() => setSuspendModal({ open: true, user })}
          disabled={isAnyMutationPending}
        >
          Suspend
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setBanModal({ open: true, user })}
          disabled={isAnyMutationPending}
        >
          Ban
        </Button>
      </Flex>
    )
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
                        <Flex gap="sm" align="center" wrap="wrap">
                          <Text weight="semibold">{user.name}</Text>
                          {getUserStatusBadges(user)}
                        </Flex>
                        <Text variant="small" color="muted">{user.email}</Text>
                        <Text variant="small" color="muted">
                          {user._count.memberships} band{user._count.memberships !== 1 ? 's' : ''} · Joined {new Date(user.createdAt).toLocaleDateString()}
                          {user.bannedAt && (
                            <> · Banned: {user.banReason}</>
                          )}
                          {user.suspendedUntil && new Date(user.suspendedUntil) > new Date() && (
                            <> · Suspended until {new Date(user.suspendedUntil).toLocaleDateString()}: {user.suspensionReason}</>
                          )}
                        </Text>
                      </Stack>
                      {getActionButtons(user)}
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
                      Previous
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage(p => Math.min(usersData.pages, p + 1))}
                      disabled={page === usersData.pages}
                    >
                      Next
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

        {/* Warn Modal */}
        <Modal
          isOpen={warnModal.open}
          onClose={() => {
            setWarnModal({ open: false, user: null })
            setWarnReason('')
          }}
          title={`Warn ${warnModal.user?.name}`}
        >
          <Stack spacing="md">
            <Text>Enter reason for warning (required):</Text>
            <Textarea
              placeholder="Describe the violation or reason for this warning..."
              value={warnReason}
              onChange={(e) => setWarnReason(e.target.value)}
              rows={3}
            />
            <Text variant="small" color="muted">
              The user will receive an in-app notification and email with this reason.
              {warnModal.user?.warningCount > 0 && (
                <> This will be warning #{warnModal.user.warningCount + 1}.</>
              )}
            </Text>
            <Flex gap="sm" justify="end">
              <Button
                variant="ghost"
                onClick={() => {
                  setWarnModal({ open: false, user: null })
                  setWarnReason('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleWarn}
                disabled={warnMutation.isPending || !warnReason.trim()}
              >
                {warnMutation.isPending ? 'Sending...' : 'Issue Warning'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Suspend Modal */}
        <Modal
          isOpen={suspendModal.open}
          onClose={() => {
            setSuspendModal({ open: false, user: null })
            setSuspendDays('7')
            setSuspendReason('')
          }}
          title={`Suspend ${suspendModal.user?.name}`}
        >
          <Stack spacing="md">
            <div>
              <Text className="mb-2">Suspension duration:</Text>
              <Select
                value={suspendDays}
                onChange={(e) => setSuspendDays(e.target.value)}
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </Select>
            </div>
            <div>
              <Text className="mb-2">Reason for suspension (required):</Text>
              <Textarea
                placeholder="Describe the reason for this suspension..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
            </div>
            <Text variant="small" color="muted">
              The user will not be able to log in until the suspension ends. They will receive an email notification.
            </Text>
            <Flex gap="sm" justify="end">
              <Button
                variant="ghost"
                onClick={() => {
                  setSuspendModal({ open: false, user: null })
                  setSuspendDays('7')
                  setSuspendReason('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="warning"
                onClick={handleSuspend}
                disabled={suspendMutation.isPending || !suspendReason.trim()}
              >
                {suspendMutation.isPending ? 'Suspending...' : 'Suspend User'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Ban Modal */}
        <Modal
          isOpen={banModal.open}
          onClose={() => {
            setBanModal({ open: false, user: null })
            setBanReason('')
          }}
          title={`Ban ${banModal.user?.name}`}
        >
          <Stack spacing="md">
            <Text>Enter reason for ban (required):</Text>
            <Textarea
              placeholder="Describe the reason for this permanent ban..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              rows={3}
            />
            <Alert variant="danger">
              <Text variant="small">
                This will permanently ban the user. They will not be able to log in and will receive an email notification.
              </Text>
            </Alert>
            <Flex gap="sm" justify="end">
              <Button
                variant="ghost"
                onClick={() => {
                  setBanModal({ open: false, user: null })
                  setBanReason('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleBan}
                disabled={banMutation.isPending || !banReason.trim()}
              >
                {banMutation.isPending ? 'Banning...' : 'Ban User'}
              </Button>
            </Flex>
          </Stack>
        </Modal>
      </AdminLayout>
    </>
  )
}
