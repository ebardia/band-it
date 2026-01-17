'use client'

import { Stack, Flex } from './layout'
import { Text } from './Typography'
import { Button } from './Button'
import { Badge } from './Badge'
import { Card } from './Card'

interface FileItem {
  id: string
  originalName: string
  mimeType: string
  size: number
  url: string
  category: string
  createdAt: string
  uploadedBy?: {
    id: string
    name: string
  }
}

interface FileListProps {
  files: FileItem[]
  onDelete?: (fileId: string) => void
  canDelete?: boolean
  currentUserId?: string | null
  isDeleting?: boolean
  showUploader?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('word')) return '📝'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
  if (mimeType.startsWith('text/')) return '📃'
  return '📎'
}

function getCategoryVariant(category: string): 'success' | 'info' | 'warning' | 'neutral' {
  const variants: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = {
    IMAGE: 'info',
    DOCUMENT: 'neutral',
    RECEIPT: 'success',
    OTHER: 'neutral',
  }
  return variants[category] || 'neutral'
}

export function FileList({
  files,
  onDelete,
  canDelete = false,
  currentUserId,
  isDeleting = false,
  showUploader = true,
}: FileListProps) {
  if (files.length === 0) {
    return (
      <Text variant="small" color="muted">
        No files attached
      </Text>
    )
  }

  const openFile = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Stack spacing="sm">
      {files.map((file) => {
        const isImage = file.mimeType.startsWith('image/')
        const canDeleteThis = canDelete && currentUserId === file.uploadedBy?.id

        return (
          <Card key={file.id}>
            <Flex gap="md" align="center">
              <Text>{getFileIcon(file.mimeType)}</Text>

              {isImage && (
                <Button variant="ghost" size="sm" onClick={() => openFile(file.url)}>
                  <img
                    src={file.url}
                    alt={file.originalName}
                    className="w-12 h-12 object-cover rounded"
                  />
                </Button>
              )}

              <Stack spacing="xs" className="flex-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => openFile(file.url)}
                >
                  <Text weight="semibold" color="primary">
                    {file.originalName}
                  </Text>
                </Button>
                <Flex gap="sm">
                  <Badge variant={getCategoryVariant(file.category)}>{file.category}</Badge>
                  <Text variant="small" color="muted">
                    {formatFileSize(file.size)}
                  </Text>
                </Flex>
                {showUploader && file.uploadedBy && (
                  <Text variant="small" color="muted">
                    Uploaded by {file.uploadedBy.name} • {new Date(file.createdAt).toLocaleDateString()}
                  </Text>
                )}
              </Stack>

              <Flex gap="sm">
                <Button variant="ghost" size="sm" onClick={() => openFile(file.url)}>
                  View
                </Button>
                {canDeleteThis && onDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(file.id)}
                    disabled={isDeleting}
                  >
                    Delete
                  </Button>
                )}
              </Flex>
            </Flex>
          </Card>
        )
      })}
    </Stack>
  )
}