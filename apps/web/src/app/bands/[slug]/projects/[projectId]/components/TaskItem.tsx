'use client'

import { useRouter } from 'next/navigation'
import { Text, Stack, Flex, Badge, Button } from '@/components/ui'

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED'

interface TaskItemProps {
  task: any
  bandSlug: string
  isHighlighted: boolean
  isAssignee: boolean
  canUpdate: boolean
  canVerify: boolean
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onSubmitForVerification: (task: any) => void
  onReview: (task: any) => void
  isUpdating: boolean
}

export function TaskItem({
  task,
  bandSlug,
  isHighlighted,
  isAssignee,
  canUpdate,
  canVerify,
  onStatusChange,
  onSubmitForVerification,
  onReview,
  isUpdating,
}: TaskItemProps) {
  const router = useRouter()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TODO':
        return <Badge variant="neutral">To Do</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="info">In Progress</Badge>
      case 'IN_REVIEW':
        return <Badge variant="warning">In Review</Badge>
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>
      case 'BLOCKED':
        return <Badge variant="danger">Blocked</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return <Badge variant="neutral">Low</Badge>
      case 'MEDIUM':
        return <Badge variant="info">Medium</Badge>
      case 'HIGH':
        return <Badge variant="warning">High</Badge>
      case 'URGENT':
        return <Badge variant="danger">Urgent</Badge>
      default:
        return <Badge variant="neutral">{priority}</Badge>
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a button
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    router.push(`/bands/${bandSlug}/tasks/${task.id}`)
  }

  const canModifyTask = isAssignee || canUpdate
  const isCompleted = task.status === 'COMPLETED'

  return (
    <div
      onClick={handleClick}
      className={`p-4 border rounded-lg cursor-pointer transition hover:shadow-md ${
        isHighlighted ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
      } ${isCompleted ? 'opacity-60' : ''}`}
    >
      <Flex justify="between" align="start">
        <Stack spacing="sm" className="flex-1">
          <Flex gap="sm" align="center">
            <Text weight="semibold">{task.name}</Text>
            {task.requiresVerification && !isCompleted && (
              <Badge variant="info">Needs Verification</Badge>
            )}
          </Flex>
          
          {task.description && (
            <Text variant="small" className="text-gray-600">{task.description}</Text>
          )}
          
          <Flex gap="sm" className="flex-wrap">
            {getStatusBadge(task.status)}
            {getPriorityBadge(task.priority)}
            {task.assignee ? (
              <Badge variant="neutral">Assigned: {task.assignee.name}</Badge>
            ) : (
              <Badge variant="warning">Unassigned</Badge>
            )}
          </Flex>
          
          <Flex gap="md" className="flex-wrap">
            {task.dueDate && (
              <Text variant="small" className="text-gray-500">
                Due: {new Date(task.dueDate).toLocaleDateString()}
              </Text>
            )}
            {task.estimatedHours && (
              <Text variant="small" className="text-gray-500">
                Est: {task.estimatedHours}h
              </Text>
            )}
            {task.actualHours && (
              <Text variant="small" className="text-gray-500">
                Actual: {task.actualHours}h
              </Text>
            )}
          </Flex>
        </Stack>

        <Stack spacing="sm">
          {canModifyTask && !isCompleted && (
            <Flex gap="sm" className="flex-wrap">
              {task.status === 'TODO' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}
                  disabled={isUpdating}
                >
                  Start
                </Button>
              )}
              {task.status === 'IN_PROGRESS' && (
                <>
                  {task.requiresVerification ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onSubmitForVerification(task)}
                      disabled={isUpdating}
                    >
                      Submit for Review
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onStatusChange(task.id, 'COMPLETED')}
                      disabled={isUpdating}
                    >
                      Complete
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onStatusChange(task.id, 'BLOCKED')}
                    disabled={isUpdating}
                  >
                    Blocked
                  </Button>
                </>
              )}
              {task.status === 'BLOCKED' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}
                  disabled={isUpdating}
                >
                  Unblock
                </Button>
              )}
            </Flex>
          )}

          {task.status === 'IN_REVIEW' && canVerify && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onReview(task)}
            >
              Review
            </Button>
          )}
        </Stack>
      </Flex>

      {task.verificationStatus && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <Flex gap="sm" align="center">
            <Badge 
              variant={
                task.verificationStatus === 'APPROVED' 
                  ? 'success' 
                  : task.verificationStatus === 'REJECTED' 
                    ? 'danger' 
                    : 'warning'
              }
            >
              {task.verificationStatus}
            </Badge>
            {task.verifiedBy && (
              <Text variant="small" className="text-gray-500">
                by {task.verifiedBy.name}
              </Text>
            )}
            {task.verificationNotes && (
              <Text variant="small" className="text-gray-600">
                "{task.verificationNotes}"
              </Text>
            )}
          </Flex>
        </div>
      )}
    </div>
  )
}