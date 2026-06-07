'use client'

import { usePageHelp } from './GuidedFlowContext'
import { cn } from '@band-it/shared'

interface HelpButtonProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  'data-guide'?: string
}

export function HelpButton({ className, size = 'md', 'data-guide': dataGuide }: HelpButtonProps) {
  const { hasHelp, isRunning, startHelp, currentPageHelp } = usePageHelp()

  // Don't show if no help available for this page or already running
  if (!hasHelp || isRunning) {
    return null
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  return (
    <button
      onClick={startHelp}
      className={cn(
        'np-help-nav-btn inline-flex items-center gap-1.5 rounded-lg',
        'font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2',
        sizeClasses[size],
        className
      )}
      title={currentPageHelp?.pageTitle ? `Help: ${currentPageHelp.pageTitle}` : 'Page Help'}
      data-guide={dataGuide}
    >
      <span>?</span>
      <span>Help</span>
    </button>
  )
}
