'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Card,
  PageLayout,
  Container,
  Heading,
  Text,
  Button,
  useToast,
  Stack,
  Center,
  Progress,
  Loading,
  Alert,
  IconCircle,
  CheckIcon,
  EmailIcon,
  List,
  ListItem
} from '@/components/ui'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const token = searchParams.get('token')
  const [email, setEmail] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [verifying, setVerifying] = useState(false)
  const hasVerified = useRef(false)

  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail') || ''
    setEmail(storedEmail)

    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      try {
        const decoded: any = jwtDecode(accessToken)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
      }
    }
  }, [])

  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setVerifying(false)
      if (!hasVerified.current) {
        hasVerified.current = true
        showToast('Email verified successfully!', 'success')
        setTimeout(() => {
          router.push('/profile')
        }, 2000)
      }
    },
    onError: (error) => {
      setVerifying(false)
      showToast(error.message, 'error')
    },
  })

  const resendMutation = trpc.auth.resendVerification.useMutation({
    onSuccess: () => {
      showToast('Verification email sent! Check your inbox.', 'success')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  useEffect(() => {
    if (token && !verifying && !hasVerified.current) {
      setVerifying(true)
      verifyEmailMutation.mutate({ token })
    }
  }, [token])

  const handleResend = () => {
    if (userId) {
      resendMutation.mutate({ userId })
    }
  }

  if (token) {
    return (
      <PageLayout>
        <Container size="sm">
          <Card>
            {verifying && !verifyEmailMutation.isError ? (
              <Loading message="Verifying Email..." />
            ) : verifyEmailMutation.isSuccess ? (
              <Center>
                <Stack spacing="lg">
                  <IconCircle variant="success" size="md">
                    <CheckIcon />
                  </IconCircle>
                  <Heading level={1}>Email Verified! ✅</Heading>
                  <Text variant="muted">Redirecting to profile completion...</Text>
                </Stack>
              </Center>
            ) : null}
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
              <IconCircle variant="primary" size="md">
                <EmailIcon />
              </IconCircle>
              <Heading level={1}>Check Your Email</Heading>
              <Text variant="muted">We've sent a verification link to</Text>
              <Text weight="semibold">{email}</Text>
            </Center>

            <Progress
              steps={[
                { label: 'Register', status: 'complete' },
                { label: 'Verify', status: 'active' },
                { label: 'Profile', status: 'inactive' },
              ]}
            />

            <Alert variant="info">
              <Text variant="small" weight="semibold">Next steps:</Text>
              <List ordered>
                <ListItem>Open your email inbox</ListItem>
                <ListItem>Click the verification link</ListItem>
                <ListItem>Complete your profile</ListItem>
              </List>
            </Alert>

            <Center>
              <Text variant="small">Didn't receive the email?</Text>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={resendMutation.isPending}
              >
                {resendMutation.isPending ? 'Sending...' : 'Resend verification email'}
              </Button>
            </Center>

            <Alert variant="warning">
              <Text variant="small" color="warning" weight="bold">Development Mode:</Text>
              <Text variant="small" color="warning"> Check your terminal/console for the verification link.</Text>
            </Alert>
          </Stack>
        </Card>
      </Container>
    </PageLayout>
  )
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  )
}
