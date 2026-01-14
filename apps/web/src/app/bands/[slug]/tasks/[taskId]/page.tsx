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
  PageWrapper,
  DashboardContainer,
  Flex,
  Card,
  Badge,
  Loading,
  Alert,
  BandSidebar,
  DiscussionSidebar,
  Input,
  Textarea,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

const CAN_UPDATE_TASK = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']
const CAN_VERIFY_TASK = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED'

export default function TaskDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const slug = params.slug as string
  const taskId = params.taskId as string
  
  const [userId, setUserId] = useState<string | null>(null)
  const [newItemText, setNewItemText] = useState('')

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

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!userId) return
    updateTaskMutation.mutate({
      taskId,
      userId,
      status: newStatus,
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
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer wide>
          <Loading message="Loading task..." />
        </DashboardContainer>
      </PageWrapper>
    )
  }

  if (!taskData?.task) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer wide>
          <Alert variant="danger">
            <Text>Task not found</Text>
          </Alert>
        </DashboardContainer>
      </PageWrapper>
    )
  }

  const task = taskData.task
  const band = bandData?.band
  const checklistItems = checklistData?.items || []
  const completedCount = checklistItems.filter(item => item.isCompleted).length
  const totalCount = checklistItems.length

  const currentMember = band?.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band?.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const canUpdate = currentMember && CAN_UPDATE_TASK.includes(currentMember.role)
  const canVerify = currentMember && CAN_VERIFY_TASK.includes(currentMember.role)
  const isAssignee = task.assigneeId === userId

  const statusOptions: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED']

  return (
    <PageWrapper variant="dashboard">
      <AppNav />

      <DashboardContainer wide>
        <Flex gap="md" align="start">
          <BandSidebar 
            bandSlug={slug} 
            canApprove={canApprove || false} 
            isMember={isMember}
          />

          <Stack spacing="lg" className="flex-1 max-w-3xl">
            {/* Breadcrumb */}
            <Card className="p-4">
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
                <Text color="muted">/</Text>
                <Text weight="semibold">{task.name}</Text>
              </Flex>
            </Card>

            {/* Task Header */}
            <Card className="p-8">
              <Stack spacing="lg">
                <Stack spacing="sm">
                  <Heading level={1}>{task.name}</Heading>
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
                </Stack>

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
                  {totalCount > 0 && (
                    <Badge variant={completedCount === totalCount ? 'success' : 'neutral'}>
                      {completedCount}/{totalCount} completed
                    </Badge>
                  )}
                </Flex>

                {checklistItems.length === 0 ? (
                  <Text variant="small" color="muted">No checklist items yet. Add items to track progress.</Text>
                ) : (
                  <Stack spacing="sm">
                    {checklistItems.map((item) => (
                      <Flex key={item.id} gap="sm" align="center" justify="between">
                        <Flex gap="sm" align="center" className="flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleItem(item.id)}
                            disabled={toggleItemMutation.isPending}
                          >
                            {item.isCompleted ? '☑️' : '⬜'}
                          </Button>
                          <Text 
                            variant="small" 
                            style={{ 
                              textDecoration: item.isCompleted ? 'line-through' : 'none',
                              opacity: item.isCompleted ? 0.6 : 1 
                            }}
                          >
                            {item.description}
                          </Text>
                          {item.isCompleted && item.completedBy && (
                            <Text variant="small" color="muted">
                              — {item.completedBy.name}
                            </Text>
                          )}
                        </Flex>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deleteItemMutation.isPending}
                        >
                          ✕
                        </Button>
                      </Flex>
                    ))}
                  </Stack>
                )}

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

          <DiscussionSidebar
            taskId={taskId}
            userId={userId}
            bandMembers={band?.members || []}
          />
        </Flex>
      </DashboardContainer>
    </PageWrapper>
  )
}