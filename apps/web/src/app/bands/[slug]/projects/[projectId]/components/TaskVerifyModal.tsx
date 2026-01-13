'use client'

import { useState } from 'react'
import { Heading, Text, Stack, Flex, Button, Modal } from '@/components/ui'

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

  const handleClose = () => {
    setNotes('')
    onClose()
  }

  if (!task) return null

  const textareaClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Stack spacing="lg">
        <Heading level={2}>Review Task</Heading>
        
        <Text weight="semibold">{task.name}</Text>
        
        {task.proofDescription && (
          <Stack spacing="sm">
            <Text variant="small" weight="semibold">Proof Description:</Text>
            <Text variant="small">{task.proofDescription}</Text>
          </Stack>
        )}
        
        <Stack spacing="xs">
          <Text variant="small" weight="semibold">Notes (optional)</Text>
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