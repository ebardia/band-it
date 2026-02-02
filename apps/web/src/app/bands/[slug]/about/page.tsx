'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import { MIN_MEMBERS_TO_ACTIVATE } from '@band-it/shared'
import {
  Heading,
  Text,
  Stack,
  Button,
  useToast,
  Flex,
  Card,
  Badge,
  Loading,
  Alert,
  List,
  ListItem,
  BandLayout,
  Modal,
  BillingBanner
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function BandAboutPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

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

  const { data: bandData, isLoading, refetch } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const leaveBandMutation = trpc.band.leaveBand.useMutation({
    onSuccess: () => {
      showToast('You have left the band', 'success')
      router.push('/bands/my-bands')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleLeaveBand = () => {
    if (!userId || !bandData?.band) return
    leaveBandMutation.mutate({
      bandId: bandData.band.id,
      userId,
    })
  }

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
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="About"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading band..." />
        </BandLayout>
      </>
    )
  }

  if (!bandData?.band) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Band Not Found"
          isMember={false}
          wide={true}
        >
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const band = bandData.band

  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const isFounder = currentMember?.role === 'FOUNDER'
  const canLeave = isMember && !isFounder
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="About"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        action={
          canLeave ? (
            <Button variant="danger" size="md" onClick={() => setShowLeaveModal(true)}>
              Leave Band
            </Button>
          ) : undefined
        }
      >
        <Stack spacing="lg">
          <Card className="p-8">
            <Stack spacing="xl">
              {getStatusBadge(band.status)}

              {band.status === 'PENDING' && (
                <Alert variant="warning">
                  <Text variant="small" weight="semibold">Band is Pending</Text>
                  <Text variant="small">This band needs {MIN_MEMBERS_TO_ACTIVATE - band.members.length} more active member(s) to become active.</Text>
                </Alert>
              )}
            </Stack>
          </Card>

          {/* Billing Banner - shown to members when payment action needed */}
          {isMember && userId && (
            <BillingBanner
              bandId={band.id}
              bandSlug={slug}
              userId={userId}
            />
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

        <Modal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)}>
          <Stack spacing="lg">
            <Heading level={2}>Leave {band.name}?</Heading>
            <Alert variant="warning">
              <Text variant="small" weight="bold">Are you sure?</Text>
              <Text variant="small">You will need to apply or be invited again to rejoin.</Text>
            </Alert>
            <Flex gap="md" justify="end">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowLeaveModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleLeaveBand}
                disabled={leaveBandMutation.isPending}
              >
                {leaveBandMutation.isPending ? 'Leaving...' : 'Leave Band'}
              </Button>
            </Flex>
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}
