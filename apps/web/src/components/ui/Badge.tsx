import { theme, cn } from '@band-it/shared'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'secondary'

export interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  onClick?: () => void
  title?: string
}

export function Badge({ children, variant = 'neutral', className, onClick, title }: BadgeProps) {
  return (
    <span
      className={cn(theme.components.badge[variant], className, onClick && 'cursor-pointer')}
      onClick={onClick}
      title={title}
    >
      {children}
    </span>
  )
}