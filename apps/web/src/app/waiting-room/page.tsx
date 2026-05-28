'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import {
  Alert,
  Button,
  Card,
  Center,
  Container,
  Heading,
  Loading,
  PageLayout,
  Stack,
  Text,
} from '@/components/ui'

export default function WaitingRoomPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [checkedToken, setCheckedToken] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.replace('/login')
      return
    }
    try {
      const decoded = jwtDecode<{ userId: string }>(token)
      setUserId(decoded.userId)
    } catch {
      router.replace('/login')
      return
    }
    setCheckedToken(true)
  }, [router])

  const { data: access } = trpc.auth.getAccessStatus.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  // Approved users (or admins) don't belong here — send them to their Daily.
  useEffect(() => {
    if (access?.hasAccess) {
      router.replace('/daily')
    }
  }, [access, router])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userEmail')
    router.push('/')
  }

  if (!checkedToken || !access) {
    return (
      <PageLayout>
        <Container size="sm">
          <Card>
            <Loading message="Checking your spot in line…" />
          </Card>
        </Container>
      </PageLayout>
    )
  }

  if (access.hasAccess) {
    return (
      <PageLayout>
        <Container size="sm">
          <Card>
            <Loading message="You're in — taking you to your Daily…" />
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
              <Heading level={1}>You&apos;re on the list</Heading>
              <Text variant="muted">Thanks for signing up to Band It.</Text>
            </Center>

            <Stack spacing="md">
              <Text>
                Your spot is saved. We&apos;re still building Band It — so for now, registering puts
                you on the waiting list. When we&apos;re ready for you, we&apos;ll email you an
                invite and open the doors.
              </Text>

              <Alert variant="info">
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold">
                    Why the wait?
                  </Text>
                  <Text variant="small">
                    Two honest reasons. First, we&apos;re actively redoing parts of the site and want
                    your first real visit to be a good one. Second — full transparency — we&apos;re
                    letting people in gradually. It&apos;s partly so nothing breaks under a crowd, and
                    partly because &ldquo;limited early access&rdquo; sounds far more exciting than
                    &ldquo;please come in, it&apos;s very empty.&rdquo;
                  </Text>
                  <Text variant="small">
                    We&apos;ll be in touch soon. We know — the wait is killing you. It&apos;s a little
                    killing us too.
                  </Text>
                </Stack>
              </Alert>

              <Text variant="small" color="muted">
                Nothing else to do here for now. Hang tight, and watch your inbox for your invite.
              </Text>
            </Stack>

            <Center>
              <Button variant="secondary" size="md" onClick={handleLogout}>
                Log out
              </Button>
            </Center>
          </Stack>
        </Card>
      </Container>
    </PageLayout>
  )
}
