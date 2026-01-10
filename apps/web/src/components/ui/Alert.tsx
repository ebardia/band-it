import { theme } from '@band-it/shared'

type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

interface AlertProps {
  children: React.ReactNode
  variant?: AlertVariant
}

export function Alert({ children, variant = 'info' }: AlertProps) {
  return (
    <div className={theme.components.alert[variant]}>
      {children}
    </div>
  )
}