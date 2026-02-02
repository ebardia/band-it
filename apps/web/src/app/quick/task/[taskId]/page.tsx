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

export default function QuickTaskPage() {
  const router = useRouter()
  const params = useParams()
  const taskId = params.taskId as string

  const [userId, setUserId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionCompleted, setActionCompleted] = useState<string | null>(null)

  // Check for authentication
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
        router.push(`/login?returnTo=/quick/task/${taskId}`)
      }
    } else {
      router.push(`/login?returnTo=/quick/task/${taskId}`)
    }
  }, [router, taskId])

  // Fetch task context
  const {
    data: context,
    isLoading,
    error,
    refetch,
  } = trpc.quick.getTaskContext.useQuery(
    { taskId, userId: userId! },
    { enabled: !!userId && !!taskId }
  )

  // Mutations
  // @ts-ignore - tRPC type instantiation depth limit
  const claimMutation = trpc.task.claim.useMutation({
    onSuccess: () => {
      setActionCompleted('claimed')
      setIsSubmitting(false)
      refetch()
    },
    onError: (error) => {
      setIsSubmitting(false)
      console.error('Claim error:', error)
    },
  })

  const unclaimMutation = trpc.task.unclaim.useMutation({
    onSuccess: () => {
      setActionCompleted('unclaimed')
      setIsSubmitting(false)
      refetch()
    },
    onError: (error) => {
      setIsSubmitting(false)
      console.error('Unclaim error:', error)
    },
  })

  const submitVerificationMutation = trpc.task.submitForVerification.useMutation({
    onSuccess: () => {
      setActionCompleted('submitted')
      setIsSubmitting(false)
      refetch()
    },
    onError: (error) => {
      setIsSubmitting(false)
      console.error('Submit error:', error)
    },
  })

  const retryMutation = trpc.task.retry.useMutation({
    onSuccess: () => {
      setActionCompleted('retried')
      setIsSubmitting(false)
      refetch()
    },
    onError: (error) => {
      setIsSubmitting(false)
      console.error('Retry error:', error)
    },
  })

  const handleClaim = () => {
    if (!userId) return
    setIsSubmitting(true)
    claimMutation.mutate({ taskId, userId })
  }

  const handleUnclaim = () => {
    if (!userId) return
    setIsSubmitting(true)
    unclaimMutation.mutate({ taskId, userId })
  }

  const handleSubmitForVerification = () => {
    if (!userId) return
    setIsSubmitting(true)
    submitVerificationMutation.mutate({ taskId, userId })
  }

  const handleRetry = () => {
    if (!userId) return
    setIsSubmitting(true)
    retryMutation.mutate({ taskId, userId })
  }

  const formatDueDate = (date: string | Date | null) => {
    if (!date) return 'No due date'
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    if (diffDays <= 7) return `Due in ${diffDays} days`
    return d.toLocaleDateString()
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'danger'
      case 'HIGH': return 'warning'
      case 'MEDIUM': return 'info'
      default: return 'default'
    }
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
        title="Task"
        error={error.message}
      />
    )
  }

  // No context
  if (!context) {
    return (
      <QuickLayout
        title="Task"
        error="Unable to load task"
      />
    )
  }

  const { task, project, band, permissions } = context

  // Show success state after action
  if (actionCompleted) {
    const messages: Record<string, { emoji: string; title: string; message: string }> = {
      claimed: { emoji: '✅', title: 'Task Claimed!', message: `You've claimed "${task.name}"` },
      unclaimed: { emoji: '↩️', title: 'Task Unclaimed', message: `You've unclaimed "${task.name}"` },
      submitted: { emoji: '📤', title: 'Submitted for Review', message: `"${task.name}" is awaiting verification` },
      retried: { emoji: '🔄', title: 'Resubmitted', message: `"${task.name}" has been resubmitted for review` },
    }
    const m = messages[actionCompleted] || { emoji: '✓', title: 'Done', message: '' }

    return (
      <QuickLayout
        bandName={band.name}
        title={m.title}
      >
        <QuickCard>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">{m.emoji}</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{m.title}</h2>
            <p className="text-gray-600 text-sm">{m.message}</p>
          </div>
        </QuickCard>

        <div className="mt-6 space-y-3">
          <QuickButton
            variant="secondary"
            fullWidth
            onClick={() => setActionCompleted(null)}
          >
            View Task
          </QuickButton>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            You can close this page now.
          </p>
        </div>
      </QuickLayout>
    )
  }

  // Show completed state
  if (permissions.isCompleted) {
    return (
      <QuickLayout
        bandName={band.name}
        title="Task Completed"
      >
        <QuickCard>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Task Completed
            </h2>
            <p className="text-gray-600 text-sm mb-2">
              "{task.name}"
            </p>
            {task.verifiedBy && (
              <p className="text-xs text-gray-400">
                Verified by {task.verifiedBy.name}
              </p>
            )}
          </div>
        </QuickCard>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            You can close this page now.
          </p>
        </div>
      </QuickLayout>
    )
  }

  // Show rejected state
  if (permissions.isRejected && permissions.isAssignedToUser) {
    return (
      <QuickLayout
        bandName={band.name}
        title="Task Needs Revision"
      >
        <QuickCard>
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-lg font-semibold text-gray-900">
                {task.name}
              </h2>
            </div>

            <QuickDivider />

            {task.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800 mb-1">Feedback:</p>
                <p className="text-sm text-red-700">{task.rejectionReason}</p>
              </div>
            )}

            <QuickInfo label="Project" value={project.name} />
            <QuickInfo
              label="Verified by"
              value={task.verifiedBy?.name || 'Unknown'}
            />
          </div>
        </QuickCard>

        <div className="mt-6 space-y-3">
          <QuickButton
            variant="primary"
            fullWidth
            onClick={handleRetry}
            disabled={isSubmitting || !permissions.canRetry}
          >
            {isSubmitting ? 'Resubmitting...' : 'Resubmit for Verification'}
          </QuickButton>

          <QuickButton
            variant="secondary"
            fullWidth
            onClick={handleUnclaim}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Unclaiming...' : 'Unclaim Task'}
          </QuickButton>
        </div>
      </QuickLayout>
    )
  }

  // Show in review state
  if (permissions.isInReview && permissions.isAssignedToUser) {
    return (
      <QuickLayout
        bandName={band.name}
        title="Awaiting Verification"
      >
        <QuickCard>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Awaiting Verification
            </h2>
            <p className="text-gray-600 text-sm mb-2">
              "{task.name}"
            </p>
            <p className="text-xs text-gray-400">
              A moderator will review your work soon.
            </p>
          </div>
        </QuickCard>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            You can close this page now.
          </p>
        </div>
      </QuickLayout>
    )
  }

  // Show dues required state
  if (!permissions.inGoodStanding) {
    return (
      <QuickLayout
        bandName={band.name}
        title="Dues Required"
      >
        <QuickCard>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">💳</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Dues Payment Required
            </h2>
            <p className="text-gray-600 text-sm">
              {permissions.duesReason || 'Please pay your dues to claim tasks.'}
            </p>
          </div>
        </QuickCard>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Please pay your dues on the full site to continue.
          </p>
        </div>
      </QuickLayout>
    )
  }

  // Show role required state
  if (!permissions.meetsRoleRequirement && !permissions.isAssignedToUser) {
    return (
      <QuickLayout
        bandName={band.name}
        title="Role Required"
      >
        <QuickCard>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Role Required
            </h2>
            <p className="text-gray-600 text-sm">
              This task requires {task.minClaimRole || 'a specific role'} or higher to claim.
            </p>
          </div>
        </QuickCard>

        <QuickCard className="mt-4">
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">{task.name}</h3>
            {task.description && (
              <p className="text-sm text-gray-600">{task.description}</p>
            )}
            <QuickInfo label="Project" value={project.name} />
            <QuickInfo label="Your Role" value={permissions.membershipRole} />
          </div>
        </QuickCard>
      </QuickLayout>
    )
  }

  // Main task UI - either claim, work on, or submit
  return (
    <QuickLayout
      bandName={band.name}
      title={permissions.isAssignedToUser ? 'Your Task' : 'Claim Task'}
    >
      {/* Task info */}
      <QuickCard>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 leading-tight">
              {task.name}
            </h2>
            <QuickBadge variant={getPriorityColor(task.priority) as any}>
              {task.priority}
            </QuickBadge>
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-4">
              {task.description}
            </p>
          )}

          <QuickDivider />

          <QuickInfo label="Project" value={project.name} />
          <QuickInfo
            label="Due"
            value={
              <span className={task.dueDate && new Date(task.dueDate) < new Date() ? 'text-red-600 font-medium' : ''}>
                {formatDueDate(task.dueDate)}
              </span>
            }
          />
          {task.assignee && (
            <QuickInfo label="Assigned to" value={task.assignee.name} />
          )}
          {task.requiresVerification && (
            <QuickInfo
              label="Verification"
              value={<span className="text-orange-600">Required</span>}
            />
          )}
        </div>
      </QuickCard>

      {/* Context tags */}
      {(task.contextPhone || task.contextComputer || task.contextTravel || task.contextTimeMinutes) && (
        <QuickCard className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Context</h3>
          <div className="flex flex-wrap gap-2">
            {task.contextPhone && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                📱 Phone
              </span>
            )}
            {task.contextComputer && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                💻 Computer
              </span>
            )}
            {task.contextTravel && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                🚗 Travel
              </span>
            )}
            {task.contextTimeMinutes && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                ⏱️ {task.contextTimeMinutes}min
              </span>
            )}
          </div>
        </QuickCard>
      )}

      {/* Action buttons */}
      <div className="mt-6 space-y-3">
        {permissions.canClaim && (
          <QuickButton
            variant="success"
            fullWidth
            onClick={handleClaim}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Claiming...' : '✋ Claim This Task'}
          </QuickButton>
        )}

        {permissions.canSubmitForVerification && (
          <QuickButton
            variant="primary"
            fullWidth
            onClick={handleSubmitForVerification}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : '📤 Submit for Verification'}
          </QuickButton>
        )}

        {permissions.canMarkComplete && (
          <QuickButton
            variant="success"
            fullWidth
            onClick={handleSubmitForVerification}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Completing...' : '✅ Mark Complete'}
          </QuickButton>
        )}

        {permissions.canUnclaim && (
          <QuickButton
            variant="secondary"
            fullWidth
            onClick={handleUnclaim}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Unclaiming...' : 'Unclaim Task'}
          </QuickButton>
        )}

        {!permissions.canClaim && !permissions.isAssignedToUser && task.assignee && (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">
              This task is already claimed by {task.assignee.name}
            </p>
          </div>
        )}
      </div>
    </QuickLayout>
  )
}
