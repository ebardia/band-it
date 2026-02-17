'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { trpc } from '@/lib/trpc'
import { Flex, Button, useToast } from '@/components/ui'
import { MentionAutocomplete, useMentionDetection } from './MentionAutocomplete'

interface MessageComposerProps {
  channelId: string
  userId: string | null
  threadId?: string
  placeholder?: string
  disabled?: boolean
  onMessageSent?: () => void
}

export function MessageComposer({
  channelId,
  userId,
  threadId,
  placeholder = 'Write a message...',
  disabled = false,
  onMessageSent,
}: MessageComposerProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { showToast } = useToast()
  const utils = trpc.useUtils()

  const { mentionState, checkForMention, insertMention, closeMention } = useMentionDetection(
    textareaRef,
    content
  )

  const createMutation = trpc.message.create.useMutation({
    onSuccess: () => {
      setContent('')
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      // Invalidate message list to show new message
      utils.message.list.invalidate({ channelId })
      if (threadId) {
        utils.message.getThread.invalidate({ messageId: threadId })
      }
      // Invalidate onboarding to check for milestone completion
      utils.onboarding.getBandOnboarding.invalidate()
      onMessageSent?.()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }, [content])

  // Handle mention selection
  const handleMentionSelect = useCallback((name: string, type: 'user' | 'role') => {
    const newContent = insertMention(name, type)
    setContent(newContent)
    closeMention()
    // Focus the textarea after selection
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }, [insertMention, closeMention])

  // Check for mentions on content change or cursor move
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    // Check for mentions after state update
    setTimeout(checkForMention, 0)
  }

  const handleClick = () => {
    checkForMention()
  }

  const handleSubmit = () => {
    if (!content.trim() || !userId || disabled) return

    createMutation.mutate({
      channelId,
      userId,
      content: content.trim(),
      threadId,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isSubmitting = createMutation.isPending

  return (
    <div className="border-t border-gray-200 p-3 md:p-4 bg-white relative" data-guide="message-composer">
      <Flex gap="sm" align="end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSubmitting || !userId}
            rows={1}
            className={`
              w-full resize-none rounded-lg border border-gray-300 px-3 py-2 md:px-4
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              min-h-[44px] md:min-h-[40px] max-h-[150px] md:max-h-[200px]
              text-base md:text-sm
            `}
          />

          {/* Mention autocomplete - positioned above textarea */}
          {mentionState?.isActive && userId && (
            <MentionAutocomplete
              channelId={channelId}
              userId={userId}
              search={mentionState.search}
              position={{ top: 0, left: 0 }}
              onSelect={handleMentionSelect}
              onClose={closeMention}
            />
          )}
        </div>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!content.trim() || disabled || isSubmitting || !userId}
          className="min-h-[44px] md:min-h-0 px-4 md:px-3"
        >
          {isSubmitting ? '...' : 'Send'}
        </Button>
      </Flex>
      {!userId && (
        <p className="text-sm text-gray-500 mt-2">Sign in to post messages</p>
      )}
    </div>
  )
}
