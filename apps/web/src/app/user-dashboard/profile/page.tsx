'use client'

import { useState, useEffect } from 'react'
import { UserDashboardLayout } from '@/components/UserDashboardLayout'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Input,
  Textarea,
  Button,
  useToast,
  Alert,
  Loading
} from '@/components/ui'

export default function ProfilePage() {
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    zipcode: '',
    strengths: '',
    weaknesses: '',
    passions: '',
    developmentPath: '',
  })

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

  const { data: profileData, isLoading } = trpc.auth.getProfile.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      showToast('Profile updated successfully!', 'success')
      setIsEditing(false)
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  useEffect(() => {
    if (profileData?.user) {
      setFormData({
        zipcode: profileData.user.zipcode || '',
        strengths: profileData.user.strengths?.join(', ') || '',
        weaknesses: profileData.user.weaknesses?.join(', ') || '',
        passions: profileData.user.passions?.join(', ') || '',
        developmentPath: profileData.user.developmentPath?.join(', ') || '',
      })
    }
  }, [profileData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    updateProfileMutation.mutate({
      userId,
      ...formData,
    })
  }

  const handleCancel = () => {
    if (profileData?.user) {
      setFormData({
        zipcode: profileData.user.zipcode || '',
        strengths: profileData.user.strengths?.join(', ') || '',
        weaknesses: profileData.user.weaknesses?.join(', ') || '',
        passions: profileData.user.passions?.join(', ') || '',
        developmentPath: profileData.user.developmentPath?.join(', ') || '',
      })
    }
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <UserDashboardLayout>
        <Loading message="Loading profile..." />
      </UserDashboardLayout>
    )
  }

  return (
    <UserDashboardLayout>
      <Stack spacing="lg">
        <Heading level={1}>My Profile</Heading>
        <Text variant="muted">View and manage your profile information</Text>

        <Alert variant="info">
          <Stack spacing="sm">
            <Text variant="small" weight="semibold">Account Information</Text>
            <Text variant="small">Name: {profileData?.user.name}</Text>
            <Text variant="small">Email: {profileData?.user.email}</Text>
            <Text variant="small">Member since: {new Date(profileData?.user.createdAt || '').toLocaleDateString()}</Text>
          </Stack>
        </Alert>

        <form onSubmit={handleSubmit}>
          <Stack spacing="lg">
            <Input
              label="Zipcode"
              type="text"
              required
              value={formData.zipcode}
              onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
              disabled={!isEditing}
              maxLength={5}
              pattern="[0-9]{5}"
            />

            <Textarea
              label="Your Strengths"
              required
              value={formData.strengths}
              onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
              disabled={!isEditing}
              rows={3}
              helperText="Separate with commas"
            />

            <Textarea
              label="Areas for Improvement"
              required
              value={formData.weaknesses}
              onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
              disabled={!isEditing}
              rows={3}
              helperText="Separate with commas"
            />

            <Textarea
              label="Your Passions"
              required
              value={formData.passions}
              onChange={(e) => setFormData({ ...formData, passions: e.target.value })}
              disabled={!isEditing}
              rows={3}
              helperText="Separate with commas"
            />

            <Textarea
              label="What Do You Want to Learn?"
              required
              value={formData.developmentPath}
              onChange={(e) => setFormData({ ...formData, developmentPath: e.target.value })}
              disabled={!isEditing}
              rows={3}
              helperText="Separate with commas"
            />

            {isEditing ? (
              <Stack spacing="md">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </Stack>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </Stack>
        </form>
      </Stack>
    </UserDashboardLayout>
  )
}