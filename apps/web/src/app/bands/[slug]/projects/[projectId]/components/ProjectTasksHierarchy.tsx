'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heading, Text, Stack, Flex, Badge, Button, Alert } from '@/components/ui'
import { TaskCreateForm } from './TaskCreateForm'
import { TaskSuggestions } from './TaskSuggestions'
import { trpc } from '@/lib/trpc'

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED'

interface TaskSuggestion {
  name: string
  description: string
  estimatedHours: number | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  order: number
  requiresVerification: boolean
}

interface ChecklistData {
  id: string
  description: string
  isCompleted: boolean
  assignee: { id: string; name: string } | null
}

interface ProjectTasksHierarchyProps {
  tasks: any[]
  bandSlug: string
  bandId: string
  bandMembers: any[]
  userId: string | null
  userRole: string
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
  aiRequiresDeliverable: boolean
  onAiRequiresDeliverableChange: (value: boolean) => void
}

// LocalStorage key for expansion state
const EXPANSION_STATE_KEY = 'project-tasks-expansion-state'

function getStoredExpansionState(projectId: string): string[] | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(`${EXPANSION_STATE_KEY}-${projectId}`)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to parse expansion state:', e)
  }
  return null
}

function saveExpansionState(projectId: string, tasks: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${EXPANSION_STATE_KEY}-${projectId}`, JSON.stringify(Array.from(tasks)))
  } catch (e) {
    console.error('Failed to save expansion state:', e)
  }
}

export function ProjectTasksHierarchy({
  tasks,
  bandSlug,
  bandId,
  bandMembers,
  userId,
  userRole,
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
  aiRequiresDeliverable,
  onAiRequiresDeliverableChange,
}: ProjectTasksHierarchyProps) {
  const router = useRouter()
  const utils = trpc.useUtils()

  // Get projectId from first task or empty string
  const projectId = tasks[0]?.projectId || ''

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [checklistCache, setChecklistCache] = useState<Record<string, ChecklistData[]>>({})
  const [expansionRestored, setExpansionRestored] = useState(false)

  // Restore expansion state from localStorage on mount
  useEffect(() => {
    if (projectId && !expansionRestored) {
      const stored = getStoredExpansionState(projectId)
      if (stored) {
        setExpandedTasks(new Set(stored))
      }
      setExpansionRestored(true)
    }
  }, [projectId, expansionRestored])

  // Save expansion state to localStorage when it changes
  useEffect(() => {
    if (projectId && expansionRestored) {
      saveExpansionState(projectId, expandedTasks)
    }
  }, [projectId, expandedTasks, expansionRestored])

  // Fetch checklist for expanded tasks after restoration
  useEffect(() => {
    if (!expansionRestored) return

    expandedTasks.forEach(async (taskId) => {
      if (!checklistCache[taskId]) {
        try {
          const result = await utils.project.getChecklistForTask.fetch({ taskId })
          if (result.checklistItems) {
            setChecklistCache(prev => ({ ...prev, [taskId]: result.checklistItems }))
          }
        } catch (error) {
          console.error('Failed to fetch checklist:', error)
        }
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expansionRestored])

  const toggleTask = useCallback(async (taskId: string) => {
    const newExpanded = new Set(expandedTasks)

    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)

      if (!checklistCache[taskId]) {
        try {
          const result = await utils.project.getChecklistForTask.fetch({ taskId })
          if (result.checklistItems) {
            setChecklistCache(prev => ({ ...prev, [taskId]: result.checklistItems }))
          }
        } catch (error) {
          console.error('Failed to fetch checklist:', error)
        }
      }
    }

    setExpandedTasks(newExpanded)
  }, [expandedTasks, checklistCache, utils])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '✅'
      case 'IN_PROGRESS': return '⏳'
      case 'IN_REVIEW': return '👁️'
      case 'BLOCKED': return '🚫'
      default: return '○'
    }
  }

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

  const renderTaskRow = (task: any) => {
    const isExpanded = expandedTasks.has(task.id)
    const checklistItems = checklistCache[task.id] || []
    const hasChecklist = task._count?.checklistItems > 0 || checklistItems.length > 0
    const checklistCount = task._count?.checklistItems || checklistItems.length
    const checklistCompleted = checklistItems.filter((c: ChecklistData) => c.isCompleted).length
    const isCompleted = task.status === 'COMPLETED'
    const statusIcon = getStatusIcon(task.status)
    const isAssignee = task.assigneeId === userId
    const canModifyTask = isAssignee || canUpdate
    const isHighlighted = highlightedTaskId === task.id

    return (
      <div key={task.id} className={`border-b border-gray-100 last:border-b-0 ${isHighlighted ? 'bg-blue-50' : ''}`}>
        {/* Task row */}
        <div className="flex items-start py-3 px-2 hover:bg-gray-50 group">
          {/* Expand toggle - 44px tap target on mobile */}
          <button
            onClick={(e) => { e.stopPropagation(); if (hasChecklist) toggleTask(task.id) }}
            className={`min-w-[44px] min-h-[44px] md:w-8 md:h-8 md:min-w-0 md:min-h-0 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0 ${!hasChecklist ? 'invisible' : ''}`}
            disabled={!hasChecklist}
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          {/* Task info */}
          <div className="flex-1 min-w-0 ml-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">{statusIcon}</span>
              <button
                onClick={() => router.push(`/bands/${bandSlug}/tasks/${task.id}`)}
                className="flex items-center gap-2 hover:text-blue-600 transition-colors group/nav"
                title="View task"
              >
                <Text weight="semibold" className={`truncate group-hover/nav:text-blue-600 ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                  {task.name}
                </Text>
                <span className="text-blue-500 font-bold text-lg">→</span>
              </button>
              {task.requiresVerification && !isCompleted && (
                <Badge variant="info">Needs Verification</Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap mt-1">
              {getStatusBadge(task.status)}
              {task.assignee ? (
                <span>Assigned: {task.assignee.name}</span>
              ) : (
                <Badge variant="warning">Unassigned</Badge>
              )}
              {hasChecklist && (
                <span>{checklistCompleted}/{checklistCount} items</span>
              )}
              {task.dueDate && (
                <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
              )}
            </div>

            {/* Action buttons */}
            {canModifyTask && !isCompleted && (
              <Flex gap="sm" className="flex-wrap mt-2">
                {task.status === 'TODO' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'IN_PROGRESS') }}
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
                        onClick={(e) => { e.stopPropagation(); onSubmitForVerification(task) }}
                        disabled={isUpdating}
                      >
                        Submit for Review
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'COMPLETED') }}
                        disabled={isUpdating}
                      >
                        Complete
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'BLOCKED') }}
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
                    onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'IN_PROGRESS') }}
                    disabled={isUpdating}
                  >
                    Unblock
                  </Button>
                )}
              </Flex>
            )}

            {task.status === 'IN_REVIEW' && canVerify && (
              <div className="mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onReview(task) }}
                >
                  Review
                </Button>
              </div>
            )}

            {/* Verification status */}
            {task.verificationStatus && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <Flex gap="sm" align="center" className="flex-wrap">
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
                </Flex>
              </div>
            )}
          </div>
        </div>

        {/* Expanded checklist - 8px indent mobile, 16px desktop */}
        {isExpanded && hasChecklist && (
          <div className="ml-2 md:ml-4 border-l-2 border-gray-200">
            {checklistItems.length === 0 ? (
              <div className="py-2 px-4 text-sm text-gray-400">Loading checklist...</div>
            ) : (
              checklistItems.map((item: ChecklistData) => (
                <div key={item.id} className="flex items-center py-1 px-1 md:px-2 hover:bg-gray-50 min-h-[44px] md:min-h-0">
                  {/* Spacer for alignment */}
                  <div className="w-4 md:w-6 flex-shrink-0" />

                  {/* Checklist info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 md:gap-2">
                      <span className="text-sm">{item.isCompleted ? '☑️' : '☐'}</span>
                      <button
                        onClick={() => router.push(`/bands/${bandSlug}/tasks/${task.id}/checklist/${item.id}`)}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors group/nav min-h-[44px] md:min-h-0"
                        title="View checklist item"
                      >
                        <Text variant="small" className={`truncate group-hover/nav:text-blue-600 ${item.isCompleted ? 'text-gray-400 line-through' : ''}`}>
                          {item.description}
                        </Text>
                        <span className="text-blue-500 font-bold text-sm">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    )
  }

  return (
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
          requiresDeliverable={aiRequiresDeliverable}
          onRequiresDeliverableChange={onAiRequiresDeliverableChange}
          bandId={bandId}
          userId={userId || ''}
          userRole={userRole}
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
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
          {tasks.map((task: any) => renderTaskRow(task))}
        </div>
      ) : (
        <Alert variant="info">
          <Text>No tasks yet. {canUpdate ? 'Click "Add Task" to create one or "Suggest Tasks" for AI recommendations.' : ''}</Text>
        </Alert>
      )}
    </Stack>
  )
}
