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
  ProposalProjects,
  IntegrityBlockModal,
  IntegrityWarningModal,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

const CAN_VOTE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']
const CAN_CREATE_PROJECT = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']
const CAN_UPDATE_ANY = ['FOUNDER', 'GOVERNOR', 'MODERATOR']
const CAN_REVIEW = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

const TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  BUDGET: 'Budget',
  PROJECT: 'Project',
  POLICY: 'Policy',
  MEMBERSHIP: 'Membership',
  DISSOLUTION: 'Dissolution',
}

const PRIORITY_VARIANTS: Record<string, string> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
}

type ProposalType = 'GENERAL' | 'BUDGET' | 'PROJECT' | 'POLICY' | 'MEMBERSHIP' | 'DISSOLUTION'
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
  const [editReason, setEditReason] = useState('')
  const [showVoteResetWarning, setShowVoteResetWarning] = useState(false)

  // Integrity Guard state
  const [validationIssues, setValidationIssues] = useState<any[]>([])
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [pendingEditData, setPendingEditData] = useState<any>(null)

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

  const editMutation = trpc.proposal.edit.useMutation({
    onSuccess: (data) => {
      showToast(data.message, 'success')
      setShowEditModal(false)
      setShowVoteResetWarning(false)
      setEditReason('')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  // Integrity Guard validation mutation
  const validationMutation = trpc.validation.check.useMutation()

  // Review state
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  // Review mutations
  const approveMutation = trpc.proposal.approveProposal.useMutation({
    onSuccess: () => {
      showToast('Proposal approved and sent to voting!', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const rejectMutation = trpc.proposal.rejectProposal.useMutation({
    onSuccess: () => {
      showToast('Proposal rejected', 'success')
      setShowRejectModal(false)
      setRejectionReason('')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const withdrawMutation = trpc.proposal.withdraw.useMutation({
    onSuccess: () => {
      showToast('Proposal withdrawn', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const submitForReviewMutation = trpc.proposal.submitForReview.useMutation({
    onSuccess: (data) => {
      if (data.reviewRequired) {
        showToast('Proposal submitted for review', 'success')
      } else {
        showToast('Proposal submitted and open for voting!', 'success')
      }
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

  const handleSaveEdit = async () => {
    if (!userId || !editTitle.trim() || !editDescription.trim()) return

    const proposal = proposalData?.proposal
    if (!proposal) return

    // If editing during voting, show warning first (unless already confirmed)
    if (proposal.status === 'OPEN' && !showVoteResetWarning) {
      setShowVoteResetWarning(true)
      return
    }

    // Require edit reason when editing during voting
    if (proposal.status === 'OPEN' && editReason.trim().length < 10) {
      showToast('Please provide an edit reason (minimum 10 characters)', 'error')
      return
    }

    const editData = {
      proposalId,
      userId,
      title: editTitle,
      description: editDescription,
      type: editType,
      priority: editPriority,
      problemStatement: editProblemStatement || null,
      expectedOutcome: editExpectedOutcome || null,
      risksAndConcerns: editRisksAndConcerns || null,
      editReason: proposal.status === 'OPEN' ? editReason.trim() : undefined,
    }

    // Store data for potential later use
    setPendingEditData(editData)

    // Run integrity validation
    try {
      const validation = await validationMutation.mutateAsync({
        entityType: 'Proposal',
        action: 'update',
        bandId: proposal.band?.id || '',
        data: {
          title: editTitle,
          description: editDescription,
          problemStatement: editProblemStatement || null,
          expectedOutcome: editExpectedOutcome || null,
          risksAndConcerns: editRisksAndConcerns || null,
        },
      })

      if (!validation.canProceed) {
        // BLOCK - show block modal, cannot proceed
        setValidationIssues(validation.issues)
        setShowBlockModal(true)
        return
      }

      if (validation.issues.length > 0) {
        // FLAG - show warning modal, user can choose to proceed
        setValidationIssues(validation.issues)
        setShowWarningModal(true)
        return
      }

      // All clear - edit proposal
      editMutation.mutate(editData)
    } catch (error) {
      // Validation failed - show error but don't edit
      console.error('Validation error:', error)
      showToast('Unable to validate content. Please try again.', 'error')
    }
  }

  // Handle proceeding with warnings
  const handleProceedWithWarnings = () => {
    if (!pendingEditData) return

    editMutation.mutate(pendingEditData)

    // Close modal and clear state
    setShowWarningModal(false)
    setValidationIssues([])
    setPendingEditData(null)
  }

  // Handle canceling warning
  const handleCancelWarning = () => {
    setShowWarningModal(false)
    setValidationIssues([])
    setPendingEditData(null)
  }

  // Handle closing block modal
  const handleCloseBlock = () => {
    setShowBlockModal(false)
    setValidationIssues([])
    setPendingEditData(null)
    setShowEditModal(false) // Close the edit modal too
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
          wide={true}
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
          wide={true}
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
  
  // Can edit if creator and proposal is not APPROVED/CLOSED
  const isCreator = proposal.createdById === userId
  const editableStatuses = ['DRAFT', 'PENDING_REVIEW', 'OPEN', 'REJECTED', 'WITHDRAWN']
  const canEdit = isCreator && editableStatuses.includes(proposal.status)

  // Can review if has reviewer role and is not the author
  const canReview = currentMember &&
    CAN_REVIEW.includes(currentMember.role) &&
    !isCreator &&
    proposal.status === 'PENDING_REVIEW'

  // Can withdraw if author and proposal is pending review
  const canWithdraw = isCreator && proposal.status === 'PENDING_REVIEW'

  // Can submit if author and proposal is draft
  const canSubmit = isCreator && proposal.status === 'DRAFT'

  // Can resubmit if author and proposal is rejected or withdrawn (and under limit)
  const canResubmit = isCreator &&
    ['REJECTED', 'WITHDRAWN'].includes(proposal.status) &&
    (proposal.submissionCount || 0) < 3

  const hasVoted = proposal.votes.some((v: any) => v.user.id === userId)
  const isOpen = proposal.status === 'OPEN'
  const votingEnded = proposal.votingEndsAt ? new Date() > new Date(proposal.votingEndsAt) : false

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
        wide={true}
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

          {/* Recently Edited Notice */}
          {proposal.editCount > 0 && proposal.lastEditedAt && (
            <Alert variant="info">
              <Flex gap="sm" align="center">
                <Text variant="small">
                  This proposal was edited {proposal.editCount} time{proposal.editCount > 1 ? 's' : ''}.
                  Last edited on {new Date(proposal.lastEditedAt).toLocaleDateString()}.
                </Text>
              </Flex>
            </Alert>
          )}

          {/* Header */}
          <Card>
            <Stack spacing="md">
              <Flex gap="sm" className="flex-wrap">
                {getStatusBadge(proposal.status)}
                <Badge variant="neutral">{TYPE_LABELS[proposal.type] || proposal.type}</Badge>
                <Badge variant={PRIORITY_VARIANTS[proposal.priority] as any}>{proposal.priority}</Badge>
                {proposal.editCount > 0 && (
                  <Badge variant="warning">Edited</Badge>
                )}
              </Flex>
              <Text color="muted">
                Proposed by {proposal.createdBy.name} on {new Date(proposal.createdAt).toLocaleDateString()}
              </Text>
              {proposal.submissionCount > 1 && (
                <Text variant="small" color="muted">
                  Submission #{proposal.submissionCount} of 3
                </Text>
              )}
            </Stack>
          </Card>

          {/* Rejection Feedback (for rejected proposals) */}
          {proposal.status === 'REJECTED' && proposal.rejectionReason && (
            <Alert variant="danger">
              <Stack spacing="sm">
                <Text weight="semibold">Reviewer Feedback</Text>
                <Text style={{ whiteSpace: 'pre-wrap' }}>{proposal.rejectionReason}</Text>
                {proposal.reviewedBy && (
                  <Text variant="small" color="muted">
                    Reviewed by {proposal.reviewedBy.name} on{' '}
                    {proposal.reviewedAt ? new Date(proposal.reviewedAt).toLocaleDateString() : 'N/A'}
                  </Text>
                )}
              </Stack>
            </Alert>
          )}

          {/* Author Actions for Draft */}
          {canSubmit && (
            <Card>
              <Stack spacing="md">
                <Heading level={3}>Submit for Review</Heading>
                <Text variant="small" color="muted">
                  This proposal is a draft. Submit it to be reviewed by a moderator before it can go to voting.
                </Text>
                <Button
                  variant="primary"
                  onClick={() => submitForReviewMutation.mutate({ proposalId, userId: userId! })}
                  disabled={submitForReviewMutation.isPending}
                >
                  {submitForReviewMutation.isPending ? 'Submitting...' : 'Submit for Review'}
                </Button>
              </Stack>
            </Card>
          )}

          {/* Author Actions for Pending Review */}
          {canWithdraw && (
            <Alert variant="info">
              <Flex justify="between" align="center">
                <Text>Your proposal is waiting for moderator review.</Text>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => withdrawMutation.mutate({ proposalId, userId: userId! })}
                  disabled={withdrawMutation.isPending}
                >
                  {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw'}
                </Button>
              </Flex>
            </Alert>
          )}

          {/* Author Actions for Rejected/Withdrawn */}
          {canResubmit && (
            <Card>
              <Stack spacing="md">
                <Heading level={3}>Resubmit Proposal</Heading>
                <Text variant="small" color="muted">
                  You can edit and resubmit this proposal. ({3 - (proposal.submissionCount || 0)} attempts remaining)
                </Text>
                <Button
                  variant="primary"
                  onClick={handleOpenEditModal}
                >
                  Edit & Resubmit
                </Button>
              </Stack>
            </Card>
          )}

          {/* Reviewer Actions */}
          {canReview && (
            <Card>
              <Stack spacing="md">
                <Heading level={3}>Review Proposal</Heading>
                <Text variant="small" color="muted">
                  As a reviewer, you can approve this proposal to send it to voting, or reject it with feedback.
                </Text>
                <Flex gap="md">
                  <Button
                    variant="primary"
                    onClick={() => approveMutation.mutate({ proposalId, userId: userId! })}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    {approveMutation.isPending ? 'Approving...' : '✅ Approve for Voting'}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setShowRejectModal(true)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    ❌ Reject
                  </Button>
                </Flex>
              </Stack>
            </Card>
          )}

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

          {/* Voting Info - only show when proposal is in voting or completed */}
          {['OPEN', 'APPROVED', 'REJECTED', 'CLOSED'].includes(proposal.status) && proposal.votingEndsAt && (
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
          )}

          {/* Vote Results - only show when proposal has been/is in voting */}
          {['OPEN', 'APPROVED', 'REJECTED', 'CLOSED'].includes(proposal.status) && (
            <Card>
              <Stack spacing="md">
                <Heading level={3}>
                  {proposal.status === 'OPEN' ? 'Current Results' : 'Final Results'}
                </Heading>
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
          )}

          {/* Voting Section */}
          {isOpen && canVote && !votingEnded && (
            <Card>
              <Stack spacing="md">
                <Heading level={3}>{hasVoted ? 'Change Your Vote' : 'Cast Your Vote'}</Heading>

                {/* Dissolution proposal warning */}
                {proposal.type === 'DISSOLUTION' && (
                  <Alert variant="danger">
                    <Text weight="semibold">⚠️ Dissolution Vote</Text>
                    <Text variant="small">
                      This proposal requires unanimous approval. If ANY voting member votes NO, the band will NOT be dissolved.
                      Non-voters are excluded from the count.
                    </Text>
                  </Alert>
                )}

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
                  {/* Hide abstain for dissolution proposals */}
                  {proposal.type !== 'DISSOLUTION' && (
                    <Button
                      variant={selectedVote === 'ABSTAIN' ? 'ghost' : 'secondary'}
                      size="lg"
                      onClick={() => handleVote('ABSTAIN')}
                      disabled={voteMutation.isPending}
                    >
                      🤷 Abstain
                    </Button>
                  )}
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

            {/* Vote Reset Warning - shown when editing during voting */}
            {proposal.status === 'OPEN' && showVoteResetWarning && (
              <Alert variant="warning">
                <Stack spacing="sm">
                  <Text weight="semibold">This will reset all {proposal.votes.length} vote(s)</Text>
                  <Text variant="small">
                    Editing a proposal during voting will delete all existing votes and restart the voting period.
                    All voters will be notified of this change.
                  </Text>
                  <Stack spacing="sm">
                    <Text variant="small" weight="semibold">Edit Reason (required)</Text>
                    <Textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      placeholder="Explain why you're editing this proposal (minimum 10 characters)"
                      rows={2}
                    />
                  </Stack>
                </Stack>
              </Alert>
            )}

            <Flex gap="sm" justify="end">
              <Button variant="ghost" onClick={() => {
                setShowEditModal(false)
                setShowVoteResetWarning(false)
                setEditReason('')
              }}>
                Cancel
              </Button>
              <Button
                variant={proposal.status === 'OPEN' && showVoteResetWarning ? 'danger' : 'primary'}
                onClick={handleSaveEdit}
                disabled={editMutation.isPending || validationMutation.isPending || !editTitle.trim() || !editDescription.trim() || (proposal.status === 'OPEN' && showVoteResetWarning && editReason.trim().length < 10)}
              >
                {validationMutation.isPending ? 'Checking...' : editMutation.isPending ? 'Saving...' : proposal.status === 'OPEN' && showVoteResetWarning ? 'Confirm Edit & Reset Votes' : 'Save Changes'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Integrity Guard Modals */}
        <IntegrityBlockModal
          isOpen={showBlockModal}
          onClose={handleCloseBlock}
          issues={validationIssues}
        />

        <IntegrityWarningModal
          isOpen={showWarningModal}
          onClose={handleCancelWarning}
          onProceed={handleProceedWithWarnings}
          issues={validationIssues}
          isProceeding={editMutation.isPending}
        />

        {/* Reject Modal */}
        <Modal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false)
            setRejectionReason('')
          }}
          title="Reject Proposal"
        >
          <Stack spacing="md">
            <Text>
              Provide feedback explaining why this proposal cannot proceed to voting.
              The author can use this feedback to revise and resubmit.
            </Text>
            <Textarea
              label="Rejection Reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain what needs to be changed..."
              rows={4}
            />
            <Flex gap="sm" justify="end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (userId && rejectionReason.trim().length >= 10) {
                    rejectMutation.mutate({
                      proposalId,
                      userId,
                      reason: rejectionReason,
                    })
                  }
                }}
                disabled={rejectMutation.isPending || rejectionReason.trim().length < 10}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Proposal'}
              </Button>
            </Flex>
            {rejectionReason.trim().length > 0 && rejectionReason.trim().length < 10 && (
              <Text variant="small" color="muted">
                Reason must be at least 10 characters
              </Text>
            )}
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}