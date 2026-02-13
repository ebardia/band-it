'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Card,
  PageLayout,
  Container,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  useToast,
  Stack,
  Center,
  Progress
} from '@/components/ui'

export default function ProfilePage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
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
        router.push('/register')
      }
    } else {
      router.push('/register')
    }
  }, [router])

  // Fetch user profile to check subscription status
  const { data: profileData } = trpc.auth.getProfile.useQuery(
    { userId: userId || '' },
    { enabled: !!userId }
  )

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      showToast('Profile saved successfully!', 'success')
      // Registration is free - go directly to dashboard
      router.push('/user-dashboard')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userId) {
      showToast('User not found. Please register again.', 'error')
      router.push('/register')
      return
    }

    updateProfileMutation.mutate({
      userId,
      ...formData,
    })
  }

  return (
    <PageLayout>
      <Container size="md">
        <Card>
          <Stack spacing="lg">
            <Center>
              <Heading level={1}>Complete Your Profile</Heading>
              <Text variant="muted">Tell us about yourself so we can help you grow</Text>
            </Center>

            <Progress
              steps={[
                { label: 'Register', status: 'complete' },
                { label: 'Verify', status: 'complete' },
                { label: 'Profile', status: 'active' },
              ]}
            />

            <form onSubmit={handleSubmit}>
              <Stack spacing="lg">
                <Input
                  label="Postal Code"
                  type="text"
                  required
                  value={formData.zipcode}
                  onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                  placeholder="e.g. 12345, SW1A 1AA"
                  maxLength={10}
                />

                <Textarea
                  label="Your Strengths"
                  required
                  value={formData.strengths}
                  onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                  placeholder="Example: Leadership, communication, guitar playing, event planning..."
                  rows={3}
                  helperText="Separate with commas"
                />

                <Textarea
                  label="Areas for Improvement"
                  required
                  value={formData.weaknesses}
                  onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                  placeholder="Example: Time management, public speaking, music theory..."
                  rows={3}
                  helperText="Separate with commas"
                />

                <Textarea
                  label="Your Passions"
                  required
                  value={formData.passions}
                  onChange={(e) => setFormData({ ...formData, passions: e.target.value })}
                  placeholder="Example: Rock music, community building, teaching, performing..."
                  rows={3}
                  helperText="Separate with commas"
                />

                <Textarea
                  label="What Do You Want to Learn?"
                  required
                  value={formData.developmentPath}
                  onChange={(e) => setFormData({ ...formData, developmentPath: e.target.value })}
                  placeholder="Example: Advanced guitar techniques, band management, marketing, fundraising..."
                  rows={3}
                  helperText="Separate with commas"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={updateProfileMutation.isPending || !userId}
                  className="w-full"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save & Continue'}
                </Button>
              </Stack>
            </form>

            <Center>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/user-dashboard')}
              >
                Skip for now
              </Button>
            </Center>
          </Stack>
        </Card>
      </Container>
    </PageLayout>
  )
}