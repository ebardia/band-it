import { theme } from '@band-it/shared'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return (
    <span className={theme.components.badge[variant]}>
      {children}
    </span>
  )
}