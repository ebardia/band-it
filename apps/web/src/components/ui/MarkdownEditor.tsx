'use client'

import { useState } from 'react'
import { Textarea } from './Textarea'
import { Button } from './Button'
import { Flex } from './layout'
import { Text } from './Typography'
import { MarkdownRenderer } from './MarkdownRenderer'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  minLength?: number
  maxLength?: number
  required?: boolean
  id?: string
  label?: string
  showTips?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your content here. Markdown is supported for formatting...',
  rows = 8,
  minLength,
  maxLength,
  required,
  id,
  label,
  showTips = true,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className="markdown-editor">
      {/* Header with label and toggle */}
      <Flex justify="between" align="center" className="mb-2">
        {label && (
          <Text as="label" variant="small" weight="semibold" htmlFor={id}>
            {label}
          </Text>
        )}
        <Flex gap="sm">
          <Button
            type="button"
            variant={!showPreview ? 'primary' : 'ghost'}
            size="xs"
            onClick={() => setShowPreview(false)}
          >
            Write
          </Button>
          <Button
            type="button"
            variant={showPreview ? 'primary' : 'ghost'}
            size="xs"
            onClick={() => setShowPreview(true)}
          >
            Preview
          </Button>
        </Flex>
      </Flex>

      {/* Editor or Preview */}
      {!showPreview ? (
        <div>
          <Textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            minLength={minLength}
            maxLength={maxLength}
            required={required}
            dir="auto"
            style={{ unicodeBidi: 'plaintext' }}
          />

          {/* Character count */}
          {maxLength && (
            <Text variant="tiny" color="muted" className="mt-1">
              {value.length}/{maxLength}
            </Text>
          )}

          {/* Markdown tips */}
          {showTips && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <Text variant="small" weight="semibold" className="mb-1">Formatting Tips:</Text>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                <span><code className="bg-gray-200 px-1 rounded">**bold**</code> for bold</span>
                <span><code className="bg-gray-200 px-1 rounded">*italic*</code> for italic</span>
                <span><code className="bg-gray-200 px-1 rounded"># Heading</code> for headings</span>
                <span><code className="bg-gray-200 px-1 rounded">- item</code> for lists</span>
              </div>
              <Text variant="tiny" color="muted" className="mt-2">
                Tip: Paste from ChatGPT, Word, or Google Docs - formatting is preserved automatically!
              </Text>
            </div>
          )}
        </div>
      ) : (
        <div
          className="border border-gray-300 rounded-lg p-4 min-h-[200px] bg-white"
          style={{ minHeight: `${rows * 1.5 + 2}rem` }}
        >
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <Text color="muted" className="italic">Nothing to preview yet...</Text>
          )}
        </div>
      )}
    </div>
  )
}
