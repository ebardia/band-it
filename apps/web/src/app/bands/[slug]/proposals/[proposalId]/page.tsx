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
  Alert,
  Loading,
  BandLayout,
  DiscussionSidebar,
  Textarea,
  Input,
  Modal,
  ProposalProjectsHierarchy,
  IntegrityBlockModal,
  IntegrityWarningModal,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { ProposalHeaderCompact } from './components/ProposalHeaderCompact'

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

  // Handle closing block modal - keep edit modal open so user can edit and retry
  const handleCloseBlock = () => {
    setShowBlockModal(false)
    setValidationIssues([])
    setPendingEditData(null)
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
        bandImageUrl={band.imageUrl}
        pageTitle={proposal.title}
        canApprove={canApprove}
        isMember={isMember}
        wide={true}
        rightSidebar={
          <DiscussionSidebar
            proposalId={proposalId}
            userId={userId}
            bandMembers={bandData?.band?.members || []}
          />
        }
      >
        <Stack spacing="md">
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

          {/* Compact Header with all info and actions */}
          <Card>
            <ProposalHeaderCompact
              proposal={proposal}
              band={bandData?.band}
              canEdit={canEdit}
              canSubmit={canSubmit}
              canWithdraw={canWithdraw}
              canResubmit={canResubmit}
              canReview={!!canReview}
              onEdit={handleOpenEditModal}
              onSubmit={() => submitForReviewMutation.mutate({ proposalId, userId: userId! })}
              onWithdraw={() => withdrawMutation.mutate({ proposalId, userId: userId! })}
              onApprove={() => approveMutation.mutate({ proposalId, userId: userId! })}
              onReject={() => setShowRejectModal(true)}
              isSubmitting={submitForReviewMutation.isPending}
              isWithdrawing={withdrawMutation.isPending}
              isApproving={approveMutation.isPending}
            />
          </Card>

          {/* Compact Voting Results */}
          {['OPEN', 'APPROVED', 'REJECTED', 'CLOSED'].includes(proposal.status) && (
            <div className="border border-gray-200 rounded-lg bg-white p-3 space-y-2">
              {/* Results row */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    {proposal.status === 'OPEN' ? 'Current:' : 'Result:'}
                  </span>
                  <span className="text-green-600 font-semibold">
                    👍 {voteSummary.yes} ({voteSummary.percentageYes}%)
                  </span>
                  <span className="text-red-600 font-semibold">
                    👎 {voteSummary.no} ({voteSummary.percentageNo}%)
                  </span>
                  <span className="text-gray-500">
                    🤷 {voteSummary.abstain}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-sm text-gray-600">
                    {voteSummary.total}/{voteSummary.eligibleVoters} voted
                  </span>
                </div>
                {proposal.votingEndsAt && (
                  <span className="text-xs text-gray-500">
                    {proposal.status === 'OPEN' ? 'Ends:' : 'Ended:'} {new Date(proposal.votingEndsAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              {/* Voting method */}
              <div className="text-xs text-gray-500">
                Method: {band.votingMethod?.replace(/_/g, ' ')}
              </div>
            </div>
          )}

          {/* Compact Voting Section */}
          {isOpen && canVote && !votingEnded && (
            <div className="border border-gray-200 rounded-lg bg-white p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {hasVoted ? 'Change Vote:' : 'Vote:'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote('YES')}
                    disabled={voteMutation.isPending}
                    className={`px-3 py-1.5 rounded text-sm font-medium ${
                      selectedVote === 'YES'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    👍 Yes
                  </button>
                  <button
                    onClick={() => handleVote('NO')}
                    disabled={voteMutation.isPending}
                    className={`px-3 py-1.5 rounded text-sm font-medium ${
                      selectedVote === 'NO'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    👎 No
                  </button>
                  {proposal.type !== 'DISSOLUTION' && (
                    <button
                      onClick={() => handleVote('ABSTAIN')}
                      disabled={voteMutation.isPending}
                      className={`px-3 py-1.5 rounded text-sm font-medium ${
                        selectedVote === 'ABSTAIN'
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      🤷 Abstain
                    </button>
                  )}
                </div>
              </div>
              {proposal.type === 'DISSOLUTION' && (
                <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  ⚠️ Dissolution requires unanimous approval. Any NO vote will fail.
                </div>
              )}
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add comment (optional)..."
                className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
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

          {/* Compact Close Proposal */}
          {isOpen && canClose && (
            <div className="border border-gray-200 rounded-lg bg-white p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${voteSummary.quorum.met ? 'text-green-700' : 'text-amber-700'}`}>
                    {voteSummary.quorum.met ? '✓ Quorum Met' : '⚠ Quorum Not Met'}
                    <span className="text-gray-400 font-normal ml-1">
                      ({voteSummary.quorum.actual}%)
                    </span>
                  </span>
                  <span className="text-gray-300">|</span>
                  {(() => {
                    if (!voteSummary.quorum.met) {
                      return <span className="text-sm text-red-600">Would reject (no quorum)</span>
                    }
                    const threshold = band.votingMethod === 'SUPERMAJORITY_75' ? 75
                      : band.votingMethod === 'SUPERMAJORITY_66' ? 66
                      : band.votingMethod === 'UNANIMOUS' ? 100
                      : 50
                    const wouldPass = band.votingMethod === 'UNANIMOUS'
                      ? voteSummary.no === 0 && voteSummary.yes > 0
                      : voteSummary.percentageYes > threshold
                    return (
                      <span className={`text-sm font-medium ${wouldPass ? 'text-green-600' : 'text-red-600'}`}>
                        Would {wouldPass ? 'pass' : 'fail'}
                      </span>
                    )
                  })()}
                </div>
                <button
                  onClick={handleClose}
                  disabled={closeMutation.isPending}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {closeMutation.isPending ? 'Closing...' : 'Close & Finalize'}
                </button>
              </div>
            </div>
          )}

          {/* Projects Section - Only shows for approved proposals */}
          <ProposalProjectsHierarchy
            proposalId={proposalId}
            proposalStatus={proposal.status}
            bandSlug={slug}
            canCreateProject={!!canCreateProject}
          />

          {/* Compact Vote List */}
          {proposal.votes.length > 0 && (
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">Votes ({proposal.votes.length})</span>
              </div>
              <div className="divide-y divide-gray-100">
                {proposal.votes.map((vote: any) => (
                  <div key={vote.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{vote.user.name}</span>
                      {vote.comment && (
                        <span className="text-xs text-gray-500 truncate">"{vote.comment}"</span>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      vote.vote === 'YES' ? 'bg-green-100 text-green-700' :
                      vote.vote === 'NO' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {vote.vote}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
        />

        <IntegrityWarningModal
          isOpen={showWarningModal}
          onClose={handleCancelWarning}
          onProceed={handleProceedWithWarnings}
          issues={validationIssues}
          isProceeding={editMutation.isPending}
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
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