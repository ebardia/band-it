import { theme, cn } from '@band-it/shared'

type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

export interface AlertProps {
  children: React.ReactNode
  variant?: AlertVariant
  className?: string
}

export function Alert({ children, variant = 'info', className }: AlertProps) {
  return (
    <div className={cn(theme.components.alert[variant], className)}>
      {children}
    </div>
  )
}