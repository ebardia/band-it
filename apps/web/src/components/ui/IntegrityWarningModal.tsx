'use client'

import { Modal } from './Modal'
import { Stack, Flex } from './layout'
import { Heading, Text } from './Typography'
import { Button } from './Button'
import { Badge } from './Badge'
import { TrainAIButton } from '@/components/ai'

interface ValidationIssue {
  type: 'legality' | 'values' | 'scope'
  severity: 'block' | 'flag'
  message: string
}

interface IntegrityWarningModalProps {
  isOpen: boolean
  onClose: () => void
  onProceed: () => void
  issues: ValidationIssue[]
  isProceeding?: boolean
  // Optional AI training props
  bandId?: string
  userId?: string
  userRole?: string
}

function getIssueLabel(type: ValidationIssue['type']): string {
  switch (type) {
    case 'values':
      return 'Values'
    case 'scope':
      return 'Scope'
    default:
      return 'Issue'
  }
}

function getIssueBadgeVariant(type: ValidationIssue['type']): 'warning' | 'info' {
  switch (type) {
    case 'values':
      return 'warning'
    case 'scope':
      return 'info'
    default:
      return 'warning'
  }
}

export function IntegrityWarningModal({
  isOpen,
  onClose,
  onProceed,
  issues,
  isProceeding = false,
  bandId,
  userId,
  userRole,
}: IntegrityWarningModalProps) {
  // Filter to only show flag-level issues (not blocks)
  const flagIssues = issues.filter(i => i.severity === 'flag')

  // Determine which validation type flagged (for AI training context)
  const hasScopeFlag = flagIssues.some(i => i.type === 'scope')
  const hasValuesFlag = flagIssues.some(i => i.type === 'values')

  // Get the primary issue type for training context
  const getValidationOperation = () => {
    if (hasScopeFlag) return 'content_scope_check'
    if (hasValuesFlag) return 'content_values_check'
    return 'task_validation'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <Stack spacing="lg">
        {/* Header */}
        <Flex gap="sm" align="center">
          <span className="text-2xl">⚠️</span>
          <Heading level={2}>Potential Issues Detected</Heading>
        </Flex>

        {/* Issues List */}
        <Stack spacing="md">
          {flagIssues.map((issue, index) => (
            <div
              key={index}
              className="bg-amber-50 border border-amber-200 rounded-lg p-4"
            >
              <Stack spacing="sm">
                <Badge variant={getIssueBadgeVariant(issue.type)}>
                  {getIssueLabel(issue.type)} Concern
                </Badge>
                <Text variant="small">{issue.message}</Text>
              </Stack>
            </div>
          ))}
        </Stack>

        {/* Notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <Text variant="small" color="muted">
            You can still proceed, but this action will be flagged in the audit log for review.
          </Text>
        </div>

        {/* Train AI option */}
        {bandId && userId && userRole && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Flex justify="between" align="center">
              <Text variant="small" color="muted">
                Think this warning is wrong? Help improve the AI.
              </Text>
              <TrainAIButton
                bandId={bandId}
                userId={userId}
                userRole={userRole}
                contextOperation={getValidationOperation()}
                placeholder="e.g., 'Tasks for vendor coordination are within our scope' or 'Our band values include external partnerships'"
              />
            </Flex>
          </div>
        )}

        {/* Actions */}
        <Flex justify="end" gap="md">
          <Button variant="ghost" onClick={onClose} disabled={isProceeding}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onProceed}
            disabled={isProceeding}
          >
            {isProceeding ? 'Proceeding...' : 'Proceed Anyway'}
          </Button>
        </Flex>
      </Stack>
    </Modal>
  )
}
