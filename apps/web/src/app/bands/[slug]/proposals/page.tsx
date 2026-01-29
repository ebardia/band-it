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
// Roles that can review proposals
const CAN_REVIEW = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

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

  // Query for pending review proposals (for reviewers)
  const { data: pendingReviewData } = trpc.proposal.getPendingReview.useQuery(
    { bandId: bandData?.band?.id || '', userId: userId || '' },
    { enabled: !!bandData?.band?.id && !!userId }
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
      case 'DRAFT':
        return <Badge variant="neutral">📝 Draft</Badge>
      case 'PENDING_REVIEW':
        return <Badge variant="warning">⏳ Pending Review</Badge>
      case 'OPEN':
        return <Badge variant="info">🗳️ Voting</Badge>
      case 'APPROVED':
        return <Badge variant="success">✅ Passed</Badge>
      case 'REJECTED':
        return <Badge variant="danger">❌ Failed</Badge>
      case 'CLOSED':
        return <Badge variant="neutral">Closed</Badge>
      case 'WITHDRAWN':
        return <Badge variant="neutral">↩️ Withdrawn</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  const canReview = currentMember && CAN_REVIEW.includes(currentMember.role)
  const pendingReviewProposals = pendingReviewData?.proposals || []

  // My drafts (proposals I created that are still in draft)
  const myDrafts = proposalsData?.proposals.filter(
    (p: any) => p.createdBy.id === userId && p.status === 'DRAFT'
  ) || []

  // My pending review (proposals I created that are pending review)
  const myPendingReview = proposalsData?.proposals.filter(
    (p: any) => p.createdBy.id === userId && p.status === 'PENDING_REVIEW'
  ) || []

  // My rejected/withdrawn (proposals I can resubmit)
  const myRejected = proposalsData?.proposals.filter(
    (p: any) => p.createdBy.id === userId && ['REJECTED', 'WITHDRAWN'].includes(p.status)
  ) || []

  const openProposals = proposalsData?.proposals.filter((p: any) => p.status === 'OPEN') || []
  const completedProposals = proposalsData?.proposals.filter(
    (p: any) => ['APPROVED', 'REJECTED', 'CLOSED'].includes(p.status) && p.createdBy.id !== userId
  ) || []

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
          {/* Pending Review Queue (for reviewers) */}
          {canReview && pendingReviewProposals.length > 0 && (
            <Stack spacing="lg">
              <Alert variant="warning">
                <Flex justify="between" align="center">
                  <Text weight="semibold">⚠️ {pendingReviewProposals.length} proposal(s) waiting for your review</Text>
                </Flex>
              </Alert>
              <Heading level={2}>Pending Review ({pendingReviewProposals.length})</Heading>
              <Stack spacing="md">
                {pendingReviewProposals.map((proposal: any) => (
                  <Card key={proposal.id}>
                    <Flex justify="between">
                      <Stack spacing="sm">
                        <Heading level={3}>{proposal.title}</Heading>
                        <Text variant="small" color="muted">
                          By {proposal.createdBy.name} • Submitted {proposal.submittedAt ? new Date(proposal.submittedAt).toLocaleDateString() : 'recently'}
                        </Text>
                        <Flex gap="sm">
                          {getStatusBadge(proposal.status)}
                          <Badge variant="neutral">{proposal.authorRole}</Badge>
                        </Flex>
                      </Stack>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => router.push(`/bands/${slug}/proposals/${proposal.id}`)}
                      >
                        Review
                      </Button>
                    </Flex>
                  </Card>
                ))}
              </Stack>
            </Stack>
          )}

          {/* My Drafts */}
          {myDrafts.length > 0 && (
            <Stack spacing="lg">
              <Heading level={2}>My Drafts ({myDrafts.length})</Heading>
              <Stack spacing="md">
                {myDrafts.map((proposal: any) => (
                  <Card key={proposal.id}>
                    <Flex justify="between">
                      <Stack spacing="sm">
                        <Heading level={3}>{proposal.title}</Heading>
                        <Text variant="small" color="muted">
                          Created {new Date(proposal.createdAt).toLocaleDateString()}
                        </Text>
                        {getStatusBadge(proposal.status)}
                      </Stack>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/bands/${slug}/proposals/${proposal.id}`)}
                      >
                        Edit & Submit
                      </Button>
                    </Flex>
                  </Card>
                ))}
              </Stack>
            </Stack>
          )}

          {/* My Pending Review */}
          {myPendingReview.length > 0 && (
            <Stack spacing="lg">
              <Heading level={2}>Awaiting Review ({myPendingReview.length})</Heading>
              <Stack spacing="md">
                {myPendingReview.map((proposal: any) => (
                  <Card key={proposal.id}>
                    <Flex justify="between">
                      <Stack spacing="sm">
                        <Heading level={3}>{proposal.title}</Heading>
                        <Text variant="small" color="muted">
                          Submitted {proposal.submittedAt ? new Date(proposal.submittedAt).toLocaleDateString() : 'recently'}
                        </Text>
                        {getStatusBadge(proposal.status)}
                      </Stack>
                      <Button
                        variant="ghost"
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

          {/* My Rejected/Withdrawn */}
          {myRejected.length > 0 && (
            <Stack spacing="lg">
              <Heading level={2}>Needs Revision ({myRejected.length})</Heading>
              <Stack spacing="md">
                {myRejected.map((proposal: any) => (
                  <Card key={proposal.id}>
                    <Flex justify="between">
                      <Stack spacing="sm">
                        <Heading level={3}>{proposal.title}</Heading>
                        <Text variant="small" color="muted">
                          {proposal.status === 'REJECTED' ? 'Rejected' : 'Withdrawn'} • {proposal.submissionCount < 3 ? `${3 - proposal.submissionCount} resubmissions left` : 'No resubmissions left'}
                        </Text>
                        {getStatusBadge(proposal.status)}
                      </Stack>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/bands/${slug}/proposals/${proposal.id}`)}
                        disabled={proposal.submissionCount >= 3}
                      >
                        {proposal.submissionCount < 3 ? 'Revise' : 'View'}
                      </Button>
                    </Flex>
                  </Card>
                ))}
              </Stack>
            </Stack>
          )}

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
                          By {proposal.createdBy.name} • Ends {proposal.votingEndsAt ? new Date(proposal.votingEndsAt).toLocaleDateString() : 'TBD'}
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

          {/* Completed Proposals */}
          {completedProposals.length > 0 && (
            <Stack spacing="lg">
              <Heading level={2}>Past Proposals ({completedProposals.length})</Heading>
              <Stack spacing="md">
                {completedProposals.map((proposal: any) => (
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