'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
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
  Alert
} from '@/components/ui'

export default function ForgotPasswordPage() {
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const resetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setSubmitted(true)
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    resetMutation.mutate({ email })
  }

  if (submitted) {
    return (
      <PageLayout>
        <Container size="sm">
          <Card>
            <Stack spacing="lg">
              <Center>
                <Heading level={1}>Check Your Email</Heading>
              </Center>

              <Alert variant="success">
                <Text variant="small">
                  If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
                </Text>
              </Alert>

              <Text className="text-center">
                The link will expire in 1 hour. Check your spam folder if you don't see the email.
              </Text>

              <Center>
                <Link href="/login">Back to Sign In</Link>
              </Center>
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
              <Heading level={1}>Forgot Password</Heading>
              <Text variant="muted">Enter your email to receive a reset link</Text>
            </Center>

            <form onSubmit={handleSubmit}>
              <Stack spacing="lg">
                <Input
                  label="Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={resetMutation.isPending}
                  className="w-full"
                >
                  {resetMutation.isPending ? 'Sending...' : 'Send Reset Link'}
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
