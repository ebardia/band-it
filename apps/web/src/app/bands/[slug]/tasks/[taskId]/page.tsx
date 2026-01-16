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
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

const CAN_UPDATE_TASK = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']
const CAN_VERIFY_TASK = ['FOUNDER', 'GOVERNOR', 'MODERATOR']
const CAN_USE_AI = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export default function TaskDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const slug = params.slug as string
  const taskId = params.taskId as string
  
  const [userId, setUserId] = useState<string | null>(null)
  const [newItemText, setNewItemText] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set())
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState<TaskPriority>('MEDIUM')
  const [editAssigneeId, setEditAssigneeId] = useState<string | null>(null)
  const [editDueDate, setEditDueDate] = useState('')
  const [editEstimatedHours, setEditEstimatedHours] = useState<number | null>(null)

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
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const createItemMutation = trpc.checklist.create.useMutation({
    onSuccess: () => {
      setNewItemText('')
      refetchChecklist()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const createManyMutation = trpc.checklist.createMany.useMutation({
    onSuccess: (data) => {
      showToast(`Added ${data.items.length} checklist items!`, 'success')
      setAiSuggestions([])
      setSelectedSuggestions(new Set())
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
      setAiSuggestions(data.suggestions)
      setSelectedSuggestions(new Set(data.suggestions.map((_, i) => i)))
      showToast(`Generated ${data.suggestions.length} suggestions!`, 'success')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

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

  const handleSaveEdit = () => {
    if (!userId || !editName.trim()) return
    updateTaskMutation.mutate({
      taskId,
      userId,
      name: editName,
      description: editDescription || undefined,
      priority: editPriority,
      assigneeId: editAssigneeId || undefined,
      dueDate: editDueDate ? new Date(editDueDate) : undefined,
      estimatedHours: editEstimatedHours || undefined,
    })
  }

  const handleAddItem = () => {
    if (!newItemText.trim() || !userId) return
    createItemMutation.mutate({
      taskId,
      description: newItemText,
      userId,
    })
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
    const descriptions = aiSuggestions.filter((_, i) => selectedSuggestions.has(i))
    createManyMutation.mutate({
      taskId,
      descriptions,
      userId,
    })
  }

  const handleDismissSuggestions = () => {
    setAiSuggestions([])
    setSelectedSuggestions(new Set())
  }

  const handleViewChecklistItem = (itemId: string) => {
    router.push(`/bands/${slug}/tasks/${taskId}/checklist/${itemId}`)
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

  const statusOptions: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED']
  const priorityOptions: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band?.name || ''}
        pageTitle={task.name}
        canApprove={canApprove || false}
        isMember={isMember}
        wide={true}
        action={
          (canUpdate || isAssignee) ? (
            <Button variant="secondary" size="md" onClick={handleOpenEditModal}>
              Edit Task
            </Button>
          ) : undefined
        }
        rightSidebar={
          <DiscussionSidebar
            taskId={taskId}
            userId={userId}
            bandMembers={band?.members || []}
          />
        }
      >
        <Stack spacing="lg">
          {/* Breadcrumb */}
          <Flex gap="sm" align="center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/bands/${slug}/tasks`)}
            >
              ← Tasks
            </Button>
            <Text color="muted">/</Text>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/bands/${slug}/projects/${task.projectId}`)}
            >
              {task.project.name}
            </Button>
          </Flex>

          {/* Task Info */}
          <Card>
            <Stack spacing="lg">
              <Flex gap="sm" className="flex-wrap">
                {getStatusBadge(task.status)}
                {getPriorityBadge(task.priority)}
                {task.assignee && (
                  <Badge variant="neutral">Assigned: {task.assignee.name}</Badge>
                )}
                {!task.assignee && (
                  <Badge variant="warning">Unassigned</Badge>
                )}
                {task.requiresVerification && (
                  <Badge variant="info">Requires Verification</Badge>
                )}
              </Flex>

              {task.description && (
                <Text style={{ whiteSpace: 'pre-wrap' }}>{task.description}</Text>
              )}

              <Flex gap="lg" className="flex-wrap">
                {task.dueDate && (
                  <Stack spacing="xs">
                    <Text variant="small" weight="semibold">Due Date</Text>
                    <Text variant="small">{new Date(task.dueDate).toLocaleDateString()}</Text>
                  </Stack>
                )}
                {task.estimatedHours && (
                  <Stack spacing="xs">
                    <Text variant="small" weight="semibold">Estimated</Text>
                    <Text variant="small">{task.estimatedHours} hours</Text>
                  </Stack>
                )}
                {task.actualHours && (
                  <Stack spacing="xs">
                    <Text variant="small" weight="semibold">Actual</Text>
                    <Text variant="small">{task.actualHours} hours</Text>
                  </Stack>
                )}
                <Stack spacing="xs">
                  <Text variant="small" weight="semibold">Created</Text>
                  <Text variant="small">{new Date(task.createdAt).toLocaleDateString()}</Text>
                </Stack>
              </Flex>
            </Stack>
          </Card>

          {/* Status Update */}
          {(canUpdate || isAssignee) && (
            <Card>
              <Stack spacing="md">
                <Heading level={3}>Update Status</Heading>
                <Flex gap="sm" className="flex-wrap">
                  {statusOptions.map((status) => (
                    <Button
                      key={status}
                      variant={task.status === status ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => handleStatusChange(status)}
                      disabled={updateTaskMutation.isPending}
                    >
                      {status.replace('_', ' ')}
                    </Button>
                  ))}
                </Flex>
              </Stack>
            </Card>
          )}

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
                        {selectedSuggestions.size} of {aiSuggestions.length} selected
                      </Text>
                    </Flex>
                    
                    <Stack spacing="sm">
                      {aiSuggestions.map((suggestion, index) => (
                        <Flex 
                          key={index} 
                          gap="sm" 
                          align="center"
                          className="cursor-pointer"
                          onClick={() => handleToggleSuggestion(index)}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleSuggestion(index)
                            }}
                          >
                            {selectedSuggestions.has(index) ? '☑️' : '⬜'}
                          </Button>
                          <Text variant="small">{suggestion}</Text>
                        </Flex>
                      ))}
                    </Stack>

                    <Flex gap="sm" justify="end">
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
                  </Stack>
                </Card>
              )}

              {checklistItems.length === 0 && aiSuggestions.length === 0 ? (
                <Text variant="small" color="muted">No checklist items yet. Add items to track progress or use AI to suggest some.</Text>
              ) : checklistItems.length > 0 ? (
                <Stack spacing="sm">
                  {checklistItems.map((item: any) => (
                    <Card key={item.id} className="bg-gray-50 p-3">
                      <Flex gap="sm" align="start" justify="between">
                        <Flex gap="sm" align="start" className="flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleItem(item.id)}
                            disabled={toggleItemMutation.isPending}
                          >
                            {item.isCompleted ? '☑️' : '⬜'}
                          </Button>
                          <Stack spacing="xs" className="flex-1">
                            <Flex gap="sm" align="center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewChecklistItem(item.id)}
                                className="p-0 h-auto"
                              >
                                <Text 
                                  variant="small" 
                                  weight="semibold"
                                  color="primary"
                                  style={{ 
                                    textDecoration: item.isCompleted ? 'line-through' : 'none',
                                    opacity: item.isCompleted ? 0.6 : 1 
                                  }}
                                >
                                  {item.description}
                                </Text>
                              </Button>
                              {item.isCompleted && item.completedBy && (
                                <Text variant="small" color="muted">
                                  — {item.completedBy.name}
                                </Text>
                              )}
                            </Flex>
                            {/* Additional info badges */}
                            <Flex gap="sm" className="flex-wrap">
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
                            </Flex>
                          </Stack>
                        </Flex>
                        <Flex gap="sm">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewChecklistItem(item.id)}
                          >
                            →
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={deleteItemMutation.isPending}
                          >
                            ✕
                          </Button>
                        </Flex>
                      </Flex>
                    </Card>
                  ))}
                </Stack>
              ) : null}

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
                  disabled={createItemMutation.isPending || !newItemText.trim()}
                >
                  Add
                </Button>
              </Flex>
            </Stack>
          </Card>

          {/* Verification Status */}
          {task.requiresVerification && task.verificationStatus && (
            <Card>
              <Stack spacing="md">
                <Heading level={3}>Verification</Heading>
                <Flex gap="md" align="center">
                  <Badge 
                    variant={
                      task.verificationStatus === 'APPROVED' ? 'success' : 
                      task.verificationStatus === 'REJECTED' ? 'danger' : 'warning'
                    }
                  >
                    {task.verificationStatus}
                  </Badge>
                  {task.verifiedBy && (
                    <Text variant="small" color="muted">
                      by {task.verifiedBy.name} on {new Date(task.verifiedAt).toLocaleDateString()}
                    </Text>
                  )}
                </Flex>
                {task.verificationNotes && (
                  <Text variant="small">{task.verificationNotes}</Text>
                )}
              </Stack>
            </Card>
          )}

          {/* Proof/Evidence */}
          {task.proofDescription && (
            <Card>
              <Stack spacing="md">
                <Heading level={3}>Proof of Completion</Heading>
                <Text>{task.proofDescription}</Text>
              </Stack>
            </Card>
          )}

          {/* Back to Project */}
          <Button
            variant="ghost"
            size="md"
            onClick={() => router.push(`/bands/${slug}/projects/${task.projectId}`)}
          >
            ← Back to Project
          </Button>
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
                disabled={updateTaskMutation.isPending || !editName.trim()}
              >
                {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </Flex>
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}