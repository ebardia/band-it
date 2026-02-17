import { forwardRef, useCallback } from 'react'
import { theme, cn } from '@band-it/shared'
import { handleRichPaste } from '@/lib/htmlToMarkdown'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  /** Disable automatic HTML to Markdown conversion on paste */
  disableRichPaste?: boolean
}

// Fallback styles in case theme isn't loaded properly
const FALLBACK = {
  base: 'w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400',
  focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  disabled: 'disabled:bg-gray-100 disabled:cursor-not-allowed',
  error: 'border-red-500 focus:ring-red-500',
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({
    label,
    error,
    helperText,
    className,
    id,
    disableRichPaste = false,
    onPaste,
    onChange,
    value,
    ...props
  }, ref) {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')

    const styles = {
      base: theme?.components?.input?.base ?? FALLBACK.base,
      focus: theme?.components?.input?.focus ?? FALLBACK.focus,
      disabled: theme?.components?.input?.disabled ?? FALLBACK.disabled,
      error: theme?.components?.input?.error ?? FALLBACK.error,
    }

    // Handle paste with rich text conversion
    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      // Call original onPaste if provided
      onPaste?.(e)

      // If already prevented or rich paste disabled, skip
      if (e.defaultPrevented || disableRichPaste) return

      const clipboardData = e.clipboardData
      const markdown = handleRichPaste(clipboardData)

      if (markdown && onChange) {
        e.preventDefault()

        const textarea = e.currentTarget
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const currentValue = typeof value === 'string' ? value : textarea.value
        const newValue = currentValue.substring(0, start) + markdown + currentValue.substring(end)

        // Create a synthetic event to pass to onChange
        const syntheticEvent = {
          ...e,
          target: { ...textarea, value: newValue },
          currentTarget: { ...textarea, value: newValue },
        } as React.ChangeEvent<HTMLTextAreaElement>

        onChange(syntheticEvent)

        // Set cursor position after pasted content
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + markdown.length
          textarea.focus()
        }, 0)
      }
    }, [onPaste, disableRichPaste, onChange, value])

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
          ref={ref}
          id={textareaId}
          value={value}
          onChange={onChange}
          onPaste={handlePaste}
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
  }
)