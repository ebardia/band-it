'use client'

import { useState, useRef } from 'react'
import { cn } from '@band-it/shared'
import { Stack } from './Layout'
import { Text } from './Typography'
import { Alert } from './Alert'

interface FileUploadProps {
  onUpload: (file: { fileName: string; mimeType: string; base64Data: string }) => void
  onError?: (error: string) => void
  accept?: string
  maxSizeMB?: number
  label?: string
  description?: string
  disabled?: boolean
  isUploading?: boolean
}

const DEFAULT_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv'

export function FileUpload({
  onUpload,
  onError,
  accept = DEFAULT_ACCEPT,
  maxSizeMB = 10,
  label = 'Upload File',
  description,
  disabled = false,
  isUploading = false,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const maxSizeBytes = maxSizeMB * 1024 * 1024

  const handleFile = async (file: File) => {
    setError(null)

    if (file.size > maxSizeBytes) {
      const msg = `File too large. Maximum size: ${maxSizeMB}MB`
      setError(msg)
      onError?.(msg)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const base64Data = base64.split(',')[1]
      
      onUpload({
        fileName: file.name,
        mimeType: file.type,
        base64Data,
      })
    }
    reader.onerror = () => {
      const msg = 'Failed to read file'
      setError(msg)
      onError?.(msg)
    }
    reader.readAsDataURL(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled || isUploading) return
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleClick = () => {
    if (!disabled && !isUploading) {
      inputRef.current?.click()
    }
  }

  const dropZoneClassName = cn(
    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition',
    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
    (disabled || isUploading) && 'opacity-50 cursor-not-allowed'
  )

  return (
    <Stack spacing="sm">
      {label && <Text variant="small" weight="semibold">{label}</Text>}
      
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        className={dropZoneClassName}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={disabled || isUploading}
          className="hidden"
        />
        
        <Stack spacing="xs">
          <Text className="text-gray-600">
            {isUploading ? '⏳ Uploading...' : '📎 Drop file here or click to browse'}
          </Text>
          {description && (
            <Text variant="small" className="text-gray-400">
              {description}
            </Text>
          )}
          <Text variant="small" className="text-gray-400">
            Max size: {maxSizeMB}MB
          </Text>
        </Stack>
      </div>

      {error && (
        <Alert variant="danger">
          <Text variant="small">{error}</Text>
        </Alert>
      )}
    </Stack>
  )
}