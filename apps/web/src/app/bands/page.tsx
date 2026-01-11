'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import {
  Heading,
  Text,
  Stack,
  Button,
  PageWrapper,
  TopNav,
  DashboardContainer,
  Flex,
  Card,
  Badge,
  Loading,
  Input
} from '@/components/ui'
import Image from 'next/image'

export default function BrowseBandsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  const { data: bandsData, isLoading } = trpc.band.getAll.useQuery()

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

  const filteredBands = bandsData?.bands.filter((band: any) => {
    const search = searchTerm.toLowerCase()
    return (
      band.name.toLowerCase().includes(search) ||
      band.description.toLowerCase().includes(search) ||
      band.values.some((v: string) => v.toLowerCase().includes(search))
    )
  })

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
            <Flex gap="md">
              <Button variant="ghost" size="sm" onClick={() => router.push('/bands/my-bands')}>
                My Bands
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/user-dashboard')}>
                Dashboard
              </Button>
            </Flex>
          </Flex>
        </TopNav>
        <DashboardContainer>
          <Loading message="Loading bands..." />
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
          <Flex gap="md">
            <Button variant="secondary" size="sm" onClick={() => router.push('/bands/my-bands')}>
              My Bands
            </Button>
            <Button variant="primary" size="sm" onClick={() => router.push('/bands/create')}>
              Create Band
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/user-dashboard')}>
              Dashboard
            </Button>
          </Flex>
        </Flex>
      </TopNav>

      <DashboardContainer>
        <Stack spacing="xl">
          <Heading level={1}>Discover Bands</Heading>

          <Input
            label="Search Bands"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, description, or values..."
          />

          {filteredBands && filteredBands.length > 0 ? (
            <Stack spacing="md">
              {filteredBands.map((band: any) => (
                <Card key={band.id} hover>
                  <Stack spacing="md">
                    <Flex justify="between">
                      <Heading level={2}>{band.name}</Heading>
                      {getStatusBadge(band.status)}
                    </Flex>
                    <Text variant="muted">{band.description}</Text>
                    <Flex justify="between">
                      <Text variant="small">
                        Founded by: <Text variant="small" weight="semibold">{band.createdBy.name}</Text>
                      </Text>
                      <Text variant="small">
                        Members: <Text variant="small" weight="semibold">{band._count?.members || 0}</Text>
                      </Text>
                    </Flex>
                    <Flex gap="sm">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/bands/${band.slug}`)}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => router.push(`/bands/${band.slug}/apply`)}
                      >
                        Apply to Join
                      </Button>
                    </Flex>
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : (
            <Card>
              <Text>No bands found matching your search.</Text>
            </Card>
          )}
        </Stack>
      </DashboardContainer>
    </PageWrapper>
  )
}