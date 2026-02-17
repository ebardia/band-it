import { theme, cn } from '@band-it/shared'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning' | 'success'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
}

// Fallback styles in case theme isn't loaded properly
const FALLBACK_STYLES = {
  base: 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200',
  hover: 'hover:opacity-90',
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  sizes: {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  },
  variants: {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600',
    success: 'bg-green-600 text-white hover:bg-green-700',
  },
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const themeStyles = theme?.components?.button?.[variant]

  // Use theme styles if available, otherwise use fallbacks
  const styles = themeStyles ? {
    base: themeStyles.base,
    hover: themeStyles.hover,
    disabled: themeStyles.disabled,
    size: themeStyles.sizes?.[size] ?? FALLBACK_STYLES.sizes[size],
  } : {
    base: `${FALLBACK_STYLES.base} ${FALLBACK_STYLES.variants[variant]}`,
    hover: FALLBACK_STYLES.hover,
    disabled: FALLBACK_STYLES.disabled,
    size: FALLBACK_STYLES.sizes[size],
  }

  return (
    <button
      className={cn(
        styles.base,
        styles.hover,
        styles.disabled,
        styles.size,
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}