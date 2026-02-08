'use client'

import { Modal } from './Modal'
import { Stack, Flex } from './layout'
import { Heading, Text } from './Typography'
import { Button } from './Button'
import { TrainAIButton } from '@/components/ai'

interface ValidationIssue {
  type: 'legality' | 'values' | 'scope'
  severity: 'block' | 'flag'
  message: string
}

interface IntegrityBlockModalProps {
  isOpen: boolean
  onClose: () => void
  issues: ValidationIssue[]
  // Optional AI training props
  bandId?: string
  userId?: string
  userRole?: string
}

export function IntegrityBlockModal({ isOpen, onClose, issues, bandId, userId, userRole }: IntegrityBlockModalProps) {
  // Filter to only show block-level issues
  const blockIssues = issues.filter(i => i.severity === 'block')

  // Determine which validation type blocked (for AI training context)
  const hasLegalityBlock = blockIssues.some(i => i.type === 'legality')
  const hasScopeBlock = blockIssues.some(i => i.type === 'scope')
  const hasValuesBlock = blockIssues.some(i => i.type === 'values')

  // Get the primary issue type for training context
  const getValidationOperation = () => {
    if (hasLegalityBlock) return 'content_legality_check'
    if (hasScopeBlock) return 'content_scope_check'
    if (hasValuesBlock) return 'content_values_check'
    return 'task_validation'
  }

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

        {/* Actions */}
        <Flex justify="between" align="center">
          {bandId && userId && userRole ? (
            <TrainAIButton
              bandId={bandId}
              userId={userId}
              userRole={userRole}
              contextOperation={getValidationOperation()}
              placeholder="e.g., 'Tasks related to vendor coordination should be allowed' or 'Our project scope includes external partnerships'"
              variant="secondary"
            />
          ) : (
            <div />
          )}
          <Button variant="primary" onClick={onClose}>
            OK
          </Button>
        </Flex>
      </Stack>
    </Modal>
  )
}
