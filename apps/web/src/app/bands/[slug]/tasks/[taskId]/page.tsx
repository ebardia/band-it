'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Button,
  useToast,
  Flex,
  Card,
  Badge,
  Loading,
  Alert,
  BandLayout,
  DiscussionSidebar,
  Input,
  Textarea,
  Modal,
  IntegrityBlockModal,
  IntegrityWarningModal,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { TrainAIButton } from '@/components/ai'
import { TaskHeaderCompact } from './components/TaskHeaderCompact'

const CAN_UPDATE_TASK = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']
const CAN_VERIFY_TASK = ['FOUNDER', 'GOVERNOR', 'MODERATOR']
const CAN_USE_AI = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export default function TaskDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const utils = trpc.useUtils()
  const slug = params.slug as string
  const taskId = params.taskId as string
  
  const [userId, setUserId] = useState<string | null>(null)
  const [newItemText, setNewItemText] = useState('')
  const [newItemRequiresDeliverable, setNewItemRequiresDeliverable] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{
    description: string
    validation: {
      canProceed: boolean
      issues: any[]
    }
  }[]>([])
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set())
  const [aiRequiresDeliverable, setAiRequiresDeliverable] = useState(false)

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState<TaskPriority>('MEDIUM')
  const [editAssigneeId, setEditAssigneeId] = useState<string | null>(null)
  const [editDueDate, setEditDueDate] = useState('')
  const [editEstimatedHours, setEditEstimatedHours] = useState<number | null>(null)

  // Integrity Guard state (for checklist items)
  const [validationIssues, setValidationIssues] = useState<any[]>([])
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [pendingChecklistData, setPendingChecklistData] = useState<any>(null)

  // Integrity Guard state (for task edit)
  const [taskValidationIssues, setTaskValidationIssues] = useState<any[]>([])
  const [showTaskBlockModal, setShowTaskBlockModal] = useState(false)
  const [showTaskWarningModal, setShowTaskWarningModal] = useState(false)
  const [pendingTaskData, setPendingTaskData] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const { data: bandData } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const { data: taskData, isLoading: taskLoading, refetch: refetchTask } = trpc.task.getById.useQuery(
    { taskId },
    { enabled: !!taskId }
  )

  const { data: checklistData, refetch: refetchChecklist } = trpc.checklist.getByTask.useQuery(
    { taskId },
    { enabled: !!taskId }
  )

  const updateTaskMutation = trpc.task.update.useMutation({
    onSuccess: () => {
      showToast('Task updated!', 'success')
      refetchTask()
      setShowEditModal(false)
    },
    onError: (error: { message: string }) => {
      showToast(error.message, 'error')
    }
  })

  const createItemMutation = trpc.checklist.create.useMutation({
    onSuccess: () => {
      setNewItemText('')
      setNewItemRequiresDeliverable(false)
      refetchChecklist()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const createManyMutation = trpc.checklist.createMany.useMutation({
    onSuccess: (data) => {
      const msgs: string[] = []
      msgs.push(`Added ${data.items.length} checklist items!`)
      if (data.blockedCount > 0) {
        msgs.push(`${data.blockedCount} blocked by validation.`)
      }
      if (data.flaggedCount > 0) {
        msgs.push(`${data.flaggedCount} added with warnings.`)
      }
      showToast(msgs.join(' '), data.blockedCount > 0 ? 'warning' : 'success')
      setAiSuggestions([])
      setSelectedSuggestions(new Set())
      setAiRequiresDeliverable(false)
      refetchChecklist()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const toggleItemMutation = trpc.checklist.toggle.useMutation({
    onSuccess: () => {
      refetchChecklist()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const deleteItemMutation = trpc.checklist.delete.useMutation({
    onSuccess: () => {
      refetchChecklist()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const suggestItemsMutation = trpc.checklist.suggestItems.useMutation({
    onSuccess: (data) => {
      if (data.suggestions.length === 0) {
        showToast('All necessary checklist items already exist - no new suggestions needed', 'info')
      } else {
        setAiSuggestions(data.suggestions)
        // Only auto-select items that can proceed (not blocked)
        const selectableIndices = data.suggestions
          .map((s, i) => s.validation.canProceed ? i : -1)
          .filter(i => i !== -1)
        setSelectedSuggestions(new Set(selectableIndices))

        const blockedCount = data.suggestions.filter(s => !s.validation.canProceed).length
        const flaggedCount = data.suggestions.filter(s => s.validation.canProceed && s.validation.issues.length > 0).length

        if (blockedCount > 0) {
          showToast(`Generated ${data.suggestions.length} suggestions. ${blockedCount} blocked due to validation issues.`, 'warning')
        } else if (flaggedCount > 0) {
          showToast(`Generated ${data.suggestions.length} suggestions. ${flaggedCount} have minor alignment concerns.`, 'info')
        } else {
          showToast(`Generated ${data.suggestions.length} suggestions!`, 'success')
        }
      }
      // Refresh AI usage tracker
      utils.aiUsage.invalidate()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  // Integrity Guard validation mutation
  const validationMutation = trpc.validation.check.useMutation()

  // Task claim mutation
  const claimTaskMutation = trpc.task.claim.useMutation({
    onSuccess: () => {
      showToast('Task claimed!', 'success')
      refetchTask()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  // Task delete mutation
  const deleteTaskMutation = trpc.task.delete.useMutation({
    onSuccess: () => {
      showToast('Task deleted!', 'success')
      router.push(`/bands/${slug}/projects/${task?.projectId}`)
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  // Reorder checklist mutation
  const reorderChecklistMutation = trpc.reorder.reorderChecklistItem.useMutation({
    onSuccess: () => {
      refetchChecklist()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const handleReorderChecklist = (itemId: string, direction: 'up' | 'down') => {
    if (!userId) return
    reorderChecklistMutation.mutate({ itemId, direction, userId })
  }

  const handleClaimTask = () => {
    if (!userId) return
    claimTaskMutation.mutate({ taskId, userId })
  }

  const handleDeleteTask = () => {
    if (!userId) return
    if (!window.confirm('Are you sure you want to delete this task? This will also delete all checklist items. This action cannot be undone.')) return
    deleteTaskMutation.mutate({ taskId, userId })
  }

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!userId) return
    updateTaskMutation.mutate({
      taskId,
      userId,
      status: newStatus,
    })
  }

  const handleOpenEditModal = () => {
    if (!taskData?.task) return
    const task = taskData.task
    setEditName(task.name)
    setEditDescription(task.description || '')
    setEditPriority(task.priority as TaskPriority)
    setEditAssigneeId(task.assigneeId || null)
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '')
    setEditEstimatedHours(task.estimatedHours || null)
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!userId || !editName.trim()) return

    const taskEditData = {
      taskId,
      userId,
      name: editName,
      description: editDescription || null,
      priority: editPriority,
      assigneeId: editAssigneeId || undefined,
      dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined,
      estimatedHours: editEstimatedHours || undefined,
    }

    // Store data for potential later use
    setPendingTaskData(taskEditData)

    // Run integrity validation
    try {
      const validation = await validationMutation.mutateAsync({
        entityType: 'Task',
        action: 'update',
        bandId: taskData?.task?.bandId || '',
        data: {
          name: editName,
          description: editDescription || undefined,
        },
        parentId: taskData?.task?.projectId,
      })

      if (!validation.canProceed) {
        // BLOCK - show block modal, cannot proceed
        setTaskValidationIssues(validation.issues)
        setShowTaskBlockModal(true)
        return
      }

      if (validation.issues.length > 0) {
        // FLAG - show warning modal, user can choose to proceed
        setTaskValidationIssues(validation.issues)
        setShowTaskWarningModal(true)
        return
      }

      // All clear - update task normally
      updateTaskMutation.mutate(taskEditData)
    } catch (error) {
      // Validation failed - show error but don't update
      console.error('Validation error:', error)
      showToast('Unable to validate content. Please try again.', 'error')
    }
  }

  // Handle proceeding with warnings for task edit
  const handleProceedWithWarningsTask = () => {
    if (!pendingTaskData) return

    updateTaskMutation.mutate({
      ...pendingTaskData,
      proceedWithFlags: true,
      flagReasons: taskValidationIssues.map(i => `${i.type}_mismatch`),
      flagDetails: taskValidationIssues,
    })

    // Close modal and clear state
    setShowTaskWarningModal(false)
    setTaskValidationIssues([])
    setPendingTaskData(null)
  }

  // Handle canceling warning for task edit
  const handleCancelWarningTask = () => {
    setShowTaskWarningModal(false)
    setTaskValidationIssues([])
    setPendingTaskData(null)
  }

  // Handle closing block modal for task edit - keep modal open so user can edit and retry
  const handleCloseBlockTask = () => {
    setShowTaskBlockModal(false)
    setTaskValidationIssues([])
    setPendingTaskData(null)
  }

  const handleAddItem = async () => {
    if (!newItemText.trim() || !userId) return

    const checklistData = {
      taskId,
      description: newItemText,
      requiresDeliverable: newItemRequiresDeliverable,
      userId,
    }

    // Store data for potential later use
    setPendingChecklistData(checklistData)

    // Run integrity validation
    try {
      const validation = await validationMutation.mutateAsync({
        entityType: 'ChecklistItem',
        action: 'create',
        bandId: taskData?.task?.bandId || '',
        data: {
          description: newItemText,
        },
        parentId: taskId,
      })

      if (!validation.canProceed) {
        // BLOCK - show block modal, cannot proceed
        setValidationIssues(validation.issues)
        setShowBlockModal(true)
        return
      }

      if (validation.issues.length > 0) {
        // FLAG - show warning modal, user can choose to proceed
        setValidationIssues(validation.issues)
        setShowWarningModal(true)
        return
      }

      // All clear - create checklist item normally
      createItemMutation.mutate(checklistData)
    } catch (error) {
      // Validation failed - show error but don't create item
      console.error('Validation error:', error)
      showToast('Unable to validate content. Please try again.', 'error')
    }
  }

  // Handle proceeding with warnings for checklist
  const handleProceedWithWarningsChecklist = () => {
    if (!pendingChecklistData) return

    createItemMutation.mutate({
      ...pendingChecklistData,
      proceedWithFlags: true,
      flagReasons: validationIssues.map(i => `${i.type}_mismatch`),
      flagDetails: validationIssues,
    })

    // Close modal and clear state
    setShowWarningModal(false)
    setValidationIssues([])
    setPendingChecklistData(null)
  }

  // Handle canceling warning for checklist
  const handleCancelWarningChecklist = () => {
    setShowWarningModal(false)
    setValidationIssues([])
    setPendingChecklistData(null)
  }

  // Handle closing block modal for checklist - keep input so user can edit and retry
  const handleCloseBlockChecklist = () => {
    setShowBlockModal(false)
    setValidationIssues([])
    setPendingChecklistData(null)
  }

  const handleToggleItem = (itemId: string) => {
    if (!userId) return
    toggleItemMutation.mutate({ itemId, userId })
  }

  const handleDeleteItem = (itemId: string) => {
    if (!userId) return
    deleteItemMutation.mutate({ itemId, userId })
  }

  const handleGenerateSuggestions = () => {
    if (!userId) return
    suggestItemsMutation.mutate({ taskId, userId })
  }

  const handleToggleSuggestion = (index: number) => {
    // Don't allow toggling blocked items
    if (!aiSuggestions[index]?.validation.canProceed) return

    setSelectedSuggestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const handleAddSelectedSuggestions = () => {
    if (!userId || selectedSuggestions.size === 0) return
    const descriptions = aiSuggestions
      .filter((_, i) => selectedSuggestions.has(i))
      .map(s => s.description)
    createManyMutation.mutate({
      taskId,
      descriptions,
      userId,
      requiresDeliverable: aiRequiresDeliverable,
    })
  }

  const handleDismissSuggestions = () => {
    setAiSuggestions([])
    setSelectedSuggestions(new Set())
    setAiRequiresDeliverable(false)
  }

  const handleViewChecklistItem = (itemId: string) => {
    router.push(`/bands/${slug}/tasks/${taskId}/checklist/${itemId}`)
  }

  if (taskLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Task Details"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading task..." />
        </BandLayout>
      </>
    )
  }

  if (!taskData?.task) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Task Details"
          isMember={false}
          wide={true}
        >
          <Alert variant="danger">
            <Text>Task not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const task = taskData.task
  const band = task.band
  const checklistItems = checklistData?.items || []
  const completedCount = checklistItems.filter(item => item.isCompleted).length
  const totalCount = checklistItems.length

  const currentMember = band?.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band?.whoCanApprove?.includes(currentMember.role)
  const isMember = !!currentMember
  const canUpdate = currentMember && CAN_UPDATE_TASK.includes(currentMember.role)
  const canVerify = currentMember && CAN_VERIFY_TASK.includes(currentMember.role)
  const canUseAI = currentMember && CAN_USE_AI.includes(currentMember.role)
  const isAssignee = task.assigneeId === userId

  const priorityOptions: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band?.name || ''}
        bandImageUrl={band?.imageUrl}
        pageTitle={task.name}
        canApprove={canApprove || false}
        isMember={isMember}
        wide={true}
        rightSidebar={
          <DiscussionSidebar
            taskId={taskId}
            userId={userId}
            bandMembers={band?.members || []}
          />
        }
      >
        <Stack spacing="md">
          {/* Breadcrumb */}
          <Flex gap="sm" align="center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/bands/${slug}/projects/${task.projectId}`)}
            >
              ← {task.project.name}
            </Button>
          </Flex>

          {/* Compact Task Header */}
          <Card>
            <TaskHeaderCompact
              task={task}
              bandSlug={slug}
              canUpdate={!!canUpdate}
              isAssignee={isAssignee}
              isMember={isMember}
              onEdit={handleOpenEditModal}
              onStatusChange={handleStatusChange}
              onClaim={handleClaimTask}
              onDelete={handleDeleteTask}
              isUpdating={updateTaskMutation.isPending}
              isClaiming={claimTaskMutation.isPending}
              isDeleting={deleteTaskMutation.isPending}
            />
          </Card>

          {/* Checklist */}
          <Card>
            <Stack spacing="md">
              <Flex justify="between" align="center">
                <Heading level={3}>Checklist</Heading>
                <Flex gap="sm" align="center">
                  {totalCount > 0 && (
                    <Badge variant={completedCount === totalCount ? 'success' : 'neutral'}>
                      {completedCount}/{totalCount} completed
                    </Badge>
                  )}
                  {canUseAI && aiSuggestions.length === 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleGenerateSuggestions}
                      disabled={suggestItemsMutation.isPending}
                    >
                      {suggestItemsMutation.isPending ? '✨ Generating...' : '✨ AI Suggest'}
                    </Button>
                  )}
                </Flex>
              </Flex>

              {/* AI Suggestions Panel */}
              {aiSuggestions.length > 0 && (
                <Card className="bg-purple-50 border-purple-200">
                  <Stack spacing="md">
                    <Flex justify="between" align="center">
                      <Text weight="semibold" className="text-purple-800">
                        ✨ AI Suggestions
                      </Text>
                      <Text variant="small" color="muted">
                        {selectedSuggestions.size} of {aiSuggestions.filter(s => s.validation.canProceed).length} selectable
                      </Text>
                    </Flex>

                    <Stack spacing="sm">
                      {aiSuggestions.map((suggestion, index) => {
                        const isBlocked = !suggestion.validation.canProceed
                        const isFlagged = suggestion.validation.canProceed && suggestion.validation.issues.length > 0

                        return (
                          <Flex
                            key={index}
                            gap="sm"
                            align="start"
                            className={`${isBlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isFlagged ? 'bg-yellow-50 p-2 rounded' : ''} ${isBlocked ? 'bg-red-50 p-2 rounded' : ''}`}
                            onClick={() => handleToggleSuggestion(index)}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleSuggestion(index)
                              }}
                              disabled={isBlocked}
                            >
                              {isBlocked ? '🚫' : selectedSuggestions.has(index) ? '☑️' : '⬜'}
                            </Button>
                            <Stack spacing="xs" className="flex-1">
                              <Text
                                variant="small"
                                className={isBlocked ? 'line-through text-gray-500' : isFlagged ? 'text-yellow-800' : ''}
                              >
                                {suggestion.description}
                              </Text>
                              {isBlocked && suggestion.validation.issues.length > 0 && (
                                <Text variant="small" className="text-red-600">
                                  Blocked: {suggestion.validation.issues[0]?.suggestion || 'Does not align with task scope'}
                                </Text>
                              )}
                              {isFlagged && (
                                <Text variant="small" className="text-yellow-700">
                                  Warning: {suggestion.validation.issues[0]?.suggestion || 'Minor alignment concerns'}
                                </Text>
                              )}
                            </Stack>
                          </Flex>
                        )
                      })}
                    </Stack>

                    <Flex gap="sm" align="center" className="pt-2 border-t border-purple-200">
                      <input
                        type="checkbox"
                        id="aiRequiresDeliverable"
                        checked={aiRequiresDeliverable}
                        onChange={(e) => setAiRequiresDeliverable(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="aiRequiresDeliverable" className="text-sm text-purple-800">
                        Require deliverable for these items
                      </label>
                    </Flex>

                    <Flex gap="sm" justify="between" align="center">
                      <TrainAIButton
                        bandId={band?.id || ''}
                        userId={userId || ''}
                        userRole={currentMember?.role || ''}
                        contextOperation="checklist_suggestions"
                        placeholder="e.g., 'Include items for documentation' or 'Focus on items that can be done in 15 minutes'"
                      />
                      <Flex gap="sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDismissSuggestions}
                        >
                          Dismiss
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleAddSelectedSuggestions}
                          disabled={selectedSuggestions.size === 0 || createManyMutation.isPending}
                        >
                          {createManyMutation.isPending
                            ? 'Adding...'
                            : `Add ${selectedSuggestions.size} Items`
                          }
                        </Button>
                      </Flex>
                    </Flex>
                  </Stack>
                </Card>
              )}

              {checklistItems.length === 0 && aiSuggestions.length === 0 ? (
                <Text variant="small" color="muted">No checklist items yet. Add items to track progress or use AI to suggest some.</Text>
              ) : checklistItems.length > 0 ? (
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                  {checklistItems.map((item: any, index: number) => {
                    const isFirst = index === 0
                    const isLast = index === checklistItems.length - 1
                    const canReorderItem = canUpdate || (item.assignee && userId && item.assignee.id === userId)

                    return (
                      <div key={item.id} className="flex items-start py-2 px-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 group/item">
                        {/* Toggle checkbox */}
                        <button
                          onClick={() => handleToggleItem(item.id)}
                          disabled={toggleItemMutation.isPending}
                          className="min-w-[44px] min-h-[44px] md:w-8 md:h-8 md:min-w-0 md:min-h-0 flex items-center justify-center flex-shrink-0"
                        >
                          <span className="text-lg">{item.isCompleted ? '☑️' : '☐'}</span>
                        </button>

                        {/* Item info */}
                        <div className="flex-1 min-w-0 ml-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleViewChecklistItem(item.id)}
                              className="flex items-center gap-1 hover:text-blue-600 transition-colors group/nav min-h-[44px] md:min-h-0"
                              title="View checklist item"
                            >
                              <Text
                                variant="small"
                                weight="semibold"
                                className={`truncate group-hover/nav:text-blue-600 ${item.isCompleted ? 'text-gray-400 line-through' : ''}`}
                              >
                                {item.description}
                              </Text>
                              <span className="text-blue-500 font-bold text-sm">→</span>
                            </button>
                            {item.isCompleted && item.completedBy && (
                              <Text variant="small" color="muted">
                                — {item.completedBy.name}
                              </Text>
                            )}
                          </div>
                          {/* Additional info badges + reorder/delete buttons */}
                          <Flex gap="sm" className="flex-wrap mt-1 items-center">
                            {item.assignee && (
                              <Badge variant="info">{item.assignee.name}</Badge>
                            )}
                            {item.dueDate && (
                              <Badge
                                variant={new Date(item.dueDate) < new Date() && !item.isCompleted ? 'danger' : 'neutral'}
                              >
                                Due: {new Date(item.dueDate).toLocaleDateString()}
                              </Badge>
                            )}
                            {item.files && item.files.length > 0 && (
                              <Badge variant="neutral">📎 {item.files.length}</Badge>
                            )}
                            {/* Reorder and delete buttons */}
                            <div className="flex items-center gap-1 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity">
                              {canReorderItem && (
                                <>
                                  <button
                                    onClick={() => handleReorderChecklist(item.id, 'up')}
                                    disabled={isFirst || reorderChecklistMutation.isPending}
                                    className={`p-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded ${isFirst ? 'invisible' : ''}`}
                                    title="Move up"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    onClick={() => handleReorderChecklist(item.id, 'down')}
                                    disabled={isLast || reorderChecklistMutation.isPending}
                                    className={`p-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded ${isLast ? 'invisible' : ''}`}
                                    title="Move down"
                                  >
                                    ▼
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                disabled={deleteItemMutation.isPending}
                                className="p-1 text-xs text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                                title="Delete item"
                              >
                                ✕
                              </button>
                            </div>
                          </Flex>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              <Stack spacing="sm">
                <Flex gap="sm" align="end">
                  <Input
                    placeholder="Add a checklist item..."
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddItem()
                      }
                    }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddItem}
                    disabled={createItemMutation.isPending || validationMutation.isPending || !newItemText.trim()}
                  >
                    {validationMutation.isPending ? '...' : 'Add'}
                  </Button>
                </Flex>
                <Flex gap="sm" align="center">
                  <input
                    type="checkbox"
                    id="requiresDeliverable"
                    checked={newItemRequiresDeliverable}
                    onChange={(e) => setNewItemRequiresDeliverable(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="requiresDeliverable" className="text-sm text-gray-600">
                    Requires deliverable (summary of work when completing)
                  </label>
                </Flex>
              </Stack>
            </Stack>
          </Card>

        </Stack>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Task"
        >
          <Stack spacing="md">
            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Task Name</Text>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Task name"
              />
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Description</Text>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Task description"
                rows={3}
              />
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Priority</Text>
              <Flex gap="sm">
                {priorityOptions.map((priority) => (
                  <Button
                    key={priority}
                    variant={editPriority === priority ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setEditPriority(priority)}
                  >
                    {priority}
                  </Button>
                ))}
              </Flex>
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Assignee</Text>
              <Flex gap="sm" className="flex-wrap">
                <Button
                  variant={editAssigneeId === null ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setEditAssigneeId(null)}
                >
                  Unassigned
                </Button>
                {band?.members.map((member: any) => (
                  <Button
                    key={member.user.id}
                    variant={editAssigneeId === member.user.id ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setEditAssigneeId(member.user.id)}
                  >
                    {member.user.name}
                  </Button>
                ))}
              </Flex>
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Due Date</Text>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Estimated Hours</Text>
              <Input
                type="number"
                value={editEstimatedHours || ''}
                onChange={(e) => setEditEstimatedHours(e.target.value ? Number(e.target.value) : null)}
                placeholder="e.g. 4"
              />
            </Stack>

            <Flex gap="sm" justify="end">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEdit}
                disabled={updateTaskMutation.isPending || validationMutation.isPending || !editName.trim()}
              >
                {validationMutation.isPending ? 'Checking...' : updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Integrity Guard Modals - Checklist Items */}
        <IntegrityBlockModal
          isOpen={showBlockModal}
          onClose={handleCloseBlockChecklist}
          issues={validationIssues}
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
        />

        <IntegrityWarningModal
          isOpen={showWarningModal}
          onClose={handleCancelWarningChecklist}
          onProceed={handleProceedWithWarningsChecklist}
          issues={validationIssues}
          isProceeding={createItemMutation.isPending}
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
        />

        {/* Integrity Guard Modals - Task Edit */}
        <IntegrityBlockModal
          isOpen={showTaskBlockModal}
          onClose={handleCloseBlockTask}
          issues={taskValidationIssues}
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
        />

        <IntegrityWarningModal
          isOpen={showTaskWarningModal}
          onClose={handleCancelWarningTask}
          onProceed={handleProceedWithWarningsTask}
          issues={taskValidationIssues}
          isProceeding={updateTaskMutation.isPending}
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
        />
      </BandLayout>
    </>
  )
}