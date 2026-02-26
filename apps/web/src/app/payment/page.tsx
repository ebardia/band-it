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
  useToast,
  Stack,
  Center,
  Progress,
  Alert,
  List,
  ListItem,
  Spacer
} from '@/components/ui'

export default function PaymentPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)

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

  const createCheckoutMutation = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handlePayment = () => {
    if (!userId) {
      showToast('User not found. Please register again.', 'error')
      router.push('/register')
      return
    }

    createCheckoutMutation.mutate({ userId })
  }

  return (
    <PageLayout>
      <Container size="sm">
        <Card>
          <Stack spacing="lg">
            <Center>
              <Heading level={1}>Subscribe to BAND IT</Heading>
              <Text variant="muted">Complete your registration with a monthly membership</Text>
            </Center>

            <Progress
              steps={[
                { label: 'Register', status: 'complete' },
                { label: 'Verify', status: 'complete' },
                { label: 'Profile', status: 'complete' },
                { label: 'Payment', status: 'active' },
              ]}
            />

            <Alert variant="info">
              <Center>
                <Heading level={2}>$5</Heading>
                <Text variant="small" weight="semibold">/month</Text>
                <Spacer size="sm" />
                <Text variant="muted">BAND IT Membership</Text>
                <Spacer size="md" />
                
                <List>
                  <ListItem>Create and join unlimited bands</ListItem>
                  <ListItem>Participate in band governance</ListItem>
                  <ListItem>Task management and tracking</ListItem>
                  <ListItem>Proposal voting system</ListItem>
                  <ListItem>Community support</ListItem>
                </List>
              </Center>
            </Alert>

            <Button
              variant="primary"
              size="lg"
              onClick={handlePayment}
              disabled={createCheckoutMutation.isPending || !userId}
              className="w-full"
            >
              {createCheckoutMutation.isPending ? 'Loading...' : 'Subscribe Now'}
            </Button>

            <Center>
              <Text variant="small" color="muted">🔒 Secure payment powered by Stripe</Text>
              <Text variant="small" color="muted">Cancel anytime</Text>
            </Center>

            <Center>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
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