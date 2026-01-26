'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@band-it/shared'

type Position = 'top' | 'bottom' | 'left' | 'right'
type Size = 'sm' | 'md' | 'lg'

export interface HelpTipProps {
  /** The help text to display */
  content: string
  /** Optional title for the tooltip */
  title?: string
  /** Position of the tooltip relative to the icon */
  position?: Position
  /** Size of the info icon */
  size?: Size
  /** Additional CSS classes */
  className?: string
  /** Max width of the tooltip */
  maxWidth?: number
}

const sizeClasses: Record<Size, string> = {
  sm: 'w-4 h-4 text-xs',
  md: 'w-5 h-5 text-sm',
  lg: 'w-6 h-6 text-base',
}

const positionClasses: Record<Position, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

const arrowClasses: Record<Position, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
  left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800',
  right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800',
}

export function HelpTip({
  content,
  title,
  position = 'top',
  size = 'md',
  className,
  maxWidth = 280,
}: HelpTipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const tipRef = useRef<HTMLDivElement>(null)

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // Close on click outside (for mobile)
  useEffect(() => {
    if (!isVisible || !isTouchDevice) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (tipRef.current && !tipRef.current.contains(event.target as Node)) {
        setIsVisible(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isVisible, isTouchDevice])

  // Close on escape key
  useEffect(() => {
    if (!isVisible) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsVisible(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isVisible])

  const handleMouseEnter = () => {
    if (!isTouchDevice) {
      setIsVisible(true)
    }
  }

  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      setIsVisible(false)
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isTouchDevice) {
      setIsVisible(!isVisible)
    }
  }

  return (
    <div
      ref={tipRef}
      className={cn('relative inline-flex items-center', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Info Icon */}
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          'bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800',
          'transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          sizeClasses[size]
        )}
        aria-label="Help information"
        aria-expanded={isVisible}
      >
        <span className="font-semibold leading-none">i</span>
      </button>

      {/* Tooltip */}
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-2 rounded-lg shadow-lg',
            'bg-gray-800 text-white text-sm',
            'animate-in fade-in-0 zoom-in-95 duration-150',
            positionClasses[position]
          )}
          style={{ maxWidth: `${maxWidth}px`, minWidth: '150px' }}
        >
          {title && (
            <div className="font-semibold mb-1 text-gray-100">{title}</div>
          )}
          <div className="leading-relaxed">{content}</div>

          {/* Arrow */}
          <div
            className={cn(
              'absolute w-0 h-0 border-[6px]',
              arrowClasses[position]
            )}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Inline help tip that flows with text
 * Use this when you want the help icon to appear inline with label text
 */
export interface InlineHelpProps extends HelpTipProps {
  /** The label text to display before the help icon */
  label: string
  /** Whether the field is required */
  required?: boolean
  /** HTML element to render as */
  as?: 'label' | 'span' | 'div'
  /** For attribute when using as label */
  htmlFor?: string
}

export function InlineHelp({
  label,
  required,
  as: Component = 'span',
  htmlFor,
  ...helpTipProps
}: InlineHelpProps) {
  const labelProps = Component === 'label' && htmlFor ? { htmlFor } : {}

  return (
    <Component
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700"
      {...labelProps}
    >
      {label}
      {required && <span className="text-red-500">*</span>}
      <HelpTip {...helpTipProps} size="sm" />
    </Component>
  )
}
