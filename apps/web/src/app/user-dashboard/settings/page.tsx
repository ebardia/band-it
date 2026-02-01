'use client'

import { useState, useEffect } from 'react'
import { UserDashboardLayout } from '@/components/UserDashboardLayout'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import { useRouter } from 'next/navigation'
import {
  Heading,
  Text,
  Stack,
  Input,
  Button,
  useToast,
  Alert,
  Modal,
  Flex,
  Card,
  Select
} from '@/components/ui'

export default function SettingsPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const utils = trpc.useUtils()

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [deletePassword, setDeletePassword] = useState('')

  // Digest preferences state
  const [digestFrequency, setDigestFrequency] = useState<string>('DAILY')
  const [digestWeeklyDay, setDigestWeeklyDay] = useState<number>(1) // Monday

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
      }
    }
  }, [])

  // Get user warnings
  const { data: warningsData } = trpc.auth.getMyWarnings.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const unacknowledgedWarnings = warningsData?.warnings.filter(w => !w.acknowledged) || []

  // Get digest preferences
  const { data: digestData } = trpc.digest.getPreferences.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  // Initialize digest preferences when data loads
  useEffect(() => {
    if (digestData) {
      setDigestFrequency(digestData.frequency)
      if (digestData.weeklyDay !== null) {
        setDigestWeeklyDay(digestData.weeklyDay)
      }
    }
  }, [digestData])

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      showToast('Password changed successfully!', 'success')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      showToast('Account deleted successfully', 'success')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('userEmail')
      setTimeout(() => {
        router.push('/')
      }, 1000)
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const acknowledgeAllMutation = trpc.auth.acknowledgeAllWarnings.useMutation({
    onSuccess: () => {
      utils.auth.getMyWarnings.invalidate()
      showToast('Warnings acknowledged', 'success')
    },
  })

  const updateDigestMutation = trpc.digest.updatePreferences.useMutation({
    onSuccess: () => {
      showToast('Digest preferences updated!', 'success')
      utils.digest.getPreferences.invalidate()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      showToast('User not found', 'error')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match', 'error')
      return
    }

    changePasswordMutation.mutate({
      userId,
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    })
  }

  const handleDeleteAccount = () => {
    if (!userId) {
      showToast('User not found', 'error')
      return
    }

    deleteAccountMutation.mutate({
      userId,
      password: deletePassword,
    })
  }

  const handleAcknowledgeAll = () => {
    if (!userId) return
    acknowledgeAllMutation.mutate({ userId })
  }

  const handleSaveDigestPreferences = () => {
    if (!userId) return
    updateDigestMutation.mutate({
      userId,
      frequency: digestFrequency as 'DAILY' | 'EVERY_OTHER_DAY' | 'WEEKLY' | 'NEVER',
      weeklyDay: digestFrequency === 'WEEKLY' ? digestWeeklyDay : undefined,
    })
  }

  return (
    <UserDashboardLayout>
      <Stack spacing="xl">
        <Heading level={1}>Settings</Heading>
        <Text variant="muted">Manage your account settings</Text>

        {/* Warning Banner */}
        {unacknowledgedWarnings.length > 0 && (
          <Alert variant="warning">
            <Stack spacing="md">
              <Flex justify="between" align="start">
                <div>
                  <Text weight="semibold" className="mb-2">
                    You have {unacknowledgedWarnings.length} unacknowledged warning{unacknowledgedWarnings.length !== 1 ? 's' : ''}
                  </Text>
                  <Text variant="small">
                    Please review the warnings below. Continued violations may result in account suspension or ban.
                  </Text>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAcknowledgeAll}
                  disabled={acknowledgeAllMutation.isPending}
                >
                  {acknowledgeAllMutation.isPending ? 'Acknowledging...' : 'Acknowledge All'}
                </Button>
              </Flex>
              <Stack spacing="sm">
                {unacknowledgedWarnings.map((warning) => (
                  <Card key={warning.id} className="bg-yellow-50 border-yellow-200">
                    <Stack spacing="xs">
                      <Text variant="small" color="muted">
                        {new Date(warning.createdAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                      <Text>{warning.reason}</Text>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Stack>
          </Alert>
        )}

        {/* Warning History */}
        {warningsData && warningsData.warnings.length > 0 && (
          <Stack spacing="lg">
            <Heading level={2}>Warning History</Heading>
            <Text variant="small" color="muted">
              You have received {warningsData.warnings.length} warning{warningsData.warnings.length !== 1 ? 's' : ''} on your account.
            </Text>
            <Stack spacing="sm">
              {warningsData.warnings.map((warning) => (
                <Card key={warning.id}>
                  <Flex justify="between" align="start">
                    <Stack spacing="xs">
                      <Text variant="small" color="muted">
                        {new Date(warning.createdAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                      <Text>{warning.reason}</Text>
                    </Stack>
                    {warning.acknowledged ? (
                      <Text variant="small" color="muted">Acknowledged</Text>
                    ) : (
                      <Text variant="small" className="text-yellow-600 font-semibold">Unacknowledged</Text>
                    )}
                  </Flex>
                </Card>
              ))}
            </Stack>
          </Stack>
        )}

        {/* Email Notifications Section */}
        <Stack spacing="lg">
          <Heading level={2}>Email Notifications</Heading>
          <Card>
            <Stack spacing="md">
              <Text weight="semibold">Quick Actions Digest</Text>
              <Text variant="small" color="muted">
                How often would you like reminders about pending actions?
              </Text>

              <Stack spacing="sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="digestFrequency"
                    value="DAILY"
                    checked={digestFrequency === 'DAILY'}
                    onChange={(e) => setDigestFrequency(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Daily</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="digestFrequency"
                    value="EVERY_OTHER_DAY"
                    checked={digestFrequency === 'EVERY_OTHER_DAY'}
                    onChange={(e) => setDigestFrequency(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Every other day</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="digestFrequency"
                    value="WEEKLY"
                    checked={digestFrequency === 'WEEKLY'}
                    onChange={(e) => setDigestFrequency(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Weekly</span>
                </label>

                {digestFrequency === 'WEEKLY' && (
                  <div className="ml-6">
                    <Select
                      label="On"
                      value={digestWeeklyDay.toString()}
                      onChange={(e) => setDigestWeeklyDay(parseInt(e.target.value))}
                    >
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </Select>
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="digestFrequency"
                    value="NEVER"
                    checked={digestFrequency === 'NEVER'}
                    onChange={(e) => setDigestFrequency(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Never</span>
                </label>
              </Stack>

              <Button
                variant="primary"
                size="md"
                onClick={handleSaveDigestPreferences}
                disabled={updateDigestMutation.isPending}
              >
                {updateDigestMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </Button>
            </Stack>
          </Card>
        </Stack>

        {/* Change Password Section */}
        <Stack spacing="lg">
          <Heading level={2}>Change Password</Heading>
          <form onSubmit={handlePasswordSubmit}>
            <Stack spacing="lg">
              <Input
                label="Current Password"
                type="password"
                required
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Enter current password"
              />

              <Input
                label="New Password"
                type="password"
                required
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Enter new password"
                minLength={8}
                helperText="Must be at least 8 characters"
              />

              <Input
                label="Confirm New Password"
                type="password"
                required
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                minLength={8}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? 'Changing Password...' : 'Change Password'}
              </Button>
            </Stack>
          </form>
        </Stack>

        {/* Delete Account Section */}
        <Stack spacing="lg">
          <Heading level={2}>Delete Account</Heading>
          <Alert variant="danger">
            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Danger Zone</Text>
              <Text variant="small">
                Once you delete your account, there is no going back. This action cannot be undone.
              </Text>
            </Stack>
          </Alert>
          <Button
            variant="danger"
            size="md"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete My Account
          </Button>
        </Stack>
      </Stack>

      {/* Delete Account Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <Stack spacing="lg">
          <Heading level={2}>Delete Account?</Heading>
          <Alert variant="danger">
            <Text variant="small" weight="bold">This action cannot be undone!</Text>
            <Text variant="small">All your data, including bands, proposals, and tasks will be permanently deleted.</Text>
          </Alert>
          <Input
            label="Enter your password to confirm"
            type="password"
            required
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Your password"
          />
          <Flex gap="md" justify="end">
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                setShowDeleteModal(false)
                setDeletePassword('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleDeleteAccount}
              disabled={deleteAccountMutation.isPending || !deletePassword}
            >
              {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </UserDashboardLayout>
  )
}
