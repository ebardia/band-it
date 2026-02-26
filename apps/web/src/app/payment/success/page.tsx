'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import {
  Card,
  PageLayout,
  Container,
  Heading,
  Text,
  useToast,
  Stack,
  Center,
  Progress,
  Loading,
  Alert,
  IconCircle,
  CheckIcon,
  List,
  ListItem
} from '@/components/ui'

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const sessionId = searchParams.get('session_id')
  const [verifying, setVerifying] = useState(true)
  const hasVerified = useRef(false)

  const verifyPaymentMutation = trpc.payment.verifyPayment.useMutation({
    onSuccess: (data) => {
      setVerifying(false)
      if (data.success && !hasVerified.current) {
        hasVerified.current = true
        showToast('Payment successful! Welcome to BAND IT!', 'success')
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    },
    onError: (error) => {
      console.error('Verification error:', error)
      setVerifying(false)
      showToast('Payment verification failed', 'error')
    },
  })

  useEffect(() => {
    if (sessionId && !hasVerified.current) {
      verifyPaymentMutation.mutate({ sessionId })
    } else {
      setVerifying(false)
    }
  }, [sessionId])

  return (
    <PageLayout>
      <Container size="sm">
        <Card>
          {verifying ? (
            <Loading message="Verifying Payment..." />
          ) : (
            <Center>
              <Stack spacing="lg">
                <IconCircle variant="success" size="lg">
                  <CheckIcon />
                </IconCircle>

                <Heading level={1}>Welcome to BAND IT! 🎉</Heading>

                <Text variant="muted">Your registration is complete!</Text>

                <Progress
                  steps={[
                    { label: 'Register', status: 'complete' },
                    { label: 'Verify', status: 'complete' },
                    { label: 'Profile', status: 'complete' },
                    { label: 'Payment', status: 'complete' },
                  ]}
                />

                <Alert variant="success">
                  <List>
                    <ListItem>✅ Account created</ListItem>
                    <ListItem>✅ Email verified</ListItem>
                    <ListItem>✅ Profile completed</ListItem>
                    <ListItem>✅ Subscription active ($5/month)</ListItem>
                  </List>
                </Alert>

                <Text variant="small" color="muted">
                  Redirecting to homepage in 3 seconds...
                </Text>
              </Stack>
            </Center>
          )}
        </Card>
      </Container>
    </PageLayout>
  )
}

export default function PaymentSuccessPage() {
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
      <PaymentSuccessContent />
    </Suspense>
  )
}
