import { forwardRef } from 'react'
import { theme, cn } from '@band-it/shared'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

// Fallback styles in case theme isn't loaded properly
const FALLBACK = {
  base: 'w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400',
  focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  disabled: 'disabled:bg-gray-100 disabled:cursor-not-allowed',
  error: 'border-red-500 focus:ring-red-500',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}, ref) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  const styles = {
    base: theme?.components?.input?.base ?? FALLBACK.base,
    focus: theme?.components?.input?.focus ?? FALLBACK.focus,
    disabled: theme?.components?.input?.disabled ?? FALLBACK.disabled,
    error: theme?.components?.input?.error ?? FALLBACK.error,
  }

  return (
    <div>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
          {props.required && <span className="text-red-500"> *</span>}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        className={cn(
          styles.base,
          styles.focus,
          styles.disabled,
          error && styles.error,
          className
        )}
        {...props}
      />

      {helperText && !error && (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
})