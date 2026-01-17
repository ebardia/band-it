'use client'

import { Modal } from './Modal'
import { Stack, Flex } from './layout'
import { Heading, Text } from './Typography'
import { Button } from './Button'

interface ValidationIssue {
  type: 'legality' | 'values' | 'scope'
  severity: 'block' | 'flag'
  message: string
}

interface IntegrityBlockModalProps {
  isOpen: boolean
  onClose: () => void
  issues: ValidationIssue[]
}

export function IntegrityBlockModal({ isOpen, onClose, issues }: IntegrityBlockModalProps) {
  // Filter to only show block-level issues
  const blockIssues = issues.filter(i => i.severity === 'block')

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <Stack spacing="lg">
        {/* Header */}
        <Flex gap="sm" align="center">
          <span className="text-2xl">🚫</span>
          <Heading level={2}>Cannot Proceed</Heading>
        </Flex>

        {/* Description */}
        <Text color="muted">
          This content cannot be created because it appears to involve prohibited activity.
          Please revise your content and try again.
        </Text>

        {/* Issues List */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <Stack spacing="md">
            {blockIssues.map((issue, index) => (
              <Flex key={index} gap="sm" align="start">
                <span className="text-red-500 mt-0.5">•</span>
                <Text variant="small">{issue.message}</Text>
              </Flex>
            ))}
          </Stack>
        </div>

        {/* Action */}
        <Flex justify="end">
          <Button variant="primary" onClick={onClose}>
            OK
          </Button>
        </Flex>
      </Stack>
    </Modal>
  )
}
