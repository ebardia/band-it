'use client'

import { useState } from 'react'
import { Text, Badge, Button } from '@/components/ui'

interface ProposalHeaderCompactProps {
  proposal: any
  band: any
  canEdit: boolean
  canSubmit: boolean
  canWithdraw: boolean
  canResubmit: boolean
  canReview: boolean
  onEdit: () => void
  onSubmit: () => void
  onWithdraw: () => void
  onApprove: () => void
  onReject: () => void
  isSubmitting: boolean
  isWithdrawing: boolean
  isApproving: boolean
}

const STATUS_CONFIG: Record<string, { icon: string; color: string }> = {
  DRAFT: { icon: '📝', color: 'text-gray-600' },
  PENDING_REVIEW: { icon: '⏳', color: 'text-yellow-600' },
  OPEN: { icon: '🗳️', color: 'text-blue-600' },
  APPROVED: { icon: '✅', color: 'text-green-600' },
  REJECTED: { icon: '❌', color: 'text-red-600' },
  CLOSED: { icon: '📁', color: 'text-gray-600' },
  WITHDRAWN: { icon: '↩️', color: 'text-gray-600' },
}

const TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  BUDGET: 'Budget',
  PROJECT: 'Project',
  POLICY: 'Policy',
  MEMBERSHIP: 'Membership',
  DISSOLUTION: 'Dissolution',
}

export function ProposalHeaderCompact({
  proposal,
  band,
  canEdit,
  canSubmit,
  canWithdraw,
  canResubmit,
  canReview,
  onEdit,
  onSubmit,
  onWithdraw,
  onApprove,
  onReject,
  isSubmitting,
  isWithdrawing,
  isApproving,
}: ProposalHeaderCompactProps) {
  const [showMore, setShowMore] = useState(false)

  const statusConfig = STATUS_CONFIG[proposal.status] || { icon: '○', color: 'text-gray-600' }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'MEDIUM': return 'text-blue-600'
      default: return 'text-gray-500'
    }
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString()

  return (
    <div className="space-y-2">
      {/* Line 1: Status + Title + Type + Priority + Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-lg">{statusConfig.icon}</span>
          <span className={`text-sm font-medium ${statusConfig.color}`}>{proposal.status.replace('_', ' ')}</span>
          <span className="text-gray-300">|</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
            {TYPE_LABELS[proposal.type] || proposal.type}
          </span>
          <span className={`text-xs font-medium ${getPriorityColor(proposal.priority)}`}>
            {proposal.priority}
          </span>
          {proposal.editCount > 0 && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Edited</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
          {/* Context-specific actions */}
          {canSubmit && (
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {isSubmitting ? '...' : band?.requireProposalReview ? 'Submit for Review' : 'Submit & Open Voting'}
            </button>
          )}
          {canWithdraw && (
            <button
              onClick={onWithdraw}
              disabled={isWithdrawing}
              className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
            >
              {isWithdrawing ? '...' : 'Withdraw'}
            </button>
          )}
          {canResubmit && (
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {isSubmitting ? '...' : 'Resubmit'}
            </button>
          )}
          {canReview && (
            <>
              <button
                onClick={onApprove}
                disabled={isApproving}
                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {isApproving ? '...' : '✓ Approve'}
              </button>
              <button
                onClick={onReject}
                className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                ✗ Reject
              </button>
            </>
          )}
          {canEdit && (
            <button
              onClick={onEdit}
              className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Line 2: Metadata */}
      <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
        <span>by {proposal.createdBy.name}</span>
        <span className="text-gray-300">|</span>
        <span>{formatDate(proposal.createdAt)}</span>
        {proposal.submissionCount > 1 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-orange-600">Submission #{proposal.submissionCount}/3</span>
          </>
        )}
        {proposal.votingEndsAt && (
          <>
            <span className="text-gray-300">|</span>
            <span>Voting ends: {formatDate(proposal.votingEndsAt)}</span>
          </>
        )}
        <button
          onClick={() => setShowMore(!showMore)}
          className="text-blue-600 hover:underline ml-auto"
        >
          {showMore ? '▲ Less' : '▼ More'}
        </button>
      </div>

      {/* Rejection feedback - inline if rejected */}
      {proposal.status === 'REJECTED' && proposal.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-sm">
          <span className="font-medium text-red-700">Feedback:</span>{' '}
          <span className="text-red-600">{proposal.rejectionReason}</span>
          {proposal.reviewedBy && (
            <span className="text-red-500 text-xs ml-2">— {proposal.reviewedBy.name}</span>
          )}
        </div>
      )}

      {/* Expanded details */}
      {showMore && (
        <div className="pt-2 border-t border-gray-100 space-y-3 text-sm">
          {/* Description */}
          <div>
            <span className="font-medium text-gray-700">Description:</span>
            <p className="text-gray-600 whitespace-pre-wrap mt-1">{proposal.description}</p>
          </div>

          {/* Problem Statement */}
          {proposal.problemStatement && (
            <div>
              <span className="font-medium text-gray-700">Problem:</span>
              <p className="text-gray-600 whitespace-pre-wrap mt-1">{proposal.problemStatement}</p>
            </div>
          )}

          {/* Expected Outcome */}
          {proposal.expectedOutcome && (
            <div>
              <span className="font-medium text-gray-700">Expected Outcome:</span>
              <p className="text-gray-600 whitespace-pre-wrap mt-1">{proposal.expectedOutcome}</p>
            </div>
          )}

          {/* Risks */}
          {proposal.risksAndConcerns && (
            <div>
              <span className="font-medium text-gray-700">Risks:</span>
              <p className="text-gray-600 whitespace-pre-wrap mt-1">{proposal.risksAndConcerns}</p>
            </div>
          )}

          {/* Budget info */}
          {(proposal.budgetRequested || proposal.budgetBreakdown) && (
            <div className="flex gap-4 flex-wrap">
              {proposal.budgetRequested && (
                <span>
                  <span className="font-medium text-gray-700">Budget:</span>{' '}
                  <span className="text-green-600 font-medium">
                    ${proposal.budgetRequested.toLocaleString()}
                  </span>
                </span>
              )}
              {proposal.fundingSource && (
                <span>
                  <span className="font-medium text-gray-700">Source:</span>{' '}
                  <span className="text-gray-600">{proposal.fundingSource}</span>
                </span>
              )}
            </div>
          )}

          {/* Timeline */}
          {(proposal.proposedStartDate || proposal.proposedEndDate) && (
            <div className="flex gap-4 flex-wrap text-gray-600">
              {proposal.proposedStartDate && (
                <span>Start: {formatDate(proposal.proposedStartDate)}</span>
              )}
              {proposal.proposedEndDate && (
                <span>End: {formatDate(proposal.proposedEndDate)}</span>
              )}
            </div>
          )}

          {/* External links */}
          {proposal.externalLinks && proposal.externalLinks.length > 0 && (
            <div>
              <span className="font-medium text-gray-700">Links:</span>{' '}
              {proposal.externalLinks.map((link: string, i: number) => (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline mr-2"
                >
                  {new URL(link).hostname}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
