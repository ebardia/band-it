import { theme, cn } from '@band-it/shared'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'secondary'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
  onClick?: () => void
  title?: string
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
}

export function Badge({ children, variant = 'neutral', size = 'md', className, onClick, title }: BadgeProps) {
  return (
    <span
      className={cn(theme.components.badge[variant], sizeClasses[size], className, onClick && 'cursor-pointer')}
      onClick={onClick}
      title={title}
    >
      {children}
    </span>
  )
}