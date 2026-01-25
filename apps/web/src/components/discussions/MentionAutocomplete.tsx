'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { trpc } from '@/lib/trpc'
import { Text, Flex } from '@/components/ui'

interface MentionableUser {
  id: string
  name: string
  email: string
  role: string
}

interface MentionAutocompleteProps {
  channelId: string
  userId: string
  search: string
  position: { top: number; left: number }
  onSelect: (value: string, type: 'user' | 'role') => void
  onClose: () => void
}

export function MentionAutocomplete({
  channelId,
  userId,
  search,
  position,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = trpc.message.getMentionableUsers.useQuery(
    { channelId, userId, search: search || undefined },
    { enabled: !!channelId && !!userId }
  )

  const users = data?.users || []
  const roleMentions = data?.roleMentions || []

  // Create combined list of options
  const options: Array<{ type: 'user' | 'role'; value: string; label: string; sublabel?: string }> = [
    ...roleMentions.map(role => ({
      type: 'role' as const,
      value: role,
      label: `@${role}`,
      sublabel: getRoleMentionDescription(role),
    })),
    ...users.map(user => ({
      type: 'user' as const,
      value: user.name,
      label: user.name,
      sublabel: formatRole(user.role),
    })),
  ]

  // Reset selection when options change
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (options.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, options.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const selected = options[selectedIndex]
        if (selected) {
          onSelect(selected.value, selected.type)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [options, selectedIndex, onSelect, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  if (isLoading) {
    return (
      <div
        className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3"
        style={{ top: position.top, left: position.left }}
      >
        <Text variant="small" color="muted">Loading...</Text>
      </div>
    )
  }

  if (options.length === 0) {
    return (
      <div
        className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3"
        style={{ top: position.top, left: position.left }}
      >
        <Text variant="small" color="muted">No matches found</Text>
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto w-64"
      style={{ top: position.top, left: position.left }}
    >
      {options.map((option, index) => (
        <button
          key={`${option.type}-${option.value}`}
          onClick={() => onSelect(option.value, option.type)}
          className={`
            w-full text-left px-3 py-2 flex items-center gap-2
            ${index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}
          `}
        >
          {option.type === 'user' ? (
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
              <Text variant="small" weight="semibold">
                {option.value.charAt(0).toUpperCase()}
              </Text>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Text variant="small" weight="semibold" className="text-blue-600">@</Text>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <Text variant="small" weight="semibold" className="truncate">
              {option.label}
            </Text>
            {option.sublabel && (
              <Text variant="small" color="muted" className="truncate">
                {option.sublabel}
              </Text>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

function getRoleMentionDescription(role: string): string {
  switch (role) {
    case 'governors':
      return 'Notify all Governors'
    case 'moderators':
      return 'Notify all Moderators'
    case 'conductors':
      return 'Notify all Conductors'
    case 'everyone':
      return 'Notify all members'
    case 'channel':
      return 'Notify channel members'
    default:
      return ''
  }
}

function formatRole(role: string): string {
  return role.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// Hook to manage mention detection in a textarea
export function useMentionDetection(
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  content: string
) {
  const [mentionState, setMentionState] = useState<{
    isActive: boolean
    search: string
    position: { top: number; left: number }
    startIndex: number
  } | null>(null)

  const checkForMention = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = content.substring(0, cursorPos)

    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex === -1) {
      setMentionState(null)
      return
    }

    // Check if there's a space between @ and cursor
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      setMentionState(null)
      return
    }

    // Check if @ is at the start or preceded by whitespace
    if (lastAtIndex > 0 && !/\s/.test(textBeforeCursor[lastAtIndex - 1])) {
      setMentionState(null)
      return
    }

    // Calculate position for the autocomplete dropdown
    // This is a simplified calculation - in production you might want a more accurate one
    const rect = textarea.getBoundingClientRect()
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20
    const lines = textBeforeCursor.split('\n')
    const currentLineNumber = lines.length - 1

    setMentionState({
      isActive: true,
      search: textAfterAt,
      position: {
        top: rect.top + (currentLineNumber + 1) * lineHeight + window.scrollY,
        left: rect.left,
      },
      startIndex: lastAtIndex,
    })
  }, [content, textareaRef])

  const insertMention = useCallback((name: string, type: 'user' | 'role') => {
    if (!mentionState || !textareaRef.current) return ''

    const beforeMention = content.substring(0, mentionState.startIndex)
    const afterMention = content.substring(textareaRef.current.selectionStart)

    return `${beforeMention}@${name} ${afterMention}`
  }, [mentionState, content, textareaRef])

  const closeMention = useCallback(() => {
    setMentionState(null)
  }, [])

  return {
    mentionState,
    checkForMention,
    insertMention,
    closeMention,
  }
}
