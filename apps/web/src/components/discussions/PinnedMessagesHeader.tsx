'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Flex, Text, Button, Badge } from '@/components/ui'

interface PinnedMessagesHeaderProps {
  bandId: string
  channelId: string
  userId: string | null
  onMessageClick: (messageId: string) => void
}

export function PinnedMessagesHeader({ bandId, channelId, userId, onMessageClick }: PinnedMessagesHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const { data } = trpc.channel.get.useQuery(
    { bandId, channelId, userId: userId || '' },
    { enabled: !!bandId && !!channelId && !!userId }
  )

  const pinnedMessages = data?.channel?.pinnedMessages || []

  if (pinnedMessages.length === 0) {
    return null
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="border-b border-gray-200 bg-yellow-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-yellow-100 transition-colors"
      >
        <Flex gap="sm" align="center">
          <span>📌</span>
          <Text variant="small" weight="semibold">
            {pinnedMessages.length} pinned {pinnedMessages.length === 1 ? 'message' : 'messages'}
          </Text>
        </Flex>
        <Text variant="small" color="muted">
          {isExpanded ? '▲' : '▼'}
        </Text>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {pinnedMessages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => onMessageClick(msg.id)}
              className="w-full text-left p-2 rounded bg-white hover:bg-gray-50 border border-gray-200 transition-colors"
            >
              <Flex justify="between" align="start" className="mb-1">
                <Text variant="small" weight="semibold">{msg.authorName}</Text>
                <Text variant="small" color="muted">{formatDate(msg.createdAt)}</Text>
              </Flex>
              <Text variant="small" className="line-clamp-2">
                {msg.content}
              </Text>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
