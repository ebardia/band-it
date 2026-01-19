'use client'

import { useState, Suspense } from 'react'
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
  Alert,
  Loading
} from '@/components/ui'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true)
      showToast('Password reset successfully!', 'success')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }

    if (!token) {
      showToast('Invalid reset link', 'error')
      return
    }

    resetMutation.mutate({ token, newPassword: password })
  }

  if (!token) {
    return (
      <PageLayout>
        <Container size="sm">
          <Card>
            <Stack spacing="lg">
              <Center>
                <Heading level={1}>Invalid Link</Heading>
              </Center>

              <Alert variant="danger">
                <Text variant="small">
                  This password reset link is invalid or has expired.
                </Text>
              </Alert>

              <Center>
                <Link href="/forgot-password">Request a new reset link</Link>
              </Center>
            </Stack>
          </Card>
        </Container>
      </PageLayout>
    )
  }

  if (success) {
    return (
      <PageLayout>
        <Container size="sm">
          <Card>
            <Stack spacing="lg">
              <Center>
                <Heading level={1}>Password Reset</Heading>
              </Center>

              <Alert variant="success">
                <Text variant="small">
                  Your password has been reset successfully.
                </Text>
              </Alert>

              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                Sign In
              </Button>
            </Stack>
          </Card>
        </Container>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Container size="sm">
        <Card>
          <Stack spacing="lg">
            <Center>
              <Heading level={1}>Reset Password</Heading>
              <Text variant="muted">Enter your new password</Text>
            </Center>

            <form onSubmit={handleSubmit}>
              <Stack spacing="lg">
                <div className="relative">
                  <Input
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>

                <Input
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  minLength={8}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={resetMutation.isPending}
                  className="w-full"
                >
                  {resetMutation.isPending ? 'Resetting...' : 'Reset Password'}
                </Button>
              </Stack>
            </form>

            <Center>
              <Text variant="small">
                Remember your password? <Link href="/login">Sign in</Link>
              </Text>
            </Center>
          </Stack>
        </Card>
      </Container>
    </PageLayout>
  )
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  )
}
