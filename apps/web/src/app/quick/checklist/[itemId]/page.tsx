'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
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

// Desktop breakpoint (matches Tailwind's md:)
const DESKTOP_BREAKPOINT = 768

interface DeliverableLink {
  url: string
  title: string
}

export default function QuickChecklistPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const itemId = params.itemId as string
  const bandSlug = searchParams.get('band')
  const taskId = searchParams.get('task')

  const [userId, setUserId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionCompleted, setActionCompleted] = useState<string | null>(null)

  // Deliverable state
  const [summary, setSummary] = useState('')
  const [links, setLinks] = useState<DeliverableLink[]>([])
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [deliverableError, setDeliverableError] = useState<string | null>(null)

  // Redirect desktop users to full page
  useEffect(() => {
    if (typeof window !== 'undefined' && bandSlug && taskId) {
      if (window.innerWidth >= DESKTOP_BREAKPOINT) {
        router.replace(`/bands/${bandSlug}/tasks/${taskId}/checklist/${itemId}`)
        return
      }
    }
  }, [router, bandSlug, taskId, itemId])

  // Check for authentication
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
        router.push(`/login?returnTo=/quick/checklist/${itemId}`)
      }
    } else {
      router.push(`/login?returnTo=/quick/checklist/${itemId}`)
    }
  }, [router, itemId])

  // Fetch checklist item context
  const {
    data: context,
    isLoading,
    error,
    refetch,
  } = trpc.quick.getChecklistItemContext.useQuery(
    { itemId, userId: userId! },
    { enabled: !!userId && !!itemId }
  )

  // Mutations
  const claimMutation = trpc.checklist.claim.useMutation({
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

  const unclaimMutation = trpc.checklist.unclaim.useMutation({
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

  const submitMutation = trpc.checklist.submit.useMutation({
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

  const retryMutation = trpc.checklist.retry.useMutation({
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

  // @ts-ignore - tRPC type instantiation depth issue
  const updateDeliverableMutation = trpc.checklist.updateDeliverable.useMutation({
    onError: (error) => {
      setDeliverableError(error.message)
      setIsSubmitting(false)
    },
  })

  // Populate form with existing deliverable data
  useEffect(() => {
    if (context?.item?.deliverable) {
      setSummary(context.item.deliverable.summary || '')
      const existingLinks = context.item.deliverable.links
      if (Array.isArray(existingLinks)) {
        setLinks(existingLinks as unknown as DeliverableLink[])
      }
    }
  }, [context])

  const handleClaim = () => {
    if (!userId) return
    setIsSubmitting(true)
    claimMutation.mutate({ itemId, userId })
  }

  const handleUnclaim = () => {
    if (!userId) return
    setIsSubmitting(true)
    unclaimMutation.mutate({ itemId, userId })
  }

  const handleAddLink = () => {
    if (!newLinkUrl.trim() || !newLinkTitle.trim()) {
      setDeliverableError('Please enter both URL and title')
      return
    }
    try {
      new URL(newLinkUrl)
    } catch {
      setDeliverableError('Please enter a valid URL')
      return
    }
    setLinks(prev => [...prev, { url: newLinkUrl.trim(), title: newLinkTitle.trim() }])
    setNewLinkUrl('')
    setNewLinkTitle('')
    setDeliverableError(null)
  }

  const handleRemoveLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!userId || !context) return
    setDeliverableError(null)

    const requiresDeliverable = context.item.requiresDeliverable

    // Validate deliverable if required
    if (requiresDeliverable) {
      if (!summary.trim()) {
        setDeliverableError('Please enter a summary of what was accomplished')
        return
      }
      if (summary.trim().length < 30) {
        setDeliverableError('Summary must be at least 30 characters')
        return
      }
    }

    setIsSubmitting(true)

    try {
      // Save deliverable first if required or if summary is provided
      if (summary.trim()) {
        await updateDeliverableMutation.mutateAsync({
          checklistItemId: itemId,
          userId,
          summary: summary.trim(),
          links: links.length > 0 ? links : undefined,
        })
      }

      // Now submit for verification
      submitMutation.mutate({ itemId, userId })
    } catch (error) {
      // Error already handled by mutation onError
      setIsSubmitting(false)
    }
  }

  const handleRetry = async () => {
    if (!userId || !context) return
    setDeliverableError(null)

    const requiresDeliverable = context.item.requiresDeliverable

    // Validate deliverable if required
    if (requiresDeliverable) {
      if (!summary.trim()) {
        setDeliverableError('Please enter a summary of what was accomplished')
        return
      }
      if (summary.trim().length < 30) {
        setDeliverableError('Summary must be at least 30 characters')
        return
      }
    }

    setIsSubmitting(true)

    try {
      // Save deliverable first if required or if summary is provided
      if (summary.trim()) {
        await updateDeliverableMutation.mutateAsync({
          checklistItemId: itemId,
          userId,
          summary: summary.trim(),
          links: links.length > 0 ? links : undefined,
        })
      }

      // Now retry submission
      retryMutation.mutate({ itemId, userId })
    } catch (error) {
      // Error already handled by mutation onError
      setIsSubmitting(false)
    }
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
      case 'URGENT': return 'danger'
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
        title="Checklist Item"
        error={error.message}
      />
    )
  }

  // No context
  if (!context) {
    return (
      <QuickLayout
        title="Checklist Item"
        error="Unable to load checklist item"
      />
    )
  }

  const { item, task, project, band, permissions } = context

  // Show success state after action
  if (actionCompleted) {
    const messages: Record<string, { emoji: string; title: string; message: string }> = {
      claimed: { emoji: '✅', title: 'Item Claimed!', message: `You've claimed this checklist item` },
      unclaimed: { emoji: '↩️', title: 'Item Unclaimed', message: `You've unclaimed this checklist item` },
      submitted: { emoji: '📤', title: 'Submitted for Review', message: `The item is awaiting verification` },
      retried: { emoji: '🔄', title: 'Resubmitted', message: `The item has been resubmitted for review` },
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
            View Item
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
        title="Item Completed"
      >
        <QuickCard>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Item Completed
            </h2>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
              "{item.description}"
            </p>
            {item.verifiedBy && (
              <p className="text-xs text-gray-400">
                Verified by {item.verifiedBy.name}
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
    const summaryLength = summary.trim().length
    const isSummaryValid = !item.requiresDeliverable || summaryLength >= 30

    return (
      <QuickLayout
        bandName={band.name}
        title="Item Needs Revision"
      >
        <QuickCard>
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">
                {item.description}
              </h2>
            </div>

            <QuickDivider />

            {item.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800 mb-1">Feedback:</p>
                <p className="text-sm text-red-700">{item.rejectionReason}</p>
              </div>
            )}

            <QuickInfo label="Task" value={task.name} />
            <QuickInfo label="Project" value={project.name} />
            <QuickInfo
              label="Verified by"
              value={item.verifiedBy?.name || 'Unknown'}
            />
          </div>
        </QuickCard>

        {/* Deliverable form for retry */}
        <QuickCard className="mt-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Update your work summary {item.requiresDeliverable && <span className="text-red-500">*</span>}
                </h3>
                <span className="text-xs text-gray-500">{summaryLength}/30 min</span>
              </div>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe the work completed..."
                className={`w-full px-3 py-2 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  item.requiresDeliverable && summaryLength > 0 && summaryLength < 30
                    ? 'border-red-300'
                    : 'border-gray-300'
                }`}
                rows={6}
              />
              {item.requiresDeliverable && summaryLength > 0 && summaryLength < 30 && (
                <p className="text-xs text-red-500 mt-1">
                  {30 - summaryLength} more characters needed
                </p>
              )}
            </div>

            {/* Links section */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Related Links (optional)</h3>

              {links.length > 0 && (
                <div className="space-y-2 mb-3">
                  {links.map((link, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{link.title}</p>
                        <p className="text-gray-500 text-xs truncate">{link.url}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="text-red-500 text-xs hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="Link title"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddLink}
                    disabled={!newLinkUrl.trim() || !newLinkTitle.trim()}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {deliverableError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{deliverableError}</p>
              </div>
            )}
          </div>
        </QuickCard>

        <div className="mt-6 space-y-3">
          <QuickButton
            variant="primary"
            fullWidth
            onClick={handleRetry}
            disabled={isSubmitting || !permissions.canRetry || (item.requiresDeliverable && !isSummaryValid)}
          >
            {isSubmitting ? 'Resubmitting...' : 'Resubmit for Verification'}
          </QuickButton>

          <QuickButton
            variant="secondary"
            fullWidth
            onClick={handleUnclaim}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Unclaiming...' : 'Unclaim Item'}
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
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
              "{item.description}"
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
              {permissions.duesReason || 'Please pay your dues to claim items.'}
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
              This item requires {item.minClaimRole || 'a specific role'} or higher to claim.
            </p>
          </div>
        </QuickCard>

        <QuickCard className="mt-4">
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 line-clamp-2">{item.description}</h3>
            <QuickInfo label="Task" value={task.name} />
            <QuickInfo label="Project" value={project.name} />
            <QuickInfo label="Your Role" value={permissions.membershipRole} />
          </div>
        </QuickCard>
      </QuickLayout>
    )
  }

  // Calculate if deliverable is valid for submit
  const summaryLength = summary.trim().length
  const isSummaryValid = !item.requiresDeliverable || summaryLength >= 30

  // Main checklist item UI - either claim, work on, or submit
  return (
    <QuickLayout
      bandName={band.name}
      title={permissions.isAssignedToUser ? 'Your Item' : 'Claim Item'}
    >
      {/* Item info */}
      <QuickCard>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 leading-tight line-clamp-3">
              {item.description}
            </h2>
            <QuickBadge variant={getPriorityColor(item.priority) as any}>
              {item.priority}
            </QuickBadge>
          </div>

          {item.notes && (
            <p className="text-sm text-gray-600 line-clamp-4">
              {item.notes}
            </p>
          )}

          <QuickDivider />

          <QuickInfo label="Task" value={task.name} />
          <QuickInfo label="Project" value={project.name} />
          <QuickInfo
            label="Due"
            value={
              <span className={item.dueDate && new Date(item.dueDate) < new Date() ? 'text-red-600 font-medium' : ''}>
                {formatDueDate(item.dueDate)}
              </span>
            }
          />
          {item.assignee && (
            <QuickInfo label="Assigned to" value={item.assignee.name} />
          )}
          {item.requiresVerification && (
            <QuickInfo
              label="Verification"
              value={<span className="text-orange-600">Required</span>}
            />
          )}
        </div>
      </QuickCard>

      {/* Context tags */}
      {(item.contextPhone || item.contextComputer || item.contextTravel || item.contextTimeMinutes) && (
        <QuickCard className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Context</h3>
          <div className="flex flex-wrap gap-2">
            {item.contextPhone && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                📱 Phone
              </span>
            )}
            {item.contextComputer && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                💻 Computer
              </span>
            )}
            {item.contextTravel && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                🚗 Travel
              </span>
            )}
            {item.contextTimeMinutes && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                ⏱️ {item.contextTimeMinutes}min
              </span>
            )}
          </div>
        </QuickCard>
      )}

      {/* Deliverable form - shown when assigned and can submit */}
      {permissions.isAssignedToUser && (permissions.canSubmitForVerification || permissions.canMarkComplete) && (
        <QuickCard className="mt-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700">
                  What was accomplished? {item.requiresDeliverable && <span className="text-red-500">*</span>}
                </h3>
                <span className="text-xs text-gray-500">{summary.trim().length}/30 min</span>
              </div>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe the work completed..."
                className={`w-full px-3 py-2 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  item.requiresDeliverable && summary.trim().length > 0 && summary.trim().length < 30
                    ? 'border-red-300'
                    : 'border-gray-300'
                }`}
                rows={6}
              />
              {item.requiresDeliverable && summary.trim().length > 0 && summary.trim().length < 30 && (
                <p className="text-xs text-red-500 mt-1">
                  {30 - summary.trim().length} more characters needed
                </p>
              )}
            </div>

            {/* Links section */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Related Links (optional)</h3>

              {links.length > 0 && (
                <div className="space-y-2 mb-3">
                  {links.map((link, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{link.title}</p>
                        <p className="text-gray-500 text-xs truncate">{link.url}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="text-red-500 text-xs hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="Link title"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddLink}
                    disabled={!newLinkUrl.trim() || !newLinkTitle.trim()}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {deliverableError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{deliverableError}</p>
              </div>
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
            {isSubmitting ? 'Claiming...' : '✋ Claim This Item'}
          </QuickButton>
        )}

        {permissions.canSubmitForVerification && (
          <QuickButton
            variant="primary"
            fullWidth
            onClick={handleSubmit}
            disabled={isSubmitting || (item.requiresDeliverable && !isSummaryValid)}
          >
            {isSubmitting ? 'Submitting...' : '📤 Submit for Verification'}
          </QuickButton>
        )}

        {permissions.canMarkComplete && (
          <QuickButton
            variant="success"
            fullWidth
            onClick={handleSubmit}
            disabled={isSubmitting || (item.requiresDeliverable && !isSummaryValid)}
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
            {isSubmitting ? 'Unclaiming...' : 'Unclaim Item'}
          </QuickButton>
        )}

        {!permissions.canClaim && !permissions.isAssignedToUser && item.assignee && (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">
              This item is already claimed by {item.assignee.name}
            </p>
          </div>
        )}
      </div>
    </QuickLayout>
  )
}
