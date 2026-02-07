'use client'

import { useState } from 'react'
import { Heading, Text, Stack, Flex, Card, Button, Badge, Alert } from '@/components/ui'

interface TaskSuggestion {
  name: string
  description: string
  estimatedHours: number | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  order: number
  requiresVerification: boolean
}

interface TaskSuggestionsProps {
  suggestions: TaskSuggestion[]
  onAccept: (suggestion: TaskSuggestion) => void
  onAcceptAll: () => void
  onDismiss: () => void
  isCreating: boolean
  createdCount: number
  requiresDeliverable: boolean
  onRequiresDeliverableChange: (value: boolean) => void
}

const PRIORITY_COLORS = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
} as const

export function TaskSuggestions({
  suggestions,
  onAccept,
  onAcceptAll,
  onDismiss,
  isCreating,
  createdCount,
  requiresDeliverable,
  onRequiresDeliverableChange,
}: TaskSuggestionsProps) {
  const [acceptedIndices, setAcceptedIndices] = useState<Set<number>>(new Set())

  const handleAccept = (suggestion: TaskSuggestion, index: number) => {
    setAcceptedIndices(prev => new Set(prev).add(index))
    onAccept(suggestion)
  }

  const remainingSuggestions = suggestions.filter((_, i) => !acceptedIndices.has(i))

  if (remainingSuggestions.length === 0 && createdCount > 0) {
    return (
      <Alert variant="success">
        <Stack spacing="sm">
          <Text weight="semibold">All {createdCount} tasks created!</Text>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Close
          </Button>
        </Stack>
      </Alert>
    )
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <Stack spacing="lg">
        <Flex justify="between" align="center">
          <Stack spacing="xs">
            <Heading level={3}>AI Task Suggestions</Heading>
            <Text variant="small" className="text-gray-600">
              Review and add suggested tasks to your project
            </Text>
          </Stack>
          <Flex gap="sm">
            <Button
              variant="primary"
              size="sm"
              onClick={onAcceptAll}
              disabled={isCreating || remainingSuggestions.length === 0}
            >
              Add All ({remainingSuggestions.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          </Flex>
        </Flex>

        {createdCount > 0 && (
          <Alert variant="success">
            <Text variant="small">{createdCount} task(s) created successfully</Text>
          </Alert>
        )}

        <Flex gap="sm" align="center" className="py-2 px-3 bg-blue-100 rounded-lg">
          <input
            type="checkbox"
            id="aiTasksRequireDeliverable"
            checked={requiresDeliverable}
            onChange={(e) => onRequiresDeliverableChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="aiTasksRequireDeliverable" className="text-sm text-blue-800">
            Require deliverable for these tasks
          </label>
        </Flex>

        <Stack spacing="md">
          {suggestions.map((suggestion, index) => {
            const isAccepted = acceptedIndices.has(index)
            
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  isAccepted 
                    ? 'bg-green-50 border-green-200 opacity-60' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <Flex justify="between" align="start" gap="md">
                  <Stack spacing="sm" className="flex-1">
                    <Flex gap="sm" align="center" className="flex-wrap">
                      <Text weight="semibold">{suggestion.name}</Text>
                      <Badge variant={PRIORITY_COLORS[suggestion.priority]}>
                        {suggestion.priority}
                      </Badge>
                      {suggestion.requiresVerification && (
                        <Badge variant="neutral">Needs Verification</Badge>
                      )}
                      {isAccepted && (
                        <Badge variant="success">Added</Badge>
                      )}
                    </Flex>
                    <Text variant="small" className="text-gray-600">
                      {suggestion.description}
                    </Text>
                    {suggestion.estimatedHours && (
                      <Text variant="small" className="text-gray-500">
                        Estimated: {suggestion.estimatedHours} hours
                      </Text>
                    )}
                  </Stack>
                  {!isAccepted && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAccept(suggestion, index)}
                      disabled={isCreating}
                    >
                      Add Task
                    </Button>
                  )}
                </Flex>
              </div>
            )
          })}
        </Stack>
      </Stack>
    </Card>
  )
}