'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import { ADMIN_CONFIG } from '@band-it/shared'
import {
  Heading,
  Text,
  Stack,
  Button,
  Flex,
  Card,
  Badge,
  Loading,
  PageWrapper,
  DashboardContainer,
  useToast,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { FeedbackButton } from '@/components/feedback'
import { Suspense } from 'react'

type FeedbackCategory = 'BUG' | 'FEATURE' | 'COMMENT'
type FeedbackStatus = 'OPEN' | 'IN_PROGRESS' | 'FIXED' | 'WONT_FIX' | 'DUPLICATE'
type SortBy = 'newest' | 'oldest' | 'most_votes'

function FeedbackPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(searchParams.get('id'))
  const [category, setCategory] = useState<FeedbackCategory | undefined>(undefined)
  const [status, setStatus] = useState<FeedbackStatus | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [mySubmissionsOnly, setMySubmissionsOnly] = useState(false)
  const utils = trpc.useUtils()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const email = localStorage.getItem('userEmail')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
        setUserEmail(email)
      } catch (error) {
        console.error('Invalid token:', error)
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const isAdmin = ADMIN_CONFIG.isAdmin(userEmail)

  const { data: feedbackData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = trpc.feedback.list.useInfiniteQuery(
    {
      category,
      status,
      search: search || undefined,
      sortBy,
      mySubmissions: mySubmissionsOnly,
      userId: userId!,
      limit: 20,
    },
    {
      enabled: !!userId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  )

  const voteMutation = trpc.feedback.vote.useMutation({
    onSuccess: () => {
      utils.feedback.list.invalidate()
    },
  })

  const deleteOwnMutation = trpc.feedback.deleteOwn.useMutation({
    onSuccess: () => {
      showToast('Feedback deleted', 'success')
      utils.feedback.list.invalidate()
      setExpandedId(null)
    },
    onError: (error) => {
      showToast(error.message || 'Failed to delete', 'error')
    },
  })

  // Admin mutations
  const updateStatusMutation = trpc.feedback.updateStatus.useMutation({
    onSuccess: () => {
      showToast('Status updated', 'success')
      utils.feedback.list.invalidate()
    },
    onError: (error) => {
      showToast(error.message || 'Failed to update status', 'error')
    },
  })

  const respondMutation = trpc.feedback.respond.useMutation({
    onSuccess: () => {
      showToast('Response saved', 'success')
      utils.feedback.list.invalidate()
    },
    onError: (error) => {
      showToast(error.message || 'Failed to save response', 'error')
    },
  })

  const adminDeleteMutation = trpc.feedback.delete.useMutation({
    onSuccess: () => {
      showToast('Feedback deleted', 'success')
      utils.feedback.list.invalidate()
      setExpandedId(null)
    },
    onError: (error) => {
      showToast(error.message || 'Failed to delete', 'error')
    },
  })

  const handleVote = (feedbackId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId) return
    voteMutation.mutate({ feedbackId, userId })
  }

  const handleDeleteOwn = (feedbackId: string) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this feedback?')) {
      deleteOwnMutation.mutate({ feedbackId, userId })
    }
  }

  const handleStatusChange = (feedbackId: string, newStatus: FeedbackStatus) => {
    if (!userEmail) return
    updateStatusMutation.mutate({ feedbackId, status: newStatus, userEmail })
  }

  const handleAdminDelete = (feedbackId: string) => {
    if (!userEmail) return
    if (confirm('Are you sure you want to delete this feedback?')) {
      adminDeleteMutation.mutate({ feedbackId, userEmail })
    }
  }

  if (!userId) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer>
          <Loading message="Loading..." />
        </DashboardContainer>
      </PageWrapper>
    )
  }

  const allItems = feedbackData?.pages.flatMap(page => page.items) || []

  const getCategoryEmoji = (cat: FeedbackCategory) => {
    switch (cat) {
      case 'BUG': return ''
      case 'FEATURE': return ''
      case 'COMMENT': return ''
    }
  }

  const getStatusColor = (s: FeedbackStatus): 'info' | 'warning' | 'success' | 'danger' | 'neutral' => {
    switch (s) {
      case 'OPEN': return 'info'
      case 'IN_PROGRESS': return 'warning'
      case 'FIXED': return 'success'
      case 'WONT_FIX': return 'danger'
      case 'DUPLICATE': return 'neutral'
    }
  }

  const statusOptions: FeedbackStatus[] = ['OPEN', 'IN_PROGRESS', 'FIXED', 'WONT_FIX', 'DUPLICATE']
  const categoryOptions: FeedbackCategory[] = ['BUG', 'FEATURE', 'COMMENT']

  return (
    <PageWrapper variant="dashboard">
      <AppNav />
      <DashboardContainer>
        <Stack spacing="xl">
          {/* Header */}
          <Flex justify="between" align="center" wrap>
            <Stack spacing="sm">
              <Flex gap="sm" align="center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/user-dashboard')}
                  className="md:hidden -ml-2"
                >
                  ← Back
                </Button>
                <Heading level={1}>Feedback & Suggestions</Heading>
              </Flex>
              <Text color="muted">Help us improve Band It by sharing your ideas and reporting issues</Text>
            </Stack>
            <FeedbackButton className="ml-auto" />
          </Flex>

          {/* Filters */}
          <Card>
            <Stack spacing="md">
              {/* Search */}
              <div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search feedback..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Flex gap="md" wrap>
                {/* Category Filter */}
                <select
                  value={category || ''}
                  onChange={(e) => setCategory(e.target.value as FeedbackCategory || undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categoryOptions.map(cat => (
                    <option key={cat} value={cat}>{getCategoryEmoji(cat)} {cat}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={status || ''}
                  onChange={(e) => setStatus(e.target.value as FeedbackStatus || undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="most_votes">Most Votes</option>
                </select>

                {/* My Submissions Toggle */}
                <Button
                  variant={mySubmissionsOnly ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setMySubmissionsOnly(!mySubmissionsOnly)}
                >
                  {mySubmissionsOnly ? 'My Submissions' : 'All Feedback'}
                </Button>
              </Flex>
            </Stack>
          </Card>

          {/* Feedback List */}
          {isLoading ? (
            <Loading message="Loading feedback..." />
          ) : allItems.length > 0 ? (
            <Stack spacing="md">
              {allItems.map((item: any) => {
                const isExpanded = expandedId === item.id
                const isOwner = item.submittedById === userId
                const canDelete = isOwner && item.status === 'OPEN'

                return (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <Stack spacing="md">
                      {/* Card Header */}
                      <Flex justify="between" align="start">
                        <Stack spacing="sm" className="flex-1">
                          <Flex gap="sm" align="center" wrap>
                            <Text weight="semibold" className="text-lg">
                              {getCategoryEmoji(item.category)} {item.title}
                            </Text>
                            <Badge variant={getStatusColor(item.status)}>
                              {item.status.replace('_', ' ')}
                            </Badge>
                            {isOwner && (
                              <Badge variant="info">Your submission</Badge>
                            )}
                          </Flex>
                          <Flex gap="md" align="center">
                            <Text variant="small" color="muted">
                              by {item.submittedBy?.name || 'Unknown'} on {new Date(item.createdAt).toLocaleDateString()}
                            </Text>
                          </Flex>
                        </Stack>

                        {/* Vote button */}
                        <Button
                          variant={item.hasVoted ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={(e) => handleVote(item.id, e)}
                          disabled={voteMutation.isPending}
                        >
                          {item.hasVoted ? 'Voted' : 'Vote'} ({item.voteCount})
                        </Button>
                      </Flex>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <Stack spacing="md" className="pt-4 border-t">
                          {/* Description */}
                          <div>
                            <Text variant="small" weight="semibold" className="mb-2">Description</Text>
                            <Text className="whitespace-pre-wrap">{item.description}</Text>
                          </div>

                          {/* Attachments */}
                          {item.attachments && item.attachments.length > 0 && (
                            <div>
                              <Text variant="small" weight="semibold" className="mb-2">Attachments</Text>
                              <Flex gap="sm" wrap>
                                {item.attachments.map((file: any) => (
                                  <a
                                    key={file.id}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {file.originalName}
                                  </a>
                                ))}
                              </Flex>
                            </div>
                          )}

                          {/* Admin Response */}
                          {item.adminResponse && (
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <Flex gap="sm" align="center" className="mb-2">
                                <Text variant="small" weight="semibold">Official Response</Text>
                                {item.respondedBy && (
                                  <Text variant="tiny" color="muted">
                                    by {item.respondedBy.name} on {new Date(item.respondedAt).toLocaleDateString()}
                                  </Text>
                                )}
                              </Flex>
                              <Text className="whitespace-pre-wrap">{item.adminResponse}</Text>
                            </div>
                          )}

                          {/* Duplicate Info */}
                          {item.duplicateOf && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <Text variant="small" color="muted">
                                Duplicate of: {item.duplicateOf.title}
                              </Text>
                            </div>
                          )}

                          {/* Actions */}
                          <Flex gap="sm" justify="end">
                            {/* Owner can delete while OPEN */}
                            {canDelete && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteOwn(item.id)
                                }}
                                disabled={deleteOwnMutation.isPending}
                              >
                                Delete
                              </Button>
                            )}

                            {/* Admin Controls */}
                            {isAdmin && (
                              <>
                                <select
                                  value={item.status}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    handleStatusChange(item.id, e.target.value as FeedbackStatus)
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                                >
                                  {statusOptions.map(s => (
                                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                  ))}
                                </select>

                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleAdminDelete(item.id)
                                  }}
                                  disabled={adminDeleteMutation.isPending}
                                >
                                  Admin Delete
                                </Button>
                              </>
                            )}
                          </Flex>
                        </Stack>
                      )}
                    </Stack>
                  </Card>
                )
              })}

              {/* Load More */}
              {hasNextPage && (
                <Flex justify="center">
                  <Button
                    variant="secondary"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                  </Button>
                </Flex>
              )}
            </Stack>
          ) : (
            <Card>
              <Stack spacing="md" align="center" className="py-8">
                <Text color="muted">
                  {search || category || status || mySubmissionsOnly
                    ? 'No feedback matches your filters'
                    : 'No feedback yet. Be the first to share your thoughts!'}
                </Text>
              </Stack>
            </Card>
          )}
        </Stack>
      </DashboardContainer>
    </PageWrapper>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <PageWrapper variant="dashboard">
        <Loading message="Loading..." />
      </PageWrapper>
    }>
      <FeedbackPageContent />
    </Suspense>
  )
}
