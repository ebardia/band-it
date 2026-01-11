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
  Flex
} from '@/components/ui'

export default function SettingsPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  const [deletePassword, setDeletePassword] = useState('')

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

  return (
    <UserDashboardLayout>
      <Stack spacing="xl">
        <Heading level={1}>Settings</Heading>
        <Text variant="muted">Manage your account settings</Text>

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