'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED'

interface TaskHeaderCompactProps {
  task: any
  bandSlug: string
  canUpdate: boolean
  isAssignee: boolean
  isMember: boolean
  onEdit: () => void
  onStatusChange: (status: TaskStatus) => void
  onClaim: () => void
  onDelete: () => void
  isUpdating: boolean
  isClaiming: boolean
  isDeleting: boolean
}

const STATUS_CONFIG: Record<string, { icon: string; color: string }> = {
  TODO: { icon: '○', color: 'text-gray-600' },
  IN_PROGRESS: { icon: '⏳', color: 'text-blue-600' },
  IN_REVIEW: { icon: '👁️', color: 'text-yellow-600' },
  COMPLETED: { icon: '✅', color: 'text-green-600' },
  BLOCKED: { icon: '🚫', color: 'text-red-600' },
}

export function TaskHeaderCompact({
  task,
  bandSlug,
  canUpdate,
  isAssignee,
  isMember,
  onEdit,
  onStatusChange,
  onClaim,
  onDelete,
  isUpdating,
  isClaiming,
  isDeleting,
}: TaskHeaderCompactProps) {
  const router = useRouter()
  const [showMore, setShowMore] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  const statusConfig = STATUS_CONFIG[task.status] || { icon: '○', color: 'text-gray-600' }
  const canModify = canUpdate || isAssignee
  const isCompleted = task.status === 'COMPLETED'

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
      {/* Line 1: Status + Title + Priority + Assignee + Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-lg">{statusConfig.icon}</span>
          <span className={`text-sm font-medium ${statusConfig.color}`}>{task.status.replace('_', ' ')}</span>
          <span className="text-gray-300">|</span>
          <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
          {task.assignee ? (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
              {task.assignee.name}
            </span>
          ) : (
            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
              Unassigned
            </span>
          )}
          {task.requiresVerification && !isCompleted && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
              Needs Verification
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
          {/* Claim button for unassigned tasks */}
          {isMember && !task.assigneeId && !isCompleted && (
            <button
              onClick={onClaim}
              disabled={isClaiming}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {isClaiming ? '...' : 'Claim'}
            </button>
          )}
          {/* Quick status actions */}
          {canModify && !isCompleted && (
            <>
              {task.status === 'TODO' && (
                <button
                  onClick={() => onStatusChange('IN_PROGRESS')}
                  disabled={isUpdating}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                >
                  Start
                </button>
              )}
              {task.status === 'IN_PROGRESS' && (
                <>
                  {task.requiresVerification ? (
                    <button
                      onClick={() => onStatusChange('IN_REVIEW')}
                      disabled={isUpdating}
                      className="text-xs px-2 py-1 bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100"
                    >
                      Submit for Review
                    </button>
                  ) : (
                    <button
                      onClick={() => onStatusChange('COMPLETED')}
                      disabled={isUpdating}
                      className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
                    >
                      Done
                    </button>
                  )}
                  <button
                    onClick={() => onStatusChange('BLOCKED')}
                    disabled={isUpdating}
                    className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded"
                  >
                    Block
                  </button>
                </>
              )}
              {task.status === 'BLOCKED' && (
                <button
                  onClick={() => onStatusChange('IN_PROGRESS')}
                  disabled={isUpdating}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                >
                  Unblock
                </button>
              )}
            </>
          )}
          {/* Status dropdown for all statuses */}
          {canModify && (
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
              >
                Status
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 py-1 min-w-[120px]">
                  {(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED'] as TaskStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        onStatusChange(status)
                        setShowStatusMenu(false)
                      }}
                      disabled={isUpdating || task.status === status}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 ${
                        task.status === status ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                    >
                      <span>{STATUS_CONFIG[status].icon}</span>
                      <span>{status.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {canModify && (
            <button
              onClick={onEdit}
              className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
            >
              Edit
            </button>
          )}
          {canUpdate && (
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
          onClick={() => router.push(`/bands/${bandSlug}/projects/${task.projectId}`)}
          className="hover:text-blue-600 hover:underline"
        >
          {task.project.name}
        </button>
        {task.dueDate && (
          <>
            <span className="text-gray-300">|</span>
            <span className={new Date(task.dueDate) < new Date() && !isCompleted ? 'text-red-600' : ''}>
              Due: {formatDate(task.dueDate)}
            </span>
          </>
        )}
        {task.estimatedHours && (
          <>
            <span className="text-gray-300">|</span>
            <span>Est: {task.estimatedHours}h</span>
          </>
        )}
        {task.actualHours && (
          <>
            <span className="text-gray-300">|</span>
            <span>Actual: {task.actualHours}h</span>
          </>
        )}
        <span className="text-gray-300">|</span>
        <span>Created: {formatDate(task.createdAt)}</span>
        <button
          onClick={() => setShowMore(!showMore)}
          className="text-blue-600 hover:underline ml-auto"
        >
          {showMore ? '< Less' : '> More'}
        </button>
      </div>

      {/* Verification badge if applicable */}
      {task.requiresVerification && task.verificationStatus && (
        <div className={`text-xs px-2 py-1 rounded inline-flex items-center gap-2 ${
          task.verificationStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
          task.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          <span>
            {task.verificationStatus === 'APPROVED' ? '✓ Verified' :
             task.verificationStatus === 'REJECTED' ? '✗ Rejected' :
             '? Pending Review'}
          </span>
          {task.verifiedBy && (
            <span className="text-gray-500">by {task.verifiedBy.name}</span>
          )}
        </div>
      )}

      {/* Expanded details */}
      {showMore && (
        <div className="pt-2 border-t border-gray-100 space-y-3 text-sm">
          {/* Description */}
          {task.description && (
            <div>
              <span className="font-medium text-gray-700">Description:</span>
              <p className="text-gray-600 whitespace-pre-wrap mt-1">{task.description}</p>
            </div>
          )}

          {/* Verification notes */}
          {task.verificationNotes && (
            <div>
              <span className="font-medium text-gray-700">Verification Notes:</span>
              <p className="text-gray-600 mt-1">{task.verificationNotes}</p>
            </div>
          )}

          {/* Proof of completion */}
          {task.proofDescription && (
            <div>
              <span className="font-medium text-gray-700">Proof of Completion:</span>
              <p className="text-gray-600 mt-1">{task.proofDescription}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
