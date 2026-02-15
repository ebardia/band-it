'use client'

import { useRef, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { Stack, Flex, Text, Button, Loading } from '@/components/ui'
import { MessageComposer } from './MessageComposer'
import { ReactionBar } from './ReactionBar'

// Helper to highlight @mentions in content
function highlightMentions(content: string): React.ReactNode[] {
  const mentionRegex = /@(\w+)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index))
    }
    parts.push(
      <span key={match.index} className="bg-blue-100 text-blue-700 rounded px-0.5">
        {match[0]}
      </span>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex))
  }

  return parts.length > 0 ? parts : [content]
}

interface ThreadViewProps {
  messageId: string
  channelId: string
  bandId: string
  userId: string | null
  userRole?: string
  onClose: () => void
}

export function ThreadView({ messageId, channelId, bandId, userId, userRole, onClose }: ThreadViewProps) {
  const repliesEndRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, refetch } = trpc.message.getThread.useQuery(
    { messageId, userId: userId || '', limit: 100 },
    { enabled: !!messageId && !!userId }
  )

  // Scroll to bottom when new replies arrive
  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.replies])

  // Poll for new replies
  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 5000)
    return () => clearInterval(interval)
  }, [refetch])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white border-l border-gray-200 w-96">
        <Loading message="Loading thread..." />
      </div>
    )
  }

  const parentMessage = data?.message
  const replies = data?.replies || []

  if (!parentMessage) {
    return (
      <div className="h-full flex flex-col bg-white border-l border-gray-200 w-96 p-4">
        <Text color="muted">Message not found</Text>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200 w-96">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <Flex justify="between" align="center">
          <Text weight="semibold">Thread</Text>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </Flex>
      </div>

      {/* Parent Message */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <ThreadMessage
          bandId={bandId}
          message={parentMessage}
          userId={userId}
          userRole={userRole}
          isParent
        />
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto p-4">
        <Stack spacing="sm">
          {replies.length === 0 ? (
            <Text variant="small" color="muted" className="text-center py-4">
              No replies yet. Start the conversation!
            </Text>
          ) : (
            replies.map((reply) => (
              <ThreadMessage
                key={reply.id}
                bandId={bandId}
                message={reply}
                userId={userId}
                userRole={userRole}
              />
            ))
          )}
        </Stack>

        <div ref={repliesEndRef} />
      </div>

      {/* Composer */}
      <MessageComposer
        channelId={channelId}
        userId={userId}
        threadId={messageId}
        placeholder="Reply in thread..."
        onMessageSent={() => refetch()}
      />
    </div>
  )
}

interface Reaction {
  emoji: string
  count: number
  includesMe: boolean
  users: { id: string; name: string }[]
}

interface ThreadMessageProps {
  bandId: string
  message: {
    id: string
    content: string
    author: { id: string; name: string; email: string }
    isPinned: boolean
    isEdited: boolean
    editedAt?: string | null
    createdAt: string
    replyCount?: number
    reactions?: Reaction[]
  }
  userId: string | null
  userRole?: string
  isParent?: boolean
}

function ThreadMessage({ bandId, message, userId, userRole, isParent }: ThreadMessageProps) {
  const utils = trpc.useUtils()

  const deleteMutation = trpc.message.delete.useMutation({
    onSuccess: () => {
      utils.message.getThread.invalidate()
      utils.message.list.invalidate()
      utils.channel.list.invalidate({ bandId })
    },
  })

  const isAuthor = message.author.id === userId
  const canModerate = userRole && ['FOUNDER', 'GOVERNOR', 'MODERATOR'].includes(userRole)
  const canDelete = isAuthor || canModerate

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

  const handleDelete = () => {
    if (!userId || !confirm('Delete this message?')) return
    deleteMutation.mutate({ messageId: message.id, userId })
  }

  return (
    <div className={`group ${isParent ? '' : 'p-2 rounded hover:bg-gray-50'}`}>
      <Flex gap="sm" align="start">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
          <Text variant="small" weight="semibold">
            {message.author.name.charAt(0).toUpperCase()}
          </Text>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <Flex gap="sm" align="center" className="mb-1">
            <Text variant="small" weight="semibold">{message.author.name}</Text>
            <Text variant="small" color="muted">{formatTime(message.createdAt)}</Text>
            {message.isEdited && (
              <Text variant="small" color="muted">(edited)</Text>
            )}
          </Flex>

          {/* Content */}
          <div dir="auto" style={{ textAlign: 'start', unicodeBidi: 'plaintext' }}>
            <Text variant="small" className="whitespace-pre-wrap break-words">
              {highlightMentions(message.content)}
            </Text>
          </div>

          {/* Reactions & Actions */}
          <Flex gap="sm" align="center" className="mt-1 flex-wrap">
            <ReactionBar
              messageId={message.id}
              userId={userId}
              reactions={message.reactions || []}
              compact
            />
            {/* Reply count for parent */}
            {isParent && message.replyCount !== undefined && message.replyCount > 0 && (
              <Text variant="small" color="muted">
                {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
              </Text>
            )}
            {/* Delete action */}
            {canDelete && !isParent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-red-600"
              >
                🗑️ Delete
              </Button>
            )}
          </Flex>
        </div>
      </Flex>
    </div>
  )
}
