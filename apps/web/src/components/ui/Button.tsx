import { theme, cn } from '@band-it/shared'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning' | 'success'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const styles = theme.components.button[variant]
  
  return (
    <button
      className={cn(
        styles.base,
        styles.hover,
        styles.disabled,
        styles.sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}