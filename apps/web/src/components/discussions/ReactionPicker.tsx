'use client'

import { useRef, useEffect } from 'react'

// Quick picker emoji set
const QUICK_EMOJIS = ['👍', '👎', '❤️', '🎉', '😂', '😮', '😢', '🙏']

interface ReactionPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  position?: 'top' | 'bottom'
}

export function ReactionPicker({ onSelect, onClose, position = 'bottom' }: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close on click outside - use setTimeout to let click events fire first
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // Use click instead of mousedown to allow button clicks to register first
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [onClose])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleSelect = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(emoji)
    onClose()
  }

  return (
    <div
      ref={pickerRef}
      className={`
        absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2
        ${position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}
        left-0 md:left-auto
        max-w-[calc(100vw-2rem)] md:max-w-none
      `}
    >
      <div className="flex items-center gap-1 flex-wrap md:flex-nowrap justify-center md:justify-start">
        {QUICK_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={(e) => handleSelect(emoji, e)}
            className="
              w-11 h-11 md:w-8 md:h-8 flex items-center justify-center text-xl md:text-lg
              rounded hover:bg-gray-100 active:bg-gray-200 transition-colors
            "
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ReactionButtonProps {
  onQuickReact: () => void
  onOpenPicker: () => void
}

export function ReactionButton({ onQuickReact, onOpenPicker }: ReactionButtonProps) {
  return (
    <div className="flex items-center">
      <button
        onClick={onQuickReact}
        className="
          w-11 h-11 md:w-6 md:h-6 flex items-center justify-center text-base md:text-sm
          rounded-l hover:bg-gray-100 text-gray-400 hover:text-gray-600
          transition-colors border-r border-gray-200
        "
        title="Like"
      >
        👍
      </button>
      <button
        onClick={onOpenPicker}
        className="
          w-8 h-11 md:w-4 md:h-6 flex items-center justify-center text-sm md:text-xs
          rounded-r hover:bg-gray-100 text-gray-400 hover:text-gray-600
          transition-colors
        "
        title="More reactions"
      >
        ▾
      </button>
    </div>
  )
}
