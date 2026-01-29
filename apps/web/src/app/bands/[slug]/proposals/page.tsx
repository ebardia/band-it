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
  Flex,
  Card,
  Badge,
  Loading,
  Alert,
  BandLayout
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

// Roles that can create proposals
const CAN_CREATE_PROPOSAL = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export default function ProposalsPage() {
  const router = useRouter()
  const params = useParams()
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
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const { data: bandData, isLoading: bandLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const { data: proposalsData, isLoading: proposalsLoading } = trpc.proposal.getByBand.useQuery(
    { bandId: bandData?.band?.id || '' },
    { enabled: !!bandData?.band?.id }
  )

  if (bandLoading || proposalsLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Band Proposals"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Loading message="Loading proposals..." />
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
          pageTitle="Band Proposals"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
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
  const canCreateProposal = currentMember && CAN_CREATE_PROPOSAL.includes(currentMember.role)
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="info">Open</Badge>
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>
      case 'CLOSED':
        return <Badge variant="neutral">Closed</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  const openProposals = proposalsData?.proposals.filter((p: any) => p.status === 'OPEN') || []
  const closedProposals = proposalsData?.proposals.filter((p: any) => p.status !== 'OPEN') || []

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        pageTitle="Band Proposals"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        canCreateProposal={canCreateProposal}
        bandId={bandData?.band?.id}
        userId={userId || undefined}
        action={
          canCreateProposal ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push(`/bands/${slug}/proposals/create`)}
            >
              Create Proposal
            </Button>
          ) : undefined
        }
      >
        <Stack spacing="xl">
          {/* Open Proposals */}
          <Stack spacing="lg">
            <Heading level={2}>Open for Voting ({openProposals.length})</Heading>
            
            {openProposals.length > 0 ? (
              <Stack spacing="md">
                {openProposals.map((proposal: any) => (
                  <Card key={proposal.id}>
                    <Flex justify="between">
                      <Stack spacing="sm">
                        <Heading level={3}>{proposal.title}</Heading>
                        <Text variant="small" color="muted">
                          By {proposal.createdBy.name} • Ends {new Date(proposal.votingEndsAt).toLocaleDateString()}
                        </Text>
                        <Flex gap="sm">
                          {getStatusBadge(proposal.status)}
                          <Badge variant="neutral">{proposal._count.votes} votes</Badge>
                        </Flex>
                      </Stack>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => router.push(`/bands/${slug}/proposals/${proposal.id}`)}
                      >
                        Vote Now
                      </Button>
                    </Flex>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Alert variant="info">
                <Text>No open proposals at this time.</Text>
              </Alert>
            )}
          </Stack>

          {/* Closed Proposals */}
          {closedProposals.length > 0 && (
            <Stack spacing="lg">
              <Heading level={2}>Past Proposals ({closedProposals.length})</Heading>
              <Stack spacing="md">
                {closedProposals.map((proposal: any) => (
                  <Card key={proposal.id}>
                    <Flex justify="between">
                      <Stack spacing="sm">
                        <Heading level={3}>{proposal.title}</Heading>
                        <Text variant="small" color="muted">
                          By {proposal.createdBy.name}
                        </Text>
                        <Flex gap="sm">
                          {getStatusBadge(proposal.status)}
                          <Badge variant="neutral">{proposal._count.votes} votes</Badge>
                        </Flex>
                      </Stack>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/bands/${slug}/proposals/${proposal.id}`)}
                      >
                        View
                      </Button>
                    </Flex>
                  </Card>
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}