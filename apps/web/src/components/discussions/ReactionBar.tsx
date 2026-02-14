'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { ReactionPicker, ReactionButton } from './ReactionPicker'

interface Reaction {
  emoji: string
  count: number
  includesMe: boolean
  users: { id: string; name: string }[]
}

interface ReactionBarProps {
  messageId: string
  userId: string | null
  reactions: Reaction[]
  onReactionToggle?: () => void
  compact?: boolean
}

export function ReactionBar({
  messageId,
  userId,
  reactions,
  onReactionToggle,
  compact = false,
}: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false)
  const utils = trpc.useUtils()

  const toggleMutation = trpc.message.toggleReaction.useMutation({
    onSuccess: () => {
      // Invalidate message queries to refresh reactions
      utils.message.list.invalidate()
      utils.message.getThread.invalidate()
      onReactionToggle?.()
    },
  })

  const handleReaction = (emoji: string) => {
    if (!userId) return

    toggleMutation.mutate({
      messageId,
      userId,
      emoji,
    })
  }

  const getUsersTooltip = (reaction: Reaction) => {
    const names = reaction.users.map(u => u.name).slice(0, 5)
    if (reaction.count > 5) {
      names.push(`and ${reaction.count - 5} more`)
    }
    return names.join(', ')
  }

  if (reactions.length === 0 && !userId) {
    return null
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1 flex-wrap">
        {/* Existing reactions - mobile-friendly touch targets */}
        {reactions.map(reaction => (
          <button
            key={reaction.emoji}
            onClick={() => handleReaction(reaction.emoji)}
            disabled={!userId || toggleMutation.isPending}
            className={`
              inline-flex items-center gap-1 px-3 py-2 md:px-2 md:py-0.5 rounded-full text-sm
              border transition-colors min-h-[44px] md:min-h-0
              ${reaction.includesMe
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }
              ${!userId ? 'cursor-default' : 'cursor-pointer'}
              ${toggleMutation.isPending ? 'opacity-50' : ''}
            `}
            title={getUsersTooltip(reaction)}
          >
            <span>{reaction.emoji}</span>
            <span className={compact ? 'text-xs' : 'text-sm'}>{reaction.count}</span>
          </button>
        ))}

        {/* Add reaction button */}
        {userId && (
          <div className="relative">
            <ReactionButton
              onQuickReact={() => handleReaction('👍')}
              onOpenPicker={() => setShowPicker(true)}
            />
            {showPicker && (
              <ReactionPicker
                onSelect={handleReaction}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
