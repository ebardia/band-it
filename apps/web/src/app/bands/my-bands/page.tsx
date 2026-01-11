'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Button,
  useToast,
  PageWrapper,
  TopNav,
  DashboardContainer,
  Flex,
  Card,
  Badge,
  Loading
} from '@/components/ui'
import Image from 'next/image'

export default function MyBandsPage() {
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
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const { data: myBandsData, isLoading } = trpc.band.getMyBands.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>
      case 'INACTIVE':
        return <Badge variant="neutral">Inactive</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <PageWrapper variant="dashboard">
        <TopNav>
          <Flex justify="between">
            <Image 
              src="/logo.png" 
              alt="Band IT Logo" 
              width={200} 
              height={200}
              priority
            />
            <Button variant="ghost" size="sm" onClick={() => router.push('/user-dashboard')}>
              Back to Dashboard
            </Button>
          </Flex>
        </TopNav>
        <DashboardContainer>
          <Loading message="Loading your bands..." />
        </DashboardContainer>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper variant="dashboard">
      <TopNav>
        <Flex justify="between">
          <Image 
            src="/logo.png" 
            alt="Band IT Logo" 
            width={200} 
            height={200}
            priority
          />
          <Button variant="ghost" size="sm" onClick={() => router.push('/user-dashboard')}>
            Back to Dashboard
          </Button>
        </Flex>
      </TopNav>

      <DashboardContainer>
        <Stack spacing="xl">
          <Flex justify="between">
            <Heading level={1}>My Bands</Heading>
            <Button variant="primary" size="md" onClick={() => router.push('/bands/create')}>
              Create New Band
            </Button>
          </Flex>

          {myBandsData?.bands && myBandsData.bands.length > 0 ? (
            <Stack spacing="md">
              {myBandsData.bands.map((band: any) => (
                <Card key={band.id} hover>
                  <Stack spacing="md">
                    <Flex justify="between">
                      <Heading level={2}>{band.name}</Heading>
                      {getStatusBadge(band.status)}
                    </Flex>
                    <Text variant="muted">{band.description}</Text>
                    <Flex justify="between">
                      <Text variant="small">
                        Role: <Text variant="small" weight="semibold">{band.myRole.replace('_', ' ')}</Text>
                      </Text>
                      <Text variant="small">
                        Members: <Text variant="small" weight="semibold">{band._count?.members || 0}</Text>
                      </Text>
                    </Flex>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/bands/${band.slug}`)}
                    >
                      View Band
                    </Button>
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : (
            <Card>
              <Stack spacing="md">
                <Text>You're not a member of any bands yet.</Text>
                <Button variant="primary" size="md" onClick={() => router.push('/bands/create')}>
                  Create Your First Band
                </Button>
              </Stack>
            </Card>
          )}
        </Stack>
      </DashboardContainer>
    </PageWrapper>
  )
}