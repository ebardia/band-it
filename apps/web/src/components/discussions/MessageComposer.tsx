'use client'

import { useState, useRef, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { Flex, Button, useToast } from '@/components/ui'

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
    <div className="border-t border-gray-200 p-4 bg-white">
      <Flex gap="sm" align="end">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSubmitting || !userId}
          rows={1}
          className={`
            flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            min-h-[40px] max-h-[200px]
          `}
        />
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!content.trim() || disabled || isSubmitting || !userId}
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </Button>
      </Flex>
      {!userId && (
        <p className="text-sm text-gray-500 mt-2">Sign in to post messages</p>
      )}
    </div>
  )
}
