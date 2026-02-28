'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ChecklistItemHeaderCompactProps {
  item: any
  task: any
  bandSlug: string
  canUpdate: boolean
  isAssignee: boolean
  isMember: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  onClaim: () => void
  onDismiss: () => void
  isToggling: boolean
  isDeleting: boolean
  isClaiming: boolean
  isDismissing: boolean
  needsDeliverable: boolean
}

export function ChecklistItemHeaderCompact({
  item,
  task,
  bandSlug,
  canUpdate,
  isAssignee,
  isMember,
  onEdit,
  onToggle,
  onDelete,
  onClaim,
  onDismiss,
  isToggling,
  isDeleting,
  isClaiming,
  isDismissing,
  needsDeliverable,
}: ChecklistItemHeaderCompactProps) {
  const router = useRouter()
  const [showMore, setShowMore] = useState(true)

  const canModify = canUpdate || isAssignee
  const isCompleted = item.isCompleted
  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && !isCompleted

  const formatDate = (date: string) => new Date(date).toLocaleDateString()

  return (
    <div className="space-y-2">
      {/* Line 1: Status + Assignee + Due + Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-lg">{isCompleted ? '☑️' : '☐'}</span>
          <span className={`text-sm font-medium ${isCompleted ? 'text-green-600' : 'text-yellow-600'}`}>
            {isCompleted ? 'Completed' : 'Pending'}
          </span>
          {item.assignee ? (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
              {item.assignee.name}
            </span>
          ) : (
            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
              Unassigned
            </span>
          )}
          {item.dueDate && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
            }`}>
              Due: {formatDate(item.dueDate)}
            </span>
          )}
          {item.requiresDeliverable && !isCompleted && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
              Needs Deliverable
            </span>
          )}
          {item.files && item.files.length > 0 && (
            <span className="text-xs text-gray-500">📎 {item.files.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
          {/* Claim and Dismiss buttons for unassigned items */}
          {isMember && !item.assigneeId && !isCompleted && (
            <>
              <button
                onClick={onClaim}
                disabled={isClaiming}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {isClaiming ? '...' : 'Claim'}
              </button>
              <button
                onClick={onDismiss}
                disabled={isDismissing}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >
                {isDismissing ? '...' : 'Dismiss'}
              </button>
            </>
          )}
          {/* Toggle completion */}
          {canModify && (
            <button
              onClick={onToggle}
              disabled={isToggling || needsDeliverable}
              className={`text-xs px-2 py-1 rounded ${
                isCompleted
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
              title={needsDeliverable ? 'Fill in deliverable first' : ''}
            >
              {isToggling ? '...' : isCompleted ? 'Reopen' : 'Complete'}
            </button>
          )}
          {canModify && (
            <button
              onClick={onEdit}
              className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
            >
              Edit
            </button>
          )}
          {canModify && (
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
            >
              {isDeleting ? '...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Line 2: Metadata */}
      <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
        <button
          onClick={() => router.push(`/bands/${bandSlug}/tasks/${task.id}`)}
          className="hover:text-blue-600 hover:underline"
        >
          {task.name}
        </button>
        <span className="text-gray-300">|</span>
        <span>Created: {formatDate(item.createdAt)}</span>
        {item.completedAt && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-green-600">
              Completed: {formatDate(item.completedAt)}
              {item.completedBy && ` by ${item.completedBy.name}`}
            </span>
          </>
        )}
        <button
          onClick={() => setShowMore(!showMore)}
          className="text-blue-600 hover:underline ml-auto"
        >
          {showMore ? '< Less' : '> More'}
        </button>
      </div>

      {/* Verification status badge if applicable */}
      {item.verificationStatus && (
        <div className={`text-xs px-2 py-1 rounded inline-flex items-center gap-2 ${
          item.verificationStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
          item.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          <span>
            {item.verificationStatus === 'APPROVED' ? '✓ Verified' :
             item.verificationStatus === 'REJECTED' ? '✗ Rejected' :
             '? Pending Verification'}
          </span>
        </div>
      )}

      {/* Rejection feedback inline */}
      {item.verificationStatus === 'REJECTED' && item.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-sm">
          <span className="font-medium text-red-700">Feedback:</span>{' '}
          <span className="text-red-600">{item.rejectionReason}</span>
        </div>
      )}

      {/* Expanded details */}
      {showMore && (
        <div className="pt-2 border-t border-gray-100 space-y-3 text-sm">
          {/* Description */}
          <div>
            <span className="font-medium text-gray-700">Description:</span>
            <p className="text-gray-600 mt-1">{item.description}</p>
          </div>

          {/* Notes */}
          {item.notes && (
            <div>
              <span className="font-medium text-gray-700">Notes:</span>
              <p className="text-gray-600 whitespace-pre-wrap mt-1">{item.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Deliverable hint */}
      {needsDeliverable && (
        <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
          Fill in the deliverable section below (min 30 chars) before completing
        </div>
      )}
    </div>
  )
}
