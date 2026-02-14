'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { trpc } from '@/lib/trpc'
import { Stack, Flex, Text, Button, Badge, Loading, Textarea, useToast } from '@/components/ui'
import { ReactionBar } from './ReactionBar'
import { MessageComposer } from './MessageComposer'

// Helper to highlight @mentions in content
function highlightMentions(content: string): React.ReactNode[] {
  const mentionRegex = /@(\w+)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index))
    }

    // Add the highlighted mention
    parts.push(
      <span key={match.index} className="bg-blue-100 text-blue-700 rounded px-0.5">
        {match[0]}
      </span>
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex))
  }

  return parts.length > 0 ? parts : [content]
}

interface MessageListProps {
  bandId: string
  channelId: string
  userId: string | null
  userRole?: string
}

export function MessageList({ bandId, channelId, userId, userRole }: MessageListProps) {
  const utils = trpc.useUtils()
  const containerRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const PULL_THRESHOLD = 80

  const { data, isLoading, refetch } = trpc.message.list.useQuery(
    { channelId, userId: userId || '', limit: 100 },
    { enabled: !!channelId && !!userId }
  )

  const markAsReadMutation = trpc.message.markAsRead.useMutation({
    onSuccess: () => {
      // Invalidate channel list to update unread counts in sidebar
      utils.channel.list.invalidate({ bandId })
    },
  })

  // Mark channel as read when viewing
  useEffect(() => {
    if (channelId && userId) {
      markAsReadMutation.mutate({ channelId, userId })
    }
  }, [channelId, userId])

  // Set up polling for new messages
  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [refetch])

  // Pull-to-refresh handlers (mobile only)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0 && touchStartY.current > 0) {
      const distance = Math.max(0, e.touches[0].clientY - touchStartY.current)
      setPullDistance(Math.min(distance * 0.5, PULL_THRESHOLD * 1.5))
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      await refetch()
      setIsRefreshing(false)
    }
    setPullDistance(0)
    touchStartY.current = 0
  }, [pullDistance, isRefreshing, refetch])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loading message="Loading messages..." />
      </div>
    )
  }

  // Messages come from API newest first - keep that order
  const messages = data?.messages || []

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Text color="muted">No messages yet. Start the conversation!</Text>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 md:overflow-y-auto p-4 relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator (mobile only) */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="md:hidden absolute left-0 right-0 flex justify-center items-center transition-all z-10"
          style={{ top: -40 + pullDistance, height: 40 }}
        >
          <div className={`text-gray-500 text-sm ${isRefreshing ? 'animate-spin' : ''}`}>
            {isRefreshing ? '↻' : pullDistance >= PULL_THRESHOLD ? '↓ Release to refresh' : '↓ Pull to refresh'}
          </div>
        </div>
      )}
      <div style={{ transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 ? 'transform 0.2s' : 'none' }}>
        <Stack spacing="sm">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              bandId={bandId}
              channelId={channelId}
              message={message}
              userId={userId}
              userRole={userRole}
            />
          ))}
        </Stack>
      </div>
    </div>
  )
}

interface Reaction {
  emoji: string
  count: number
  includesMe: boolean
  users: { id: string; name: string }[]
}

interface MessageItemProps {
  bandId: string
  channelId: string
  message: {
    id: string
    content: string
    author: { id: string; name: string; email: string }
    isPinned: boolean
    isEdited: boolean
    editedAt: string | null
    replyCount: number
    createdAt: string
    reactions?: Reaction[]
  }
  userId: string | null
  userRole?: string
}

interface InlineReplyProps {
  reply: {
    id: string
    content: string
    author: { id: string; name: string }
    createdAt: string
    isEdited: boolean
    reactions?: Reaction[]
  }
  userId: string | null
  userRole?: string
  bandId: string
}

function InlineReply({ reply, userId, userRole, bandId }: InlineReplyProps) {
  const utils = trpc.useUtils()
  const isAuthor = reply.author.id === userId
  const canModerate = userRole && ['FOUNDER', 'GOVERNOR', 'MODERATOR'].includes(userRole)
  const canDelete = isAuthor || canModerate

  const deleteMutation = trpc.message.delete.useMutation({
    onSuccess: () => {
      utils.message.getThread.invalidate()
      utils.message.list.invalidate()
    },
  })

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="py-1">
      <Flex gap="sm" align="start">
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <Text variant="small" className="text-xs">
            {reply.author.name.charAt(0).toUpperCase()}
          </Text>
        </div>
        <div className="flex-1 min-w-0">
          <Flex gap="sm" align="center" className="flex-wrap">
            <Text variant="small" weight="semibold" className="truncate max-w-[120px] md:max-w-none">{reply.author.name}</Text>
            <Text variant="small" color="muted">{formatTime(reply.createdAt)}</Text>
            {reply.isEdited && <Text variant="small" color="muted">(edited)</Text>}
          </Flex>
          <Text variant="small" className="whitespace-pre-wrap break-words">
            {highlightMentions(reply.content)}
          </Text>
          <Flex gap="sm" align="center" className="mt-1">
            <ReactionBar
              messageId={reply.id}
              userId={userId}
              reactions={reply.reactions || []}
              compact
            />
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Delete this reply?')) {
                    deleteMutation.mutate({ messageId: reply.id, userId: userId! })
                  }
                }}
                className="min-h-[44px] md:min-h-0 px-3 md:px-2 text-red-600 text-xs"
              >
                Delete
              </Button>
            )}
          </Flex>
        </div>
      </Flex>
    </div>
  )
}

