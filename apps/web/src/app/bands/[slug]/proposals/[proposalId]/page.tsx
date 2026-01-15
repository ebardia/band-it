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
  Alert,
  Loading,
  BandLayout,
  DiscussionSidebar,
  Textarea,
  Input,
  List,
  ListItem,
  Modal,
  ProposalProjects
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

const CAN_VOTE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']
const CAN_CREATE_PROJECT = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']
const CAN_UPDATE_ANY = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

const TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  BUDGET: 'Budget',
  PROJECT: 'Project',
  POLICY: 'Policy',
  MEMBERSHIP: 'Membership',
}

const PRIORITY_VARIANTS: Record<string, string> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
}

type ProposalType = 'GENERAL' | 'BUDGET' | 'PROJECT' | 'POLICY' | 'MEMBERSHIP'
type ProposalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export default function ProposalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const slug = params.slug as string
  const proposalId = params.proposalId as string
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedVote, setSelectedVote] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editType, setEditType] = useState<ProposalType>('GENERAL')
  const [editPriority, setEditPriority] = useState<ProposalPriority>('MEDIUM')
  const [editProblemStatement, setEditProblemStatement] = useState('')
  const [editExpectedOutcome, setEditExpectedOutcome] = useState('')
  const [editRisksAndConcerns, setEditRisksAndConcerns] = useState('')

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

  const { data: bandData } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const { data: proposalData, isLoading, refetch } = trpc.proposal.getById.useQuery(
    { proposalId },
    { enabled: !!proposalId }
  )

  const voteMutation = trpc.proposal.vote.useMutation({
    onSuccess: (data) => {
      showToast(data.message, 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const closeMutation = trpc.proposal.closeProposal.useMutation({
    onSuccess: (data) => {
      showToast(data.message, 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const updateMutation = trpc.proposal.update.useMutation({
    onSuccess: (data) => {
      showToast(data.message, 'success')
      setShowEditModal(false)
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  useEffect(() => {
    if (proposalData?.proposal && userId) {
      const existingVote = proposalData.proposal.votes.find((v: any) => v.user.id === userId)
      if (existingVote) {
        setSelectedVote(existingVote.vote)
        setComment(existingVote.comment || '')
      }
    }
  }, [proposalData, userId])

  const handleOpenEditModal = () => {
    if (!proposalData?.proposal) return
    const p = proposalData.proposal
    setEditTitle(p.title)
    setEditDescription(p.description)
    setEditType(p.type as ProposalType)
    setEditPriority(p.priority as ProposalPriority)
    setEditProblemStatement(p.problemStatement || '')
    setEditExpectedOutcome(p.expectedOutcome || '')
    setEditRisksAndConcerns(p.risksAndConcerns || '')
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (!userId || !editTitle.trim() || !editDescription.trim()) return
    updateMutation.mutate({
      proposalId,
      userId,
      title: editTitle,
      description: editDescription,
      type: editType,
      priority: editPriority,
      problemStatement: editProblemStatement || null,
      expectedOutcome: editExpectedOutcome || null,
      risksAndConcerns: editRisksAndConcerns || null,
    })
  }

  if (isLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Proposal"
          isMember={false}
        >
          <Loading message="Loading proposal..." />
        </BandLayout>
      </>
    )
  }

  if (!proposalData?.proposal) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Proposal"
          isMember={false}
        >
          <Alert variant="danger">
            <Text>Proposal not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const proposal = proposalData.proposal
  const voteSummary = proposalData.voteSummary
  const band = proposal.band

  const currentMember = bandData?.band?.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && bandData?.band?.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const canVote = currentMember && CAN_VOTE.includes(currentMember.role)
  const canCreateProject = currentMember && CAN_CREATE_PROJECT.includes(currentMember.role)
  const canClose = proposal.createdById === userId || 
                   currentMember?.role === 'FOUNDER' || 
                   currentMember?.role === 'GOVERNOR'
  
  // Can edit if creator or admin role, and proposal is still open
  const isCreator = proposal.createdById === userId
  const canUpdateAny = currentMember && CAN_UPDATE_ANY.includes(currentMember.role)
  const canEdit = proposal.status === 'OPEN' && (isCreator || canUpdateAny)

  const hasVoted = proposal.votes.some((v: any) => v.user.id === userId)
  const isOpen = proposal.status === 'OPEN'
  const votingEnded = new Date() > new Date(proposal.votingEndsAt)

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

  const handleVote = (vote: string) => {
    if (!userId) return
    voteMutation.mutate({
      proposalId,
      userId,
      vote: vote as 'YES' | 'NO' | 'ABSTAIN',
      comment: comment || undefined,
    })
  }

  const handleClose = () => {
    if (!userId) return
    closeMutation.mutate({ proposalId, userId })
  }

  const formatCurrency = (amount: any) => {
    if (!amount) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const typeOptions: ProposalType[] = ['GENERAL', 'BUDGET', 'PROJECT', 'POLICY', 'MEMBERSHIP']
  const priorityOptions: ProposalPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        pageTitle={proposal.title}
        canApprove={canApprove}
        isMember={isMember}
        action={
          canEdit ? (
            <Button variant="secondary" size="md" onClick={handleOpenEditModal}>
              Edit Proposal
            </Button>
          ) : undefined
        }
        rightSidebar={
          <DiscussionSidebar
            proposalId={proposalId}
            userId={userId}
            bandMembers={bandData?.band?.members || []}
          />
        }
      >
        <Stack spacing="lg">
          {/* Breadcrumb */}
          <Flex gap="sm" align="center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/bands/${slug}/proposals`)}
            >
              ← Proposals
            </Button>
          </Flex>

          {/* Header */}
          <Card>
            <Stack spacing="md">
              <Flex gap="sm">
                {getStatusBadge(proposal.status)}
                <Badge variant="neutral">{TYPE_LABELS[proposal.type] || proposal.type}</Badge>
                <Badge variant={PRIORITY_VARIANTS[proposal.priority] as any}>{proposal.priority}</Badge>
              </Flex>
              <Text color="muted">
                Proposed by {proposal.createdBy.name} on {new Date(proposal.createdAt).toLocaleDateString()}
              </Text>
            </Stack>
          </Card>

          {/* Description */}
          <Card>
            <Stack spacing="md">
              <Heading level={3}>Description</Heading>
              <Text style={{ whiteSpace: 'pre-wrap' }}>{proposal.description}</Text>
            </Stack>
          </Card>

          {/* Problem & Outcome */}
          {(proposal.problemStatement || proposal.expectedOutcome || proposal.risksAndConcerns) && (
            <Card>
              <Stack spacing="lg">
                <Heading level={3}>Analysis</Heading>
                
                {proposal.problemStatement && (
                  <Stack spacing="sm">
                    <Text variant="small" weight="semibold">Problem Statement</Text>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{proposal.problemStatement}</Text>
                  </Stack>
                )}

                {proposal.expectedOutcome && (
                  <Stack spacing="sm">
                    <Text variant="small" weight="semibold">Expected Outcome</Text>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{proposal.expectedOutcome}</Text>
                  </Stack>
                )}

                {proposal.risksAndConcerns && (
                  <Stack spacing="sm">
                    <Text variant="small" weight="semibold">Risks & Concerns</Text>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{proposal.risksAndConcerns}</Text>
                  </Stack>
                )}
              </Stack>
            </Card>
          )}

          {/* Budget */}
          {(proposal.budgetRequested || proposal.budgetBreakdown || proposal.fundingSource) && (
            <Card>
              <Stack spacing="lg">
                <Heading level={3}>Budget</Heading>
                
                {proposal.budgetRequested && (
                  <Stack spacing="sm">
                    <Text variant="small" weight="semibold">Amount Requested</Text>
                    <Heading level={2}>{formatCurrency(proposal.budgetRequested)}</Heading>
                  </Stack>
                )}

                {proposal.budgetBreakdown && (
                  <Stack spacing="sm">
                    <Text variant="small" weight="semibold">Breakdown</Text>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{proposal.budgetBreakdown}</Text>
                  </Stack>
                )}

                {proposal.fundingSource && (
                  <Stack spacing="sm">
                    <Text variant="small" weight="semibold">Funding Source</Text>
                    <Text>{proposal.fundingSource}</Text>
                  </Stack>
                )}
              </Stack>
            </Card>
          )}

          {/* Timeline */}
          {(proposal.proposedStartDate || proposal.proposedEndDate || proposal.milestones) && (
            <Card>
              <Stack spacing="lg">
                <Heading level={3}>Timeline</Heading>
                
                <Flex gap="lg">
                  {proposal.proposedStartDate && (
                    <Stack spacing="sm">
                      <Text variant="small" weight="semibold">Start Date</Text>
                      <Text>{new Date(proposal.proposedStartDate).toLocaleDateString()}</Text>
                    </Stack>
                  )}
                  {proposal.proposedEndDate && (
                    <Stack spacing="sm">
                      <Text variant="small" weight="semibold">End Date</Text>
                      <Text>{new Date(proposal.proposedEndDate).toLocaleDateString()}</Text>
                    </Stack>
                  )}
                </Flex>

                {proposal.milestones && (
                  <Stack spacing="sm">
                    <Text variant="small" weight="semibold">Milestones</Text>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{proposal.milestones}</Text>
                  </Stack>
                )}
              </Stack>
            </Card>
          )}

          {/* External Links */}
          {proposal.externalLinks && proposal.externalLinks.length > 0 && (
            <Card>
              <Stack spacing="md">
                <Heading level={3}>Supporting Links</Heading>
                <List>
                  {proposal.externalLinks.map((link: string, idx: number) => (
                    <ListItem key={idx}>
                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {link}
                      </a>
                    </ListItem>
                  ))}
                </List>
              </Stack>
            </Card>
          )}

          {/* Voting Info */}
          <Card>
            <Stack spacing="md">
              <Heading level={3}>Voting Information</Heading>
              <Flex gap="lg">
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold">Method</Text>
                  <Text variant="small">{band.votingMethod?.replace(/_/g, ' ')}</Text>
                </Stack>
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold">Voting Ends</Text>
                  <Text variant="small">{new Date(proposal.votingEndsAt).toLocaleString()}</Text>
                </Stack>
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold">Eligible Voters</Text>
                  <Text variant="small">{voteSummary.eligibleVoters}</Text>
                </Stack>
              </Flex>
            </Stack>
          </Card>

          {/* Vote Results */}
          <Card>
            <Stack spacing="md">
              <Heading level={3}>Current Results</Heading>
              <Flex gap="lg">
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold">Yes</Text>
                  <Heading level={2}>{voteSummary.yes}</Heading>
                  <Text variant="small" color="muted">{voteSummary.percentageYes}%</Text>
                </Stack>
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold">No</Text>
                  <Heading level={2}>{voteSummary.no}</Heading>
                  <Text variant="small" color="muted">{voteSummary.percentageNo}%</Text>
                </Stack>
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold">Abstain</Text>
                  <Heading level={2}>{voteSummary.abstain}</Heading>
                </Stack>
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold">Total Votes</Text>
                  <Heading level={2}>{voteSummary.total}</Heading>
                  <Text variant="small" color="muted">of {voteSummary.eligibleVoters}</Text>
                </Stack>
              </Flex>
            </Stack>
          </Card>

          {/* Voting Section */}
          {isOpen && canVote && !votingEnded && (
            <Card>
              <Stack spacing="md">
                <Heading level={3}>{hasVoted ? 'Change Your Vote' : 'Cast Your Vote'}</Heading>
                
                <Textarea
                  label="Comment (optional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment to explain your vote..."
                  rows={3}
                />

                <Flex gap="md">
                  <Button
                    variant={selectedVote === 'YES' ? 'primary' : 'secondary'}
                    size="lg"
                    onClick={() => handleVote('YES')}
                    disabled={voteMutation.isPending}
                  >
                    👍 Yes
                  </Button>
                  <Button
                    variant={selectedVote === 'NO' ? 'danger' : 'secondary'}
                    size="lg"
                    onClick={() => handleVote('NO')}
                    disabled={voteMutation.isPending}
                  >
                    👎 No
                  </Button>
                  <Button
                    variant={selectedVote === 'ABSTAIN' ? 'ghost' : 'secondary'}
                    size="lg"
                    onClick={() => handleVote('ABSTAIN')}
                    disabled={voteMutation.isPending}
                  >
                    🤷 Abstain
                  </Button>
                </Flex>
              </Stack>
            </Card>
          )}

          {isOpen && votingEnded && (
            <Alert variant="warning">
              <Text>Voting period has ended. Waiting for proposal to be closed.</Text>
            </Alert>
          )}

          {isOpen && !canVote && isMember && (
            <Alert variant="info">
              <Text>Your role does not have voting permissions.</Text>
            </Alert>
          )}

          {/* Close Proposal Button */}
          {isOpen && canClose && (
            <Card>
              <Stack spacing="md">
                <Heading level={3}>Close Proposal</Heading>
                <Text variant="small" color="muted">
                  Closing will calculate the final result based on the voting method.
                </Text>
                <Button
                  variant="danger"
                  size="md"
                  onClick={handleClose}
                  disabled={closeMutation.isPending}
                >
                  {closeMutation.isPending ? 'Closing...' : 'Close Proposal & Finalize'}
                </Button>
              </Stack>
            </Card>
          )}

          {/* Projects Section - Only shows for approved proposals */}
          <ProposalProjects
            proposalId={proposalId}
            proposalStatus={proposal.status}
            bandSlug={slug}
            canCreateProject={!!canCreateProject}
          />

          {/* Vote List */}
          {proposal.votes.length > 0 && (
            <Card>
              <Stack spacing="md">
                <Heading level={3}>Votes ({proposal.votes.length})</Heading>
                <Stack spacing="sm">
                  {proposal.votes.map((vote: any) => (
                    <Flex key={vote.id} justify="between" align="start">
                      <Stack spacing="sm">
                        <Text variant="small" weight="semibold">{vote.user.name}</Text>
                        {vote.comment && (
                          <Text variant="small" color="muted">"{vote.comment}"</Text>
                        )}
                      </Stack>
                      <Badge 
                        variant={vote.vote === 'YES' ? 'success' : vote.vote === 'NO' ? 'danger' : 'neutral'}
                      >
                        {vote.vote}
                      </Badge>
                    </Flex>
                  ))}
                </Stack>
              </Stack>
            </Card>
          )}

          {/* Back Button */}
          <Button
            variant="ghost"
            size="md"
            onClick={() => router.push(`/bands/${slug}/proposals`)}
          >
            ← Back to Proposals
          </Button>
        </Stack>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Proposal"
        >
          <Stack spacing="md">
            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Title</Text>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Proposal title"
              />
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Description</Text>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Proposal description"
                rows={4}
              />
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Type</Text>
              <Flex gap="sm" className="flex-wrap">
                {typeOptions.map((type) => (
                  <Button
                    key={type}
                    variant={editType === type ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setEditType(type)}
                  >
                    {TYPE_LABELS[type]}
                  </Button>
                ))}
              </Flex>
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Priority</Text>
              <Flex gap="sm">
                {priorityOptions.map((priority) => (
                  <Button
                    key={priority}
                    variant={editPriority === priority ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setEditPriority(priority)}
                  >
                    {priority}
                  </Button>
                ))}
              </Flex>
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Problem Statement (optional)</Text>
              <Textarea
                value={editProblemStatement}
                onChange={(e) => setEditProblemStatement(e.target.value)}
                placeholder="What problem does this solve?"
                rows={2}
              />
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Expected Outcome (optional)</Text>
              <Textarea
                value={editExpectedOutcome}
                onChange={(e) => setEditExpectedOutcome(e.target.value)}
                placeholder="What should happen if this is approved?"
                rows={2}
              />
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Risks & Concerns (optional)</Text>
              <Textarea
                value={editRisksAndConcerns}
                onChange={(e) => setEditRisksAndConcerns(e.target.value)}
                placeholder="Any potential risks or concerns?"
                rows={2}
              />
            </Stack>

            <Flex gap="sm" justify="end">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending || !editTitle.trim() || !editDescription.trim()}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </Flex>
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}