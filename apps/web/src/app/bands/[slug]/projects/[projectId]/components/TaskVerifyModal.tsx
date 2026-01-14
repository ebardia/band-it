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

  const { data: filesData, isLoading: filesLoading } = trpc.file.getByEntity.useQuery(
    { taskId: task?.id },
    { enabled: !!task?.id && isOpen }
  )

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