import { theme, cn } from '@band-it/shared'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Select({
  label,
  error,
  helperText,
  className,
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
          {props.required && <span className="text-red-500"> *</span>}
        </label>
      )}

      <select
        id={selectId}
        className={cn(
          theme.components.input.base,
          theme.components.input.focus,
          theme.components.input.disabled,
          error && theme.components.input.error,
          'cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </select>

      {helperText && !error && (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
