'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Text,
  Stack,
  Card,
  Loading,
  Alert,
  AdminLayout,
  Flex,
  Badge,
  Button,
  Modal,
  Select,
  Textarea
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

type FlaggedContentStatus = 'PENDING' | 'APPROVED' | 'REMOVED' | 'WARNED'
type FlaggedContentType = 'PROPOSAL' | 'COMMENT' | 'TASK'
type ActionType = 'DISMISS' | 'REMOVE' | 'WARN_USER' | 'SUSPEND_USER' | 'BAN_USER'
type AppealStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'DENIED'
type ViewMode = 'flagged' | 'appeals'

export default function AdminModerationPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('flagged')
  const [statusFilter, setStatusFilter] = useState<FlaggedContentStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<FlaggedContentType | ''>('')
  const [page, setPage] = useState(1)
  const [appealsPage, setAppealsPage] = useState(1)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const utils = trpc.useUtils()

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{ open: boolean; item: any }>({ open: false, item: null })
  const [reviewAction, setReviewAction] = useState<ActionType>('DISMISS')
  const [reviewNotes, setReviewNotes] = useState('')
  const [suspensionDays, setSuspensionDays] = useState(7)

  // Appeal review modal state
  const [appealModal, setAppealModal] = useState<{ open: boolean; item: any }>({ open: false, item: null })
  const [appealDecision, setAppealDecision] = useState<'approve' | 'deny'>('deny')
  const [appealNotes, setAppealNotes] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const { data: profileData, isLoading: profileLoading } = trpc.auth.getProfile.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: statsData } = trpc.admin.getFlaggedContentStats.useQuery(
    { adminUserId: userId! },
    { enabled: !!userId && profileData?.user?.isAdmin }
  )

  const { data: flaggedData, isLoading: flaggedLoading } = trpc.admin.getFlaggedContent.useQuery(
    {
      adminUserId: userId!,
      status: statusFilter || undefined,
      contentType: typeFilter || undefined,
      page,
      limit: 20,
    },
    { enabled: !!userId && profileData?.user?.isAdmin }
  )

  const { data: appealsData, isLoading: appealsLoading } = trpc.admin.getPendingAppeals.useQuery(
    {
      adminUserId: userId!,
      page: appealsPage,
      limit: 20,
    },
    { enabled: !!userId && profileData?.user?.isAdmin && viewMode === 'appeals' }
  )

  const reviewMutation = trpc.admin.reviewFlaggedContent.useMutation({
    onSuccess: () => {
      utils.admin.getFlaggedContent.invalidate()
      utils.admin.getFlaggedContentStats.invalidate()
      setReviewModal({ open: false, item: null })
      resetReviewForm()
    },
  })

  const bulkDismissMutation = trpc.admin.bulkDismissFlaggedContent.useMutation({
    onSuccess: (data) => {
      utils.admin.getFlaggedContent.invalidate()
      utils.admin.getFlaggedContentStats.invalidate()
      setSelectedItems([])
      alert(`Dismissed ${data.dismissed} items`)
    },
  })

  const reviewAppealMutation = trpc.admin.reviewAppeal.useMutation({
    onSuccess: () => {
      utils.admin.getPendingAppeals.invalidate()
      utils.admin.getFlaggedContent.invalidate()
      utils.admin.getFlaggedContentStats.invalidate()
      setAppealModal({ open: false, item: null })
      resetAppealForm()
    },
  })

  const resetAppealForm = () => {
    setAppealDecision('deny')
    setAppealNotes('')
  }

  const resetReviewForm = () => {
    setReviewAction('DISMISS')
    setReviewNotes('')
    setSuspensionDays(7)
  }

  const openReviewModal = (item: any) => {
    setReviewModal({ open: true, item })
    resetReviewForm()
  }

  const handleReview = () => {
    if (!reviewModal.item) return
    reviewMutation.mutate({
      adminUserId: userId!,
      flaggedContentId: reviewModal.item.id,
      action: reviewAction,
      reviewNotes: reviewNotes || undefined,
      suspensionDays: reviewAction === 'SUSPEND_USER' ? suspensionDays : undefined,
    })
  }

  const handleBulkDismiss = () => {
    if (selectedItems.length === 0) return
    if (!confirm(`Dismiss ${selectedItems.length} selected items?`)) return
    bulkDismissMutation.mutate({
      adminUserId: userId!,
      flaggedContentIds: selectedItems,
    })
  }

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (!flaggedData?.items) return
    const pendingItems = flaggedData.items.filter((i: any) => i.status === 'PENDING')
    if (selectedItems.length === pendingItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(pendingItems.map((i: any) => i.id))
    }
  }

  const openAppealModal = (item: any) => {
    setAppealModal({ open: true, item })
    resetAppealForm()
  }

  const handleAppealReview = () => {
    if (!appealModal.item) return
    reviewAppealMutation.mutate({
      adminUserId: userId!,
      flaggedContentId: appealModal.item.id,
      decision: appealDecision === 'approve' ? 'APPROVED' : 'DENIED',
      reviewNotes: appealNotes || undefined,
    })
  }

  if (profileLoading) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Moderation Queue" subtitle="Loading...">
          <Loading message="Checking permissions..." />
        </AdminLayout>
      </>
    )
  }

  if (!profileData?.user?.isAdmin) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Access Denied">
          <Alert variant="danger">
            <Text>You do not have permission to access the admin area.</Text>
          </Alert>
        </AdminLayout>
      </>
    )
  }

  const getStatusBadge = (status: FlaggedContentStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>
      case 'REMOVED':
        return <Badge variant="danger">Removed</Badge>
      case 'WARNED':
        return <Badge variant="info">Warned</Badge>
      default:
        return null
    }
  }

  const getTypeBadge = (type: FlaggedContentType) => {
    switch (type) {
      case 'PROPOSAL':
        return <Badge variant="info">Proposal</Badge>
      case 'COMMENT':
        return <Badge variant="neutral">Comment</Badge>
      case 'TASK':
        return <Badge variant="info">Task</Badge>
      default:
        return null
    }
  }

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'HIGH':
        return <Badge variant="success">High Confidence</Badge>
      case 'MEDIUM':
        return <Badge variant="warning">Medium Confidence</Badge>
      case 'LOW':
        return <Badge variant="danger">Low Confidence</Badge>
      default:
        return <Badge variant="neutral">{confidence}</Badge>
    }
  }

  const getAppealStatusBadge = (appealStatus: AppealStatus) => {
    switch (appealStatus) {
      case 'PENDING':
        return <Badge variant="warning">Appeal Pending</Badge>
      case 'APPROVED':
        return <Badge variant="success">Appeal Approved</Badge>
      case 'DENIED':
        return <Badge variant="danger">Appeal Denied</Badge>
      default:
        return null
    }
  }

  return (
    <>
      <AppNav />
      <AdminLayout pageTitle="Moderation Queue" subtitle="Review flagged content">
        <Stack spacing="lg">
          {/* View Mode Tabs */}
          <Flex gap="sm">
            <Button
              variant={viewMode === 'flagged' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('flagged')}
            >
              Flagged Content
              {statsData?.pending ? ` (${statsData.pending})` : ''}
            </Button>
            <Button
              variant={viewMode === 'appeals' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('appeals')}
            >
              Appeals
              {appealsData?.total ? ` (${appealsData.total})` : ''}
            </Button>
          </Flex>

          {/* Stats Cards */}
          {statsData && viewMode === 'flagged' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="text-center py-4">
                <Text variant="small" color="muted">Pending Review</Text>
                <Text weight="bold" className="text-2xl text-yellow-600">
                  {statsData.pending}
                </Text>
              </Card>
              <Card className="text-center py-4">
                <Text variant="small" color="muted">Approved</Text>
                <Text weight="bold" className="text-2xl text-green-600">
                  {statsData.approved}
                </Text>
              </Card>
              <Card className="text-center py-4">
                <Text variant="small" color="muted">Removed</Text>
                <Text weight="bold" className="text-2xl text-red-600">
                  {statsData.removed}
                </Text>
              </Card>
              <Card className="text-center py-4">
                <Text variant="small" color="muted">Warned</Text>
                <Text weight="bold" className="text-2xl text-blue-600">
                  {statsData.warned}
                </Text>
              </Card>
            </div>
          )}

          {/* Filters & Actions - only show for flagged content view */}
          {viewMode === 'flagged' && (
            <Flex gap="md" justify="between" className="flex-wrap">
              <Flex gap="sm" className="flex-wrap">
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any)
                    setPage(1)
                  }}
                  className="w-36"
                >
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REMOVED">Removed</option>
                  <option value="WARNED">Warned</option>
                </Select>
                <Select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value as any)
                    setPage(1)
                  }}
                  className="w-36"
                >
                  <option value="">All Types</option>
                  <option value="PROPOSAL">Proposals</option>
                  <option value="COMMENT">Comments</option>
                  <option value="TASK">Tasks</option>
                </Select>
              </Flex>
              {selectedItems.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkDismiss}
                  disabled={bulkDismissMutation.isPending}
                >
                  {bulkDismissMutation.isPending ? 'Dismissing...' : `Dismiss ${selectedItems.length} Selected`}
                </Button>
              )}
            </Flex>
          )}

          {/* Content List - Flagged Content View */}
          {viewMode === 'flagged' && (flaggedLoading ? (
            <Loading message="Loading flagged content..." />
          ) : flaggedData?.items && flaggedData.items.length > 0 ? (
            <Card>
              {/* Select All Header */}
              {flaggedData.items.some((i: any) => i.status === 'PENDING') && (
                <Flex justify="between" align="center" className="pb-3 border-b border-gray-100">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        selectedItems.length > 0 &&
                        selectedItems.length === flaggedData.items.filter((i: any) => i.status === 'PENDING').length
                      }
                      onChange={toggleSelectAll}
                    />
                    Select all pending
                  </label>
                  <Text variant="small" color="muted">
                    {flaggedData.total} total items
                  </Text>
                </Flex>
              )}

              <div className="divide-y divide-gray-100">
                {flaggedData.items.map((item: any) => (
                  <div key={item.id} className="py-4">
                    <Flex justify="between" align="start" gap="md">
                      <Flex gap="sm" align="start">
                        {item.status === 'PENDING' && (
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => toggleSelectItem(item.id)}
                            className="mt-1"
                          />
                        )}
                        <Stack spacing="sm">
                          <Flex gap="sm" align="center" className="flex-wrap">
                            {getTypeBadge(item.contentType)}
                            {getStatusBadge(item.status)}
                            {getConfidenceBadge(item.confidence || 'HIGH')}
                            {item.categories?.map((cat: string) => (
                              <Badge key={cat} variant="neutral">{cat}</Badge>
                            ))}
                            {!item.canAppeal && (
                              <Badge variant="danger">No Appeals</Badge>
                            )}
                            {item.appealStatus && item.appealStatus !== 'NONE' && getAppealStatusBadge(item.appealStatus)}
                          </Flex>

                          {/* Content Preview */}
                          <div className="bg-gray-50 rounded p-3 max-w-2xl">
                            <Text variant="small" className="whitespace-pre-wrap break-words line-clamp-4">
                              {item.contentText}
                            </Text>
                          </div>

                          {/* Matched Terms */}
                          <Flex gap="sm" align="center" className="flex-wrap">
                            <Text variant="small" color="muted">Matched:</Text>
                            {item.matchedTerms?.map((term: string) => (
                              <Badge key={term} variant="danger">{term}</Badge>
                            ))}
                          </Flex>

                          {/* Author & Meta */}
                          <Flex gap="md" className="flex-wrap">
                            <Text variant="small" color="muted">
                              By: {item.author?.name || 'Unknown'} ({item.author?.email})
                              {item.author?.warningCount > 0 && (
                                <span className="text-yellow-600 ml-1">
                                  ({item.author.warningCount} warning{item.author.warningCount !== 1 ? 's' : ''})
                                </span>
                              )}
                            </Text>
                            <Text variant="small" color="muted">
                              {new Date(item.createdAt).toLocaleString()}
                            </Text>
                          </Flex>

                          {/* Review Info (if reviewed) */}
                          {item.reviewedBy && (
                            <Text variant="small" color="muted">
                              Reviewed by {item.reviewedBy.name} on {new Date(item.reviewedAt).toLocaleString()}
                              {item.actionTaken && (
                                <span> - Action: <strong>{item.actionTaken.replace('_', ' ')}</strong></span>
                              )}
                            </Text>
                          )}
                          {item.reviewNotes && (
                            <Text variant="small" color="muted" className="italic">
                              Notes: {item.reviewNotes}
                            </Text>
                          )}
                        </Stack>
                      </Flex>

                      {/* Actions */}
                      {item.status === 'PENDING' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openReviewModal(item)}
                        >
                          Review
                        </Button>
                      )}
                    </Flex>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {flaggedData.pages > 1 && (
                <Flex justify="center" gap="sm" className="pt-4 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Text variant="small" color="muted" className="py-2">
                    Page {page} of {flaggedData.pages}
                  </Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.min(flaggedData.pages, p + 1))}
                    disabled={page === flaggedData.pages}
                  >
                    Next
                  </Button>
                </Flex>
              )}
            </Card>
          ) : (
            <Alert variant="info">
              <Text>No flagged content{statusFilter ? ` with status "${statusFilter}"` : ''}{typeFilter ? ` of type "${typeFilter}"` : ''}.</Text>
              <Text variant="small" className="mt-2">
                Content matching WARN-level blocked terms will appear here for review.
              </Text>
            </Alert>
          ))}

          {/* Appeals View */}
          {viewMode === 'appeals' && (appealsLoading ? (
            <Loading message="Loading appeals..." />
          ) : appealsData?.items && appealsData.items.length > 0 ? (
            <Card>
              <div className="divide-y divide-gray-100">
                {appealsData.items.map((item: any) => (
                  <div key={item.id} className="py-4">
                    <Flex justify="between" align="start" gap="md">
                      <Stack spacing="sm">
                        <Flex gap="sm" align="center" className="flex-wrap">
                          {getTypeBadge(item.contentType)}
                          <Badge variant="warning">Appeal Pending</Badge>
                          {getConfidenceBadge(item.confidence || 'HIGH')}
                          {item.categories?.map((cat: string) => (
                            <Badge key={cat} variant="neutral">{cat}</Badge>
                          ))}
                        </Flex>

                        {/* Content Preview */}
                        <div className="bg-gray-50 rounded p-3 max-w-2xl">
                          <Text variant="small" className="whitespace-pre-wrap break-words line-clamp-4">
                            {item.contentText}
                          </Text>
                        </div>

                        {/* Matched Terms */}
                        <Flex gap="sm" align="center" className="flex-wrap">
                          <Text variant="small" color="muted">Matched:</Text>
                          {item.matchedTerms?.map((term: string) => (
                            <Badge key={term} variant="danger">{term}</Badge>
                          ))}
                        </Flex>

                        {/* Appeal Reason */}
                        <div className="bg-blue-50 rounded p-3 max-w-2xl border border-blue-200">
                          <Text variant="small" weight="semibold" className="text-blue-800 mb-1">
                            Appeal Reason:
                          </Text>
                          <Text variant="small" className="text-blue-700 whitespace-pre-wrap">
                            {item.appealReason || 'No reason provided'}
                          </Text>
                        </div>

                        {/* Author & Meta */}
                        <Flex gap="md" className="flex-wrap">
                          <Text variant="small" color="muted">
                            By: {item.author?.name || 'Unknown'} ({item.author?.email})
                          </Text>
                          <Text variant="small" color="muted">
                            Flagged: {new Date(item.createdAt).toLocaleString()}
                          </Text>
                          <Text variant="small" color="muted">
                            Appealed: {new Date(item.appealedAt).toLocaleString()}
                          </Text>
                        </Flex>
                      </Stack>

                      {/* Actions */}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openAppealModal(item)}
                      >
                        Review Appeal
                      </Button>
                    </Flex>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {appealsData.pages > 1 && (
                <Flex justify="center" gap="sm" className="pt-4 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAppealsPage(p => Math.max(1, p - 1))}
                    disabled={appealsPage === 1}
                  >
                    Previous
                  </Button>
                  <Text variant="small" color="muted" className="py-2">
                    Page {appealsPage} of {appealsData.pages}
                  </Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAppealsPage(p => Math.min(appealsData.pages, p + 1))}
                    disabled={appealsPage === appealsData.pages}
                  >
                    Next
                  </Button>
                </Flex>
              )}
            </Card>
          ) : (
            <Alert variant="info">
              <Text>No pending appeals.</Text>
              <Text variant="small" className="mt-2">
                When users appeal flagged content, their appeals will appear here for review.
              </Text>
            </Alert>
          ))}
        </Stack>

        {/* Review Modal */}
        <Modal
          isOpen={reviewModal.open}
          onClose={() => {
            setReviewModal({ open: false, item: null })
            resetReviewForm()
          }}
        >
          {reviewModal.item && (
            <Stack spacing="md">
              <Text weight="bold" className="text-lg">Review Flagged Content</Text>
              {/* Content Preview */}
              <div>
                <Text variant="small" weight="semibold" className="mb-1">Content:</Text>
                <div className="bg-gray-50 rounded p-3 max-h-40 overflow-y-auto">
                  <Text variant="small" className="whitespace-pre-wrap break-words">
                    {reviewModal.item.contentText}
                  </Text>
                </div>
              </div>

              {/* Author Info */}
              <div>
                <Text variant="small" weight="semibold" className="mb-1">Author:</Text>
                <Text variant="small">
                  {reviewModal.item.author?.name} ({reviewModal.item.author?.email})
                </Text>
                {reviewModal.item.author?.warningCount > 0 && (
                  <Text variant="small" className="text-yellow-600">
                    Current warnings: {reviewModal.item.author.warningCount}
                  </Text>
                )}
              </div>

              {/* Matched Terms */}
              <div>
                <Text variant="small" weight="semibold" className="mb-1">Matched Terms:</Text>
                <Flex gap="sm" className="flex-wrap">
                  {reviewModal.item.matchedTerms?.map((term: string) => (
                    <Badge key={term} variant="danger">{term}</Badge>
                  ))}
                </Flex>
              </div>

              {/* Action Selection */}
              <Select
                label="Action"
                value={reviewAction}
                onChange={(e) => setReviewAction(e.target.value as ActionType)}
              >
                <option value="DISMISS">Dismiss (false positive, no action)</option>
                <option value="REMOVE">Remove Content</option>
                <option value="WARN_USER">Warn User</option>
                <option value="SUSPEND_USER">Suspend User</option>
                <option value="BAN_USER">Ban User</option>
              </Select>

              {reviewAction === 'SUSPEND_USER' && (
                <Select
                  label="Suspension Duration"
                  value={suspensionDays.toString()}
                  onChange={(e) => setSuspensionDays(parseInt(e.target.value))}
                >
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                </Select>
              )}

              <Textarea
                label="Notes (optional)"
                placeholder="Add any notes about this review..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
              />

              {/* Warning for severe actions */}
              {(reviewAction === 'SUSPEND_USER' || reviewAction === 'BAN_USER') && (
                <Alert variant="warning">
                  <Text variant="small">
                    {reviewAction === 'BAN_USER'
                      ? 'This will permanently ban the user from the platform.'
                      : `This will suspend the user for ${suspensionDays} day${suspensionDays !== 1 ? 's' : ''}.`}
                  </Text>
                </Alert>
              )}

              <Flex gap="sm" justify="end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setReviewModal({ open: false, item: null })
                    resetReviewForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={reviewAction === 'DISMISS' ? 'secondary' : reviewAction === 'BAN_USER' ? 'danger' : 'primary'}
                  onClick={handleReview}
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? 'Processing...' : 'Submit Review'}
                </Button>
              </Flex>

              {reviewMutation.error && (
                <Alert variant="danger">
                  <Text variant="small">{reviewMutation.error.message}</Text>
                </Alert>
              )}
            </Stack>
          )}
        </Modal>

        {/* Appeal Review Modal */}
        <Modal
          isOpen={appealModal.open}
          onClose={() => {
            setAppealModal({ open: false, item: null })
            resetAppealForm()
          }}
        >
          {appealModal.item && (
            <Stack spacing="md">
              <Text weight="bold" className="text-lg">Review Appeal</Text>

              {/* Content Preview */}
              <div>
                <Text variant="small" weight="semibold" className="mb-1">Flagged Content:</Text>
                <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto">
                  <Text variant="small" className="whitespace-pre-wrap break-words">
                    {appealModal.item.contentText}
                  </Text>
                </div>
              </div>

              {/* Matched Terms */}
              <div>
                <Text variant="small" weight="semibold" className="mb-1">Matched Terms:</Text>
                <Flex gap="sm" className="flex-wrap">
                  {appealModal.item.matchedTerms?.map((term: string) => (
                    <Badge key={term} variant="danger">{term}</Badge>
                  ))}
                </Flex>
              </div>

              {/* Appeal Reason */}
              <div>
                <Text variant="small" weight="semibold" className="mb-1">User&apos;s Appeal Reason:</Text>
                <div className="bg-blue-50 rounded p-3 border border-blue-200">
                  <Text variant="small" className="text-blue-700 whitespace-pre-wrap">
                    {appealModal.item.appealReason || 'No reason provided'}
                  </Text>
                </div>
              </div>

              {/* Author Info */}
              <div>
                <Text variant="small" weight="semibold" className="mb-1">Author:</Text>
                <Text variant="small">
                  {appealModal.item.author?.name} ({appealModal.item.author?.email})
                </Text>
              </div>

              {/* Decision Selection */}
              <Select
                label="Decision"
                value={appealDecision}
                onChange={(e) => setAppealDecision(e.target.value as 'approve' | 'deny')}
              >
                <option value="deny">Deny Appeal (keep content flagged)</option>
                <option value="approve">Approve Appeal (clear flag)</option>
              </Select>

              <Textarea
                label="Review Notes (optional)"
                placeholder="Add notes about this appeal decision..."
                value={appealNotes}
                onChange={(e) => setAppealNotes(e.target.value)}
                rows={3}
              />

              {appealDecision === 'approve' && (
                <Alert variant="info">
                  <Text variant="small">
                    Approving this appeal will remove the flag from this content. The content will remain visible.
                  </Text>
                </Alert>
              )}

              <Flex gap="sm" justify="end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAppealModal({ open: false, item: null })
                    resetAppealForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={appealDecision === 'approve' ? 'success' : 'danger'}
                  onClick={handleAppealReview}
                  disabled={reviewAppealMutation.isPending}
                >
                  {reviewAppealMutation.isPending
                    ? 'Processing...'
                    : appealDecision === 'approve'
                      ? 'Approve Appeal'
                      : 'Deny Appeal'}
                </Button>
              </Flex>

              {reviewAppealMutation.error && (
                <Alert variant="danger">
                  <Text variant="small">{reviewAppealMutation.error.message}</Text>
                </Alert>
              )}
            </Stack>
          )}
        </Modal>
      </AdminLayout>
    </>
  )
}
