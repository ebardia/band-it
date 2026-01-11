'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  Loading,
  Alert,
  List,
  ListItem
} from '@/components/ui'
import Image from 'next/image'

export default function BandDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
      }
    }
  }, [])

  const { data: bandData, isLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
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
            <Button variant="ghost" size="sm" onClick={() => router.push('/bands/my-bands')}>
              Back to My Bands
            </Button>
          </Flex>
        </TopNav>
        <DashboardContainer>
          <Loading message="Loading band..." />
        </DashboardContainer>
      </PageWrapper>
    )
  }

  if (!bandData?.band) {
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
            <Button variant="ghost" size="sm" onClick={() => router.push('/bands/my-bands')}>
              Back to My Bands
            </Button>
          </Flex>
        </TopNav>
        <DashboardContainer>
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </DashboardContainer>
      </PageWrapper>
    )
  }

  const band = bandData.band

  // Check if current user is a member and has permission to approve
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)

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
          <Button variant="ghost" size="sm" onClick={() => router.push('/bands/my-bands')}>
            Back to My Bands
          </Button>
        </Flex>
      </TopNav>

      <DashboardContainer>
        <Stack spacing="xl">
          <Flex justify="between">
            <Stack spacing="sm">
              <Heading level={1}>{band.name}</Heading>
              {getStatusBadge(band.status)}
            </Stack>
            {canApprove && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => router.push(`/bands/${slug}/applications`)}
              >
                View Applications
              </Button>
            )}
          </Flex>

          {band.status === 'PENDING' && (
            <Alert variant="warning">
              <Text variant="small" weight="semibold">Band is Pending</Text>
              <Text variant="small">This band needs {3 - band.members.length} more active member(s) to become active.</Text>
            </Alert>
          )}

          <Card>
            <Stack spacing="md">
              <Heading level={3}>About</Heading>
              <Text>{band.description}</Text>
            </Stack>
          </Card>

          <Card>
            <Stack spacing="md">
              <Heading level={3}>Mission</Heading>
              <Text>{band.mission}</Text>
            </Stack>
          </Card>

          <Card>
            <Stack spacing="md">
              <Heading level={3}>Our Values</Heading>
              <List>
                {band.values.map((value: string, index: number) => (
                  <ListItem key={index}>{value}</ListItem>
                ))}
              </List>
            </Stack>
          </Card>

          <Card>
            <Stack spacing="md">
              <Heading level={3}>Skills We're Looking For</Heading>
              <List>
                {band.skillsLookingFor.map((skill: string, index: number) => (
                  <ListItem key={index}>{skill}</ListItem>
                ))}
              </List>
            </Stack>
          </Card>

          <Card>
            <Stack spacing="md">
              <Heading level={3}>What Members Will Learn</Heading>
              <List>
                {band.whatMembersWillLearn.map((item: string, index: number) => (
                  <ListItem key={index}>{item}</ListItem>
                ))}
              </List>
            </Stack>
          </Card>

          <Card>
            <Stack spacing="md">
              <Heading level={3}>Membership Requirements</Heading>
              <Text>{band.membershipRequirements}</Text>
            </Stack>
          </Card>

          <Card>
            <Stack spacing="md">
              <Heading level={3}>Who Can Approve Members</Heading>
              <List>
                {band.whoCanApprove.map((role: string, index: number) => (
                  <ListItem key={index}>{role.replace('_', ' ')}</ListItem>
                ))}
              </List>
            </Stack>
          </Card>

          <Card>
            <Stack spacing="md">
              <Heading level={3}>Members ({band.members.length})</Heading>
              <Stack spacing="sm">
                {band.members.map((member: any) => (
                  <Flex key={member.id} justify="between">
                    <Text variant="small">{member.user.name}</Text>
                    <Badge variant="info">{member.role.replace('_', ' ')}</Badge>
                  </Flex>
                ))}
              </Stack>
            </Stack>
          </Card>

          {band.zipcode && (
            <Card>
              <Stack spacing="sm">
                <Heading level={3}>Location</Heading>
                <Text variant="small">Zipcode: {band.zipcode}</Text>
              </Stack>
            </Card>
          )}
        </Stack>
      </DashboardContainer>
    </PageWrapper>
  )
}