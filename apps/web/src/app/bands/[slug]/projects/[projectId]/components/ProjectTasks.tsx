'use client'

import { Heading, Text, Stack, Flex, Card, Button, Alert } from '@/components/ui'
import { TaskItem } from './TaskItem'
import { TaskCreateForm } from './TaskCreateForm'
import { TaskSuggestions } from './TaskSuggestions'

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED'

interface TaskSuggestion {
  name: string
  description: string
  estimatedHours: number | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  order: number
  requiresVerification: boolean
}

interface ProjectTasksProps {
  tasks: any[]
  bandMembers: any[]
  userId: string | null
  highlightedTaskId: string | null
  canUpdate: boolean
  canVerify: boolean
  showCreateForm: boolean
  onShowCreateForm: (show: boolean) => void
  onCreateTask: (data: any) => void
  isCreating: boolean
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onSubmitForVerification: (task: any) => void
  onReview: (task: any) => void
  isUpdating: boolean
  // AI Suggestions props
  suggestions: TaskSuggestion[] | null
  onSuggestTasks: () => void
  onAcceptSuggestion: (suggestion: TaskSuggestion) => void
  onAcceptAllSuggestions: () => void
  onDismissSuggestions: () => void
  isSuggesting: boolean
  suggestionsCreatedCount: number
}

export function ProjectTasks({
  tasks,
  bandMembers,
  userId,
  highlightedTaskId,
  canUpdate,
  canVerify,
  showCreateForm,
  onShowCreateForm,
  onCreateTask,
  isCreating,
  onStatusChange,
  onSubmitForVerification,
  onReview,
  isUpdating,
  // AI Suggestions
  suggestions,
  onSuggestTasks,
  onAcceptSuggestion,
  onAcceptAllSuggestions,
  onDismissSuggestions,
  isSuggesting,
  suggestionsCreatedCount,
}: ProjectTasksProps) {
  return (
    <Card>
      <Stack spacing="lg">
        <Flex justify="between" align="center">
          <Heading level={2}>Tasks ({tasks.length})</Heading>
          {canUpdate && (
            <Flex gap="sm">
              <Button
                variant="secondary"
                size="sm"
                onClick={onSuggestTasks}
                disabled={isSuggesting || showCreateForm || !!suggestions}
              >
                {isSuggesting ? 'Thinking...' : '✨ Suggest Tasks'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onShowCreateForm(true)}
                disabled={showCreateForm}
              >
                + Add Task
              </Button>
            </Flex>
          )}
        </Flex>

        {suggestions && suggestions.length > 0 && (
          <TaskSuggestions
            suggestions={suggestions}
            onAccept={onAcceptSuggestion}
            onAcceptAll={onAcceptAllSuggestions}
            onDismiss={onDismissSuggestions}
            isCreating={isCreating}
            createdCount={suggestionsCreatedCount}
          />
        )}

        {showCreateForm && (
          <TaskCreateForm
            bandMembers={bandMembers}
            onSubmit={onCreateTask}
            onCancel={() => onShowCreateForm(false)}
            isSubmitting={isCreating}
          />
        )}

        {tasks.length > 0 ? (
          <Stack spacing="md">
            {tasks.map((task: any) => (
              <TaskItem
                key={task.id}
                task={task}
                isHighlighted={highlightedTaskId === task.id}
                isAssignee={task.assigneeId === userId}
                canUpdate={canUpdate}
                canVerify={canVerify}
                onStatusChange={onStatusChange}
                onSubmitForVerification={onSubmitForVerification}
                onReview={onReview}
                isUpdating={isUpdating}
              />
            ))}
          </Stack>
        ) : (
          <Alert variant="info">
            <Text>No tasks yet. {canUpdate ? 'Click "Add Task" to create one or "Suggest Tasks" for AI recommendations.' : ''}</Text>
          </Alert>
        )}
      </Stack>
    </Card>
  )
}