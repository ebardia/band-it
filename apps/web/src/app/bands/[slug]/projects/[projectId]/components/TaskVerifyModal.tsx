'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Heading,
  Text,
  Stack,
  Flex,
  Button,
  Modal,
  FileList,
  Loading,
  Badge,
  Card,
} from '@/components/ui'

interface TaskVerifyModalProps {
  isOpen: boolean
  task: any
  onClose: () => void
  onApprove: (notes?: string) => void
  onReject: (notes?: string) => void
  isSubmitting: boolean
}

export function TaskVerifyModal({
  isOpen,
  task,
  onClose,
  onApprove,
  onReject,
  isSubmitting,
}: TaskVerifyModalProps) {
  const [notes, setNotes] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const { data: filesData, isLoading: filesLoading } = trpc.file.getByEntity.useQuery(
    { taskId: task?.id },
    { enabled: !!task?.id && isOpen }
  )

  const { data: checklistData, isLoading: checklistLoading } = trpc.checklist.getByTask.useQuery(
    { taskId: task?.id },
    { enabled: !!task?.id && isOpen }
  )

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleClose = () => {
    setNotes('')
    onClose()
  }

  if (!task) return null

  const files = filesData?.files || []
  const textareaClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Stack spacing="lg">
        <Heading level={2}>Review Task</Heading>
        
        <Text weight="semibold">{task.name}</Text>
        
        {task.description && (
          <Stack spacing="xs">
            <Text variant="small" weight="semibold">Task Description</Text>
            <Text variant="small" color="muted">{task.description}</Text>
          </Stack>
        )}
        
        {task.proofDescription && (
          <Stack spacing="xs">
            <Text variant="small" weight="semibold">Proof Description</Text>
            <Text variant="small">{task.proofDescription}</Text>
          </Stack>
        )}

        {/* Checklist Summary */}
        <Stack spacing="sm">
          <Text variant="small" weight="semibold">
            Checklist Items ({checklistData?.items?.length || 0})
          </Text>
          {checklistLoading ? (
            <Loading message="Loading checklist..." />
          ) : checklistData?.items && checklistData.items.length > 0 ? (
            <Stack spacing="sm">
              {checklistData.items.map((item: any) => {
                const isExpanded = expandedItems.has(item.id)
                const hasDeliverable = item.deliverable?.summary
                const linkCount = Array.isArray(item.deliverable?.links) ? item.deliverable.links.length : 0
                const fileCount = (item.files?.length || 0) + (item.deliverable?.files?.length || 0)

                return (
                  <Card key={item.id} className="p-3 bg-gray-50">
                    <Stack spacing="sm">
                      <Flex justify="between" align="start" gap="sm">
                        <Flex gap="sm" align="start" className="flex-1">
                          <Text className={item.isCompleted ? 'text-green-600' : 'text-gray-400'}>
                            {item.isCompleted ? '✓' : '○'}
                          </Text>
                          <Stack spacing="xs" className="flex-1">
                            <Text variant="small" weight="semibold">
                              {item.description}
                            </Text>
                            <Flex gap="sm" className="flex-wrap">
                              {item.completedBy && (
                                <Badge variant="success">
                                  Done by {item.completedBy.name}
                                </Badge>
                              )}
                              {hasDeliverable && (
                                <Badge variant="info">Has summary</Badge>
                              )}
                              {linkCount > 0 && (
                                <Badge variant="neutral">{linkCount} link{linkCount !== 1 ? 's' : ''}</Badge>
                              )}
                              {fileCount > 0 && (
                                <Badge variant="neutral">{fileCount} file{fileCount !== 1 ? 's' : ''}</Badge>
                              )}
                            </Flex>
                          </Stack>
                        </Flex>
                        {hasDeliverable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(item.id)}
                          >
                            {isExpanded ? '▼' : '▶'}
                          </Button>
                        )}
                      </Flex>

                      {/* Expanded deliverable details */}
                      {isExpanded && item.deliverable && (
                        <Stack spacing="sm" className="ml-6 pl-3 border-l-2 border-gray-200">
                          <Stack spacing="xs">
                            <Text variant="small" weight="semibold" color="muted">Summary</Text>
                            <Text variant="small" style={{ whiteSpace: 'pre-wrap' }}>
                              {item.deliverable.summary}
                            </Text>
                          </Stack>
                          {linkCount > 0 && (
                            <Stack spacing="xs">
                              <Text variant="small" weight="semibold" color="muted">Links</Text>
                              {(item.deliverable.links as any[]).map((link: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {link.title}
                                </a>
                              ))}
                            </Stack>
                          )}
                          {item.deliverable.nextSteps && (
                            <Stack spacing="xs">
                              <Text variant="small" weight="semibold" color="muted">Next Steps</Text>
                              <Text variant="small" color="muted" style={{ whiteSpace: 'pre-wrap' }}>
                                {item.deliverable.nextSteps}
                              </Text>
                            </Stack>
                          )}
                        </Stack>
                      )}
                    </Stack>
                  </Card>
                )
              })}
            </Stack>
          ) : (
            <Text variant="small" color="muted">No checklist items</Text>
          )}
        </Stack>

        <Stack spacing="sm">
          <Text variant="small" weight="semibold">Uploaded Proof ({files.length})</Text>
          {filesLoading ? (
            <Loading message="Loading files..." />
          ) : files.length > 0 ? (
            <FileList
              files={files}
              canDelete={false}
              showUploader={true}
            />
          ) : (
            <Text variant="small" color="muted">No files uploaded</Text>
          )}
        </Stack>
        
        <Stack spacing="xs">
          <Text variant="small" weight="semibold">Feedback (optional)</Text>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add feedback or notes..."
            className={textareaClassName}
            rows={3}
          />
        </Stack>
        
        <Flex gap="md" justify="end">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => onReject(notes || undefined)}
            disabled={isSubmitting}
          >
            Reject
          </Button>
          <Button
            variant="primary"
            onClick={() => onApprove(notes || undefined)}
            disabled={isSubmitting}
          >
            Approve
          </Button>
        </Flex>
      </Stack>
    </Modal>
  )
}