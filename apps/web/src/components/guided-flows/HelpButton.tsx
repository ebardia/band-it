'use client'

import { useGuidedFlow } from './GuidedFlowContext'
import { cn } from '@band-it/shared'

interface HelpButtonProps {
  className?: string
  variant?: 'icon' | 'text' | 'full'
  size?: 'sm' | 'md' | 'lg'
}

export function HelpButton({
  className,
  variant = 'icon',
  size = 'md',
}: HelpButtonProps) {
  const { showGoalSelector, isRunning } = useGuidedFlow()

  if (isRunning) {
    return null // Don't show help button while a flow is running
  }

  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-10 h-10 text-lg',
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={showGoalSelector}
        className={cn(
          'inline-flex items-center justify-center px-3 py-1 rounded-lg',
          'bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'text-sm font-medium',
          className
        )}
        aria-label="Get help"
        title="Get help"
      >
        Help
      </button>
    )
  }

  if (variant === 'text') {
    return (
      <button
        onClick={showGoalSelector}
        className={cn(
          'text-blue-600 hover:text-blue-700 hover:underline',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded',
          className
        )}
      >
        Need help?
      </button>
    )
  }

  // Full variant with icon and text
  return (
    <button
      onClick={showGoalSelector}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700',
        'border border-blue-200 hover:border-blue-300',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
    >
      <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium">
        ?
      </span>
      <span className="text-sm font-medium">Help & Guides</span>
    </button>
  )
}
