import { theme, cn } from '@band-it/shared'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Textarea({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')
  
  return (
    <div>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
          {props.required && <span className="text-red-500"> *</span>}
        </label>
      )}
      
      <textarea
        id={textareaId}
        className={cn(
          theme.components.input.base,
          theme.components.input.focus,
          theme.components.input.disabled,
          error && theme.components.input.error,
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
}