function MessageItem({ bandId, channelId, message, userId, userRole }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [isExpanded, setIsExpanded] = useState(false)
  const utils = trpc.useUtils()
  const { showToast } = useToast()

  // Fetch thread data when expanded
  const { data: threadData, refetch: refetchThread } = trpc.message.getThread.useQuery(
    { messageId: message.id, userId: userId || '', limit: 100 },
    { enabled: isExpanded && !!userId }
  )

  // Poll for new replies when expanded
  useEffect(() => {
    if (!isExpanded) return
    const interval = setInterval(() => refetchThread(), 5000)
    return () => clearInterval(interval)
  }, [isExpanded, refetchThread])

  const pinMutation = trpc.message.pin.useMutation({
    onSuccess: () => utils.message.list.invalidate(),
  })

  const unpinMutation = trpc.message.unpin.useMutation({
    onSuccess: () => utils.message.list.invalidate(),
  })

  const deleteMutation = trpc.message.delete.useMutation({
    onSuccess: () => {
      utils.message.list.invalidate()
      utils.channel.list.invalidate({ bandId })
    },
  })

  const editMutation = trpc.message.edit.useMutation({
    onSuccess: () => {
      utils.message.list.invalidate()
      setIsEditing(false)
      showToast('Message updated', 'success')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const isAuthor = message.author.id === userId
  const canModerate = userRole && ['FOUNDER', 'GOVERNOR', 'MODERATOR'].includes(userRole)
  const canPin = canModerate
  const canDelete = isAuthor || canModerate
  const canEdit = isAuthor

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handlePin = () => {
    if (!userId) return
    if (message.isPinned) {
      unpinMutation.mutate({ messageId: message.id, userId })
    } else {
      pinMutation.mutate({ messageId: message.id, userId })
    }
  }

  const handleDelete = () => {
    if (!userId || !confirm('Delete this message?')) return
    deleteMutation.mutate({ messageId: message.id, userId })
  }

  const handleStartEdit = () => {
    setEditContent(message.content)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  const handleSaveEdit = () => {
    if (!userId || !editContent.trim()) return
    editMutation.mutate({
      messageId: message.id,
      userId,
      content: editContent.trim(),
    })
  }

  return (
    <div className={`group relative p-3 rounded-lg hover:bg-gray-50 ${message.isPinned ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}>
      {message.isPinned && (
        <div className="absolute -top-2 left-2">
          <Badge variant="warning">Pinned</Badge>
        </div>
      )}

      <Flex gap="md" align="start">
        {/* Avatar placeholder */}
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
          <Text variant="small" weight="semibold">
            {message.author.name.charAt(0).toUpperCase()}
          </Text>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <Flex gap="sm" align="center" className="mb-1">
            <Text weight="semibold">{message.author.name}</Text>
            <Text variant="small" color="muted">{formatTime(message.createdAt)}</Text>
            {message.isEdited && (
              <Text variant="small" color="muted">(edited)</Text>
            )}
          </Flex>

          {/* Content - Edit mode or Display mode */}
          {isEditing ? (
            <Stack spacing="sm">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full"
              />
              <Flex gap="sm">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={editMutation.isPending || !editContent.trim()}
                >
                  {editMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </Flex>
            </Stack>
          ) : (
            <Text className="whitespace-pre-wrap break-words">
              {highlightMentions(message.content)}
            </Text>
          )}

          {/* Reactions & Actions - single row */}
          {!isEditing && (
            <Flex gap="sm" align="center" className="mt-1 flex-wrap">
              <ReactionBar
                messageId={message.id}
                userId={userId}
                reactions={message.reactions || []}
              />
              {/* Action buttons with mobile-friendly touch targets (44px min) */}
              <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="min-h-[44px] md:min-h-0 px-3 md:px-2">
                💬 {message.replyCount > 0 ? `${message.replyCount} replies` : 'Reply'}
                {isExpanded ? ' ▲' : ''}
              </Button>
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={handleStartEdit} className="min-h-[44px] md:min-h-0 px-3 md:px-2">
                  ✏️ Edit
                </Button>
              )}
              {canPin && (
                <Button variant="ghost" size="sm" onClick={handlePin} className="min-h-[44px] md:min-h-0 px-3 md:px-2">
                  {message.isPinned ? '📌 Unpin' : '📌 Pin'}
                </Button>
              )}
              {canDelete && (
                <Button variant="ghost" size="sm" onClick={handleDelete} className="min-h-[44px] md:min-h-0 px-3 md:px-2 text-red-600">
                  🗑️ Delete
                </Button>
              )}
            </Flex>
          )}

          {/* Inline Thread Expansion - reduced indent on mobile */}
          {isExpanded && (
            <div className="mt-2 ml-2 pl-2 md:ml-6 md:pl-4 border-l-2 border-gray-200">
              {/* Replies */}
              <Stack spacing="xs">
                {threadData?.replies?.length === 0 ? (
                  <Text variant="small" color="muted" className="py-2">
                    No replies yet
                  </Text>
                ) : (
                  threadData?.replies?.map((reply) => (
                    <InlineReply
                      key={reply.id}
                      reply={reply}
                      userId={userId}
                      userRole={userRole}
                      bandId={bandId}
                    />
                  ))
                )}
              </Stack>

              {/* Compact Reply Composer */}
              <div className="mt-2">
                <MessageComposer
                  channelId={channelId}
                  userId={userId}
                  threadId={message.id}
                  placeholder="Reply..."
                  onMessageSent={() => refetchThread()}
                />
              </div>
            </div>
          )}
        </div>
      </Flex>
    </div>
  )
}
