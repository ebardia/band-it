'use client'

import { useState, useEffect, Suspense } from 'react'
import { trpc } from '@/lib/trpc'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Button,
  Input,
  Card,
  PageLayout,
  Container,
  Heading,
  Text,
  useToast,
  Stack,
  Center,
  Link,
  Progress,
  Alert,
  Loading
} from '@/components/ui'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const inviteToken = searchParams.get('invite')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('userEmail', formData.email)

      // Show bands joined message if any
      if (data.bandsJoined && data.bandsJoined.length > 0) {
        const bandNames = data.bandsJoined.map((b: { name: string }) => b.name).join(', ')
        showToast(`Welcome! You've automatically joined: ${bandNames}`, 'success')
      }

      // Check if email is already verified (SKIP_EMAIL_VERIFICATION mode)
      if (data.user.emailVerified) {
        if (!data.bandsJoined || data.bandsJoined.length === 0) {
          showToast('Account created successfully!', 'success')
        }
        router.push('/profile') // Skip email verification, go to profile
      } else {
        if (!data.bandsJoined || data.bandsJoined.length === 0) {
          showToast('Account created! Please check your email.', 'success')
        }
        router.push('/verify-email')
      }
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    registerMutation.mutate({
      ...formData,
      inviteToken: inviteToken || undefined,
    })
  }

  return (
    <PageLayout>
      <Container size="sm">
        <Card>
          <Stack spacing="lg">
            <Center>
              <Heading level={1}>Create Account</Heading>
              <Text variant="muted">Join Band IT to start managing your band</Text>
            </Center>

            {inviteToken && (
              <Alert variant="info">
                <Text variant="small">
                  You've been invited to join a band! Create your account to accept the invitation and join automatically.
                </Text>
              </Alert>
            )}

            <Progress
              steps={[
                { label: 'Register', status: 'active' },
                { label: 'Verify', status: 'inactive' },
                { label: 'Profile', status: 'inactive' },
                { label: 'Payment', status: 'inactive' },
              ]}
            />

            <form onSubmit={handleSubmit}>
              <Stack spacing="lg">
                <Input
                  label="Full Name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />

                <Input
                  label="Email Address"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />

                <Input
                  label="Password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 8 characters"
                  minLength={8}
                  helperText="Must be at least 8 characters"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={registerMutation.isPending}
                  className="w-full"
                >
                  {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
                </Button>
              </Stack>
            </form>

            <Center>
              <Text variant="small">
                Already have an account? <Link href="/login">Sign in</Link>
              </Text>
            </Center>
          </Stack>
        </Card>
      </Container>
    </PageLayout>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <PageLayout>
        <Container size="sm">
          <Card>
            <Loading message="Loading..." />
          </Card>
        </Container>
      </PageLayout>
    }>
      <RegisterContent />
    </Suspense>
  )
}