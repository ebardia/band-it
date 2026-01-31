'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import {
  QuickLayout,
  QuickCard,
  QuickButton,
  QuickDivider,
  QuickInfo,
  QuickBadge,
} from '@/components/quick'

export default function QuickVotePage() {
  const router = useRouter()
  const params = useParams()
  const proposalId = params.proposalId as string

  const [userId, setUserId] = useState<string | null>(null)
  const [selectedVote, setSelectedVote] = useState<'YES' | 'NO' | 'ABSTAIN' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [voteSubmitted, setVoteSubmitted] = useState(false)

  // Check for authentication
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
        // Redirect to login with returnTo
        router.push(`/login?returnTo=/quick/vote/${proposalId}`)
      }
    } else {
      // Redirect to login with returnTo
      router.push(`/login?returnTo=/quick/vote/${proposalId}`)
    }
  }, [router, proposalId])

  // Fetch vote context
  const {
    data: context,
    isLoading,
    error,
  } = trpc.quick.getVoteContext.useQuery(
    { proposalId, userId: userId! },
    { enabled: !!userId && !!proposalId }
  )

  // Vote mutation
  const voteMutation = trpc.proposal.vote.useMutation({
    onSuccess: () => {
      setVoteSubmitted(true)
      setIsSubmitting(false)
    },
    onError: (error) => {
      setIsSubmitting(false)
      console.error('Vote error:', error)
    },
  })

  const handleVote = (vote: 'YES' | 'NO' | 'ABSTAIN') => {
    if (!userId || !context?.permissions.canVote) return
    setSelectedVote(vote)
    setIsSubmitting(true)
    voteMutation.mutate({
      proposalId,
      userId,
      vote,
    })
  }

  const formatTimeRemaining = (endDate: string | Date) => {
    const now = new Date()
    const end = new Date(endDate)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return 'Voting ended'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h remaining`
    if (hours > 0) return `${hours}h ${minutes}m remaining`
    return `${minutes}m remaining`
  }

  // Show loading state
  if (isLoading || !userId) {
    return (
      <QuickLayout
        title="Loading..."
        isLoading={true}
      />
    )
  }

  // Show error state
  if (error) {
    return (
      <QuickLayout
        title="Vote on Proposal"
        error={error.message}
      />
    )
  }

  // No context (shouldn't happen if query succeeded)
  if (!context) {
    return (
      <QuickLayout
        title="Vote on Proposal"
        error="Unable to load proposal"
      />
    )
  }

  const { proposal, band, userVote, voteSummary, permissions } = context

  // Show success state after voting
  if (voteSubmitted) {
    return (
      <QuickLayout
        bandName={band.name}
        bandSlug={band.slug}
        title="Vote Submitted"
      >
        <QuickCard>
          <div className="text-center py-6">
            <div className="text-4xl mb-4">
              {selectedVote === 'YES' && '👍'}
              {selectedVote === 'NO' && '👎'}
              {selectedVote === 'ABSTAIN' && '🤷'}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              You voted {selectedVote}
            </h2>
            <p className="text-gray-600 text-sm">
              Your vote on "{proposal.title}" has been recorded.
            </p>
          </div>
        </QuickCard>

        <div className="mt-6 space-y-3">
          <QuickButton
            variant="primary"
            fullWidth
            onClick={() => router.push(`/bands/${band.slug}/proposals/${proposalId}`)}
          >
            View Full Proposal
          </QuickButton>
          <QuickButton
            variant="secondary"
            fullWidth
            onClick={() => router.push(`/bands/${band.slug}/proposals`)}
          >
            All Proposals
          </QuickButton>
        </div>
      </QuickLayout>
    )
  }

  // Show already voted state
  if (userVote) {
    return (
      <QuickLayout
        bandName={band.name}
        bandSlug={band.slug}
        title="Already Voted"
      >
        <QuickCard>
          <div className="text-center py-4">
            <div className="text-3xl mb-3">
              {userVote.vote === 'YES' && '👍'}
              {userVote.vote === 'NO' && '👎'}
              {userVote.vote === 'ABSTAIN' && '🤷'}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              You voted {userVote.vote}
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              on "{proposal.title}"
            </p>
            <p className="text-xs text-gray-500">
              {new Date(userVote.createdAt).toLocaleDateString()}
            </p>
          </div>
        </QuickCard>

        <div className="mt-6">
          <QuickButton
            variant="primary"
            fullWidth
            onClick={() => router.push(`/bands/${band.slug}/proposals/${proposalId}`)}
          >
            View Full Proposal
          </QuickButton>
        </div>
      </QuickLayout>
    )
  }

  // Show voting ended state
  if (permissions.votingExpired || !permissions.votingOpen) {
    return (
      <QuickLayout
        bandName={band.name}
        bandSlug={band.slug}
        title="Voting Closed"
      >
        <QuickCard>
          <div className="text-center py-6">
            <div className="text-4xl mb-4">🗳️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Voting has ended
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              The voting period for "{proposal.title}" has closed.
            </p>
            <QuickBadge
              variant={proposal.status === 'APPROVED' ? 'success' : proposal.status === 'REJECTED' ? 'danger' : 'default'}
            >
              {proposal.status}
            </QuickBadge>
          </div>
        </QuickCard>

        <div className="mt-6">
          <QuickButton
            variant="primary"
            fullWidth
            onClick={() => router.push(`/bands/${band.slug}/proposals/${proposalId}`)}
          >
            View Results
          </QuickButton>
        </div>
      </QuickLayout>
    )
  }

  // Show dues required state
  if (!permissions.inGoodStanding) {
    return (
      <QuickLayout
        bandName={band.name}
        bandSlug={band.slug}
        title="Dues Required"
      >
        <QuickCard>
          <div className="text-center py-6">
            <div className="text-4xl mb-4">💳</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Dues Payment Required
            </h2>
            <p className="text-gray-600 text-sm">
              {permissions.duesReason || 'Please pay your dues to vote on this proposal.'}
            </p>
          </div>
        </QuickCard>

        <div className="mt-6 space-y-3">
          <QuickButton
            variant="primary"
            fullWidth
            onClick={() => router.push(`/bands/${band.slug}/billing`)}
          >
            Go to Billing
          </QuickButton>
          <QuickButton
            variant="secondary"
            fullWidth
            onClick={() => router.push(`/bands/${band.slug}/proposals/${proposalId}`)}
          >
            View Proposal
          </QuickButton>
        </div>
      </QuickLayout>
    )
  }

  // Main voting UI
  return (
    <QuickLayout
      bandName={band.name}
      bandSlug={band.slug}
      title="Vote on Proposal"
    >
      {/* Proposal info */}
      <QuickCard>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 leading-tight">
              {proposal.title}
            </h2>
            <QuickBadge variant="info">{proposal.type}</QuickBadge>
          </div>

          <p className="text-sm text-gray-600 line-clamp-3">
            {proposal.description}
          </p>

          <QuickDivider />

          <QuickInfo
            label="Proposed by"
            value={proposal.createdBy.name}
          />
          <QuickInfo
            label="Time remaining"
            value={
              proposal.votingEndsAt ? (
                <span className="text-orange-600 font-medium">
                  {formatTimeRemaining(proposal.votingEndsAt)}
                </span>
              ) : (
                'No deadline'
              )
            }
          />
        </div>
      </QuickCard>

      {/* Current results */}
      <QuickCard className="mt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Current Results</h3>
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-green-600">{voteSummary.yes}</div>
            <div className="text-xs text-gray-500">Yes</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-red-600">{voteSummary.no}</div>
            <div className="text-xs text-gray-500">No</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-gray-600">{voteSummary.abstain}</div>
            <div className="text-xs text-gray-500">Abstain</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{voteSummary.total} of {voteSummary.eligibleVoters} voted</span>
            <span className={voteSummary.quorumMet ? 'text-green-600' : 'text-orange-600'}>
              {voteSummary.quorumMet ? 'Quorum met' : `${voteSummary.quorumRequired}% quorum needed`}
            </span>
          </div>
        </div>
      </QuickCard>

      {/* Vote buttons */}
      <div className="mt-6 space-y-3">
        <QuickButton
          variant="success"
          fullWidth
          onClick={() => handleVote('YES')}
          disabled={isSubmitting || !permissions.canVote}
        >
          {isSubmitting && selectedVote === 'YES' ? 'Submitting...' : '👍 Vote Yes'}
        </QuickButton>

        <QuickButton
          variant="danger"
          fullWidth
          onClick={() => handleVote('NO')}
          disabled={isSubmitting || !permissions.canVote}
        >
          {isSubmitting && selectedVote === 'NO' ? 'Submitting...' : '👎 Vote No'}
        </QuickButton>

        <QuickButton
          variant="secondary"
          fullWidth
          onClick={() => handleVote('ABSTAIN')}
          disabled={isSubmitting || !permissions.canVote}
        >
          {isSubmitting && selectedVote === 'ABSTAIN' ? 'Submitting...' : '🤷 Abstain'}
        </QuickButton>
      </div>

      {/* Link to full proposal */}
      <div className="mt-6 text-center">
        <button
          onClick={() => router.push(`/bands/${band.slug}/proposals/${proposalId}`)}
          className="text-sm text-blue-600 hover:underline"
        >
          View full proposal details
        </button>
      </div>
    </QuickLayout>
  )
}
