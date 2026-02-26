'use client'

import { cn } from '@band-it/shared'
import Link from 'next/link'

interface QuickLayoutProps {
  children?: React.ReactNode
  bandName?: string
  bandSlug?: string
  title: string
  subtitle?: string
  error?: string | null
  isLoading?: boolean
  className?: string
}

/**
 * QuickLayout - Mobile-first layout for micro landing pages
 *
 * Features:
 * - Centered card design
 * - Minimal header with band context
 * - 48px+ tap targets for mobile
 * - Optional back navigation
 */
export function QuickLayout({
  children,
  bandName,
  bandSlug,
  title,
  subtitle,
  error,
  isLoading,
  className,
}: QuickLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Minimal header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {bandSlug && (
              <Link
                href={`/bands/${bandSlug}`}
                className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Back to band"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
            )}
            <div>
              {bandName && (
                <p className="text-xs text-gray-500 uppercase tracking-wide">{bandName}</p>
              )}
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-6">
        <div className={cn('max-w-lg mx-auto', className)}>
          {subtitle && (
            <p className="text-gray-600 text-sm mb-4">{subtitle}</p>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="px-4 py-3 text-center">
        <p className="text-xs text-gray-400">BAND IT Governance Platform</p>
      </footer>
    </div>
  )
}

/**
 * QuickCard - Card component optimized for quick pages
 */
interface QuickCardProps {
  children: React.ReactNode
  className?: string
}

export function QuickCard({ children, className }: QuickCardProps) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200 p-4', className)}>
      {children}
    </div>
  )
}

/**
 * QuickButton - Large tap-target button for mobile
 */
interface QuickButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  fullWidth?: boolean
  children: React.ReactNode
}

export function QuickButton({
  variant = 'primary',
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: QuickButtonProps) {
  const baseStyles = 'min-h-[48px] px-6 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 disabled:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-300',
  }

  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        fullWidth && 'w-full',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * QuickDivider - Simple divider with optional text
 */
interface QuickDividerProps {
  text?: string
}

export function QuickDivider({ text }: QuickDividerProps) {
  if (text) {
    return (
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-500 uppercase">{text}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
    )
  }
  return <div className="h-px bg-gray-200 my-4" />
}

/**
 * QuickInfo - Info row for displaying key-value pairs
 */
interface QuickInfoProps {
  label: string
  value: React.ReactNode
  className?: string
}

export function QuickInfo({ label, value, className }: QuickInfoProps) {
  return (
    <div className={cn('flex justify-between items-center py-2', className)}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}

/**
 * QuickBadge - Status badge for quick pages
 */
interface QuickBadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  children: React.ReactNode
}

export function QuickBadge({ variant = 'default', children }: QuickBadgeProps) {
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  }

  return (
    <span className={cn('inline-flex px-2 py-1 text-xs font-medium rounded-full', variantStyles[variant])}>
      {children}
    </span>
  )
}
