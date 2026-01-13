'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
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
  Input,
  Modal
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

// Roles that can update projects/tasks
const CAN_UPDATE_PROJECT = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']
const CAN_VERIFY_TASK = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const TASK_STATUS_OPTIONS = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'BLOCKED', label: 'Blocked' },
]

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const projectId = params.projectId as string
  const highlightedTaskId = searchParams.get('task')
  const { showToast } = useToast()
  
  const [userId, setUserId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifyNotes, setVerifyNotes] = useState('')
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    priority: 'MEDIUM',
    startDate: '',
    targetDate: '',
    estimatedBudget: '',
    estimatedHours: '',
    deliverables: '',
    successCriteria: '',
    tags: '',
    leadId: '',
  })

  // New task form state
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    priority: 'MEDIUM',
    assigneeId: '',
    dueDate: '',
    estimatedHours: '',
    estimatedCost: '',
    requiresVerification: true,
    tags: '',
  })

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

  const { data: projectData, isLoading: projectLoading, refetch: refetchProject } = trpc.project.getById.useQuery(
    { projectId },
    { enabled: !!projectId }
  )

  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = trpc.task.getByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  )

  const updateProjectMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      showToast('Project updated!', 'success')
      setIsEditing(false)
      refetchProject()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const createTaskMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      showToast('Task created!', 'success')
      setShowCreateTask(false)
      resetTaskForm()
      refetchTasks()
      refetchProject()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const updateTaskMutation = trpc.task.update.useMutation({
    onSuccess: () => {
      showToast('Task updated!', 'success')
      refetchTasks()
      refetchProject()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const submitForVerificationMutation = trpc.task.submitForVerification.useMutation({
    onSuccess: () => {
      showToast('Task submitted for verification!', 'success')
      setSelectedTask(null)
      refetchTasks()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const verifyTaskMutation = trpc.task.verify.useMutation({
    onSuccess: (_, variables) => {
      showToast(variables.approved ? 'Task approved!' : 'Task sent back for revision', 'success')
      setShowVerifyModal(false)
      setSelectedTask(null)
      setVerifyNotes('')
      refetchTasks()
      refetchProject()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const resetTaskForm = () => {
    setNewTask({
      name: '',
      description: '',
      priority: 'MEDIUM',
      assigneeId: '',
      dueDate: '',
      estimatedHours: '',
      estimatedCost: '',
      requiresVerification: true,
      tags: '',
    })
  }

  const handleStatusChange = (newStatus: ProjectStatus) => {
    updateProjectMutation.mutate({
      projectId,
      userId: userId!,
      status: newStatus,
    })
  }

  const handleSaveEdit = () => {
    updateProjectMutation.mutate({
      projectId,
      userId: userId!,
      name: editForm.name || undefined,
      description: editForm.description || undefined,
      priority: editForm.priority as ProjectPriority,
      startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : null,
      targetDate: editForm.targetDate ? new Date(editForm.targetDate).toISOString() : null,
      estimatedBudget: editForm.estimatedBudget ? parseFloat(editForm.estimatedBudget) : null,
      estimatedHours: editForm.estimatedHours ? parseInt(editForm.estimatedHours) : null,
      deliverables: editForm.deliverables || null,
      successCriteria: editForm.successCriteria || null,
      tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      leadId: editForm.leadId || null,
    })
  }

  const handleCreateTask = () => {
    if (!newTask.name.trim()) {
      showToast('Task name is required', 'error')
      return
    }
    createTaskMutation.mutate({
      projectId,
      name: newTask.name.trim(),
      description: newTask.description.trim() || undefined,
      priority: newTask.priority as TaskPriority,
      assigneeId: newTask.assigneeId || undefined,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined,
      estimatedHours: newTask.estimatedHours ? parseInt(newTask.estimatedHours) : undefined,
      estimatedCost: newTask.estimatedCost ? parseFloat(newTask.estimatedCost) : undefined,
      requiresVerification: newTask.requiresVerification,
      tags: newTask.tags ? newTask.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      userId: userId!,
    })
  }

  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTaskMutation.mutate({
      taskId,
      userId: userId!,
      status: newStatus,
    })
  }

  const startEditing = () => {
    if (projectData?.project) {
      const p = projectData.project
      setEditForm({
        name: p.name || '',
        description: p.description || '',
        priority: p.priority || 'MEDIUM',
        startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
        targetDate: p.targetDate ? new Date(p.targetDate).toISOString().split('T')[0] : '',
        estimatedBudget: p.estimatedBudget ? String(p.estimatedBudget) : '',
        estimatedHours: p.estimatedHours ? String(p.estimatedHours) : '',
        deliverables: p.deliverables || '',
        successCriteria: p.successCriteria || '',
        tags: p.tags?.join(', ') || '',
        leadId: p.lead?.id || '',
      })
      setIsEditing(true)
    }
  }

  if (projectLoading || tasksLoading) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer>
          <Loading message="Loading project..." />
        </DashboardContainer>
      </PageWrapper>
    )
  }

  if (!projectData?.project) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer>
          <Alert variant="danger">
            <Text>Project not found</Text>
          </Alert>
        </DashboardContainer>
      </PageWrapper>
    )
  }

  const project = projectData.project
  const band = project.band
  const proposal = project.proposal
  const tasks = tasksData?.tasks || []
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canUpdateProject = currentMember && CAN_UPDATE_PROJECT.includes(currentMember.role)
  const canVerifyTasks = currentMember && CAN_VERIFY_TASK.includes(currentMember.role)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return <Badge variant="info">Planning</Badge>
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>
      case 'ON_HOLD':
        return <Badge variant="warning">On Hold</Badge>
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>
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

  const getTaskStatusBadge = (status: string) => {
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

  const statusOptions: { value: ProjectStatus; label: string }[] = [
    { value: 'PLANNING', label: 'Planning' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ON_HOLD', label: 'On Hold' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ]

  const formatCurrency = (amount: any) => {
    if (!amount) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Group tasks by status
  const tasksByStatus = {
    TODO: tasks.filter((t: any) => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter((t: any) => t.status === 'IN_PROGRESS'),
    IN_REVIEW: tasks.filter((t: any) => t.status === 'IN_REVIEW'),
    COMPLETED: tasks.filter((t: any) => t.status === 'COMPLETED'),
    BLOCKED: tasks.filter((t: any) => t.status === 'BLOCKED'),
  }

  return (
    <PageWrapper variant="dashboard">
      <AppNav />

      <DashboardContainer>
        <Flex gap="md" align="start">
          {/* Left Sidebar */}
          <BandSidebar 
            bandSlug={slug} 
            canApprove={false} 
            isMember={!!currentMember}
            canCreateProposal={canUpdateProject}
          />

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-lg shadow p-8">
            <Stack spacing="xl">
              {/* Breadcrumb */}
              <Flex gap="sm" className="text-gray-500 text-sm">
                <button 
                  onClick={() => router.push(`/bands/${slug}/projects`)}
                  className="hover:text-blue-600"
                >
                  Projects
                </button>
                <span>/</span>
                <span className="text-gray-700">{project.name}</span>
              </Flex>

              {/* Header */}
              {isEditing ? (
                <Card>
                  <Stack spacing="lg">
                    <Heading level={3}>Edit Project</Heading>
                    
                    {/* Basic Info */}
                    <Stack spacing="md">
                      <Input
                        label="Project Name *"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priority
                        </label>
                        <select
                          value={editForm.priority}
                          onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {PRIORITY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </Stack>

                    {/* Timeline */}
                    <Stack spacing="md">
                      <Text weight="semibold">Timeline</Text>
                      <Flex gap="md">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={editForm.startDate}
                            onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Target Date
                          </label>
                          <input
                            type="date"
                            value={editForm.targetDate}
                            onChange={(e) => setEditForm({ ...editForm, targetDate: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </Flex>
                    </Stack>

                    {/* Budget & Effort */}
                    <Stack spacing="md">
                      <Text weight="semibold">Budget & Effort</Text>
                      <Flex gap="md">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estimated Budget ($)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.estimatedBudget}
                            onChange={(e) => setEditForm({ ...editForm, estimatedBudget: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estimated Hours
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editForm.estimatedHours}
                            onChange={(e) => setEditForm({ ...editForm, estimatedHours: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </Flex>
                    </Stack>

                    {/* Deliverables & Success */}
                    <Stack spacing="md">
                      <Text weight="semibold">Deliverables & Success Criteria</Text>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Deliverables
                        </label>
                        <textarea
                          value={editForm.deliverables}
                          onChange={(e) => setEditForm({ ...editForm, deliverables: e.target.value })}
                          placeholder="What will this project produce?"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Success Criteria
                        </label>
                        <textarea
                          value={editForm.successCriteria}
                          onChange={(e) => setEditForm({ ...editForm, successCriteria: e.target.value })}
                          placeholder="How will we know this project is complete?"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                    </Stack>

                    {/* Tags & Lead */}
                    <Stack spacing="md">
                      <Text weight="semibold">Organization</Text>
                      <Flex gap="md">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tags (comma separated)
                          </label>
                          <input
                            type="text"
                            value={editForm.tags}
                            onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                            placeholder="e.g., planning, research"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Project Lead
                          </label>
                          <select
                            value={editForm.leadId}
                            onChange={(e) => setEditForm({ ...editForm, leadId: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">No lead assigned</option>
                            {band.members.map((member: any) => (
                              <option key={member.user.id} value={member.user.id}>
                                {member.user.name} ({member.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      </Flex>
                    </Stack>

                    {/* Actions */}
                    <Flex gap="sm">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleSaveEdit}
                        disabled={updateProjectMutation.isPending}
                      >
                        {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </Flex>
                  </Stack>
                </Card>
              ) : (
                <Flex justify="between" align="start">
                  <Stack spacing="sm">
                    <Flex gap="sm" align="center">
                      <Heading level={1}>{project.name}</Heading>
                      {project.aiGenerated && (
                        <Badge variant="info">AI Generated</Badge>
                      )}
                    </Flex>
                    <Text variant="muted">From proposal: {proposal.title}</Text>
                    <Flex gap="sm">
                      {getStatusBadge(project.status)}
                      {getPriorityBadge(project.priority)}
                      {project.lead && (
                        <Badge variant="neutral">Lead: {project.lead.name}</Badge>
                      )}
                    </Flex>
                    {project.tags && project.tags.length > 0 && (
                      <Flex gap="sm" className="flex-wrap">
                        {project.tags.map((tag: string, i: number) => (
                          <span key={i} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                            {tag}
                          </span>
                        ))}
                      </Flex>
                    )}
                  </Stack>
                  {canUpdateProject && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={startEditing}
                    >
                      Edit Project
                    </Button>
                  )}
                </Flex>
              )}

              {/* Status Actions */}
              {canUpdateProject && !isEditing && (
                <Card>
                  <Stack spacing="md">
                    <Heading level={3}>Update Status</Heading>
                    <Flex gap="sm" className="flex-wrap">
                      {statusOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant={project.status === option.value ? 'primary' : 'ghost'}
                          size="sm"
                          onClick={() => handleStatusChange(option.value)}
                          disabled={updateProjectMutation.isPending || project.status === option.value}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </Flex>
                  </Stack>
                </Card>
              )}

              {/* Tasks Section */}
              <Card>
                <Stack spacing="lg">
                  <Flex justify="between" align="center">
                    <Heading level={2}>Tasks ({tasks.length})</Heading>
                    {canUpdateProject && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowCreateTask(true)}
                      >
                        + Add Task
                      </Button>
                    )}
                  </Flex>

                  {/* Create Task Form */}
                  {showCreateTask && (
                    <Card className="bg-gray-50">
                      <Stack spacing="md">
                        <Heading level={3}>New Task</Heading>
                        
                        <Input
                          label="Task Name *"
                          value={newTask.name}
                          onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                          placeholder="e.g., Research suppliers"
                        />

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={newTask.description}
                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                            placeholder="What needs to be done?"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={2}
                          />
                        </div>

                        <Flex gap="md">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Priority
                            </label>
                            <select
                              value={newTask.priority}
                              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {PRIORITY_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Assign To
                            </label>
                            <select
                              value={newTask.assigneeId}
                              onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Unassigned</option>
                              {band.members.map((member: any) => (
                                <option key={member.user.id} value={member.user.id}>
                                  {member.user.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </Flex>

                        <Flex gap="md">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Due Date
                            </label>
                            <input
                              type="date"
                              value={newTask.dueDate}
                              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Estimated Hours
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={newTask.estimatedHours}
                              onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </Flex>

                        <Flex gap="sm" align="center">
                          <input
                            type="checkbox"
                            id="requiresVerification"
                            checked={newTask.requiresVerification}
                            onChange={(e) => setNewTask({ ...newTask, requiresVerification: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <label htmlFor="requiresVerification" className="text-sm text-gray-700">
                            Requires verification (proof, receipts, etc.)
                          </label>
                        </Flex>

                        <Flex gap="sm">
                          <Button
                            variant="primary"
                            size="md"
                            onClick={handleCreateTask}
                            disabled={createTaskMutation.isPending}
                          >
                            {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => {
                              setShowCreateTask(false)
                              resetTaskForm()
                            }}
                          >
                            Cancel
                          </Button>
                        </Flex>
                      </Stack>
                    </Card>
                  )}

                  {/* Tasks List */}
                  {tasks.length > 0 ? (
                    <Stack spacing="md">
                      {tasks.map((task: any) => (
                        <div
                          key={task.id}
                          className={`p-4 border rounded-lg ${
                            highlightedTaskId === task.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          } ${task.status === 'COMPLETED' ? 'opacity-60' : ''}`}
                        >
                          <Flex justify="between" align="start">
                            <Stack spacing="sm" className="flex-1">
                              <Flex gap="sm" align="center">
                                <Text weight="semibold">{task.name}</Text>
                                {task.requiresVerification && task.status !== 'COMPLETED' && (
                                  <Badge variant="info">Needs Verification</Badge>
                                )}
                              </Flex>
                              {task.description && (
                                <Text variant="small" className="text-gray-600">{task.description}</Text>
                              )}
                              <Flex gap="sm" className="flex-wrap">
                                {getTaskStatusBadge(task.status)}
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

                            {/* Task Actions */}
                            <Stack spacing="sm">
                              {/* Status change buttons for assignee or admin */}
                              {(task.assigneeId === userId || canUpdateProject) && task.status !== 'COMPLETED' && (
                                <Flex gap="sm" className="flex-wrap">
                                  {task.status === 'TODO' && (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleTaskStatusChange(task.id, 'IN_PROGRESS')}
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
                                          onClick={() => {
                                            setSelectedTask(task)
                                            submitForVerificationMutation.mutate({
                                              taskId: task.id,
                                              userId: userId!,
                                            })
                                          }}
                                        >
                                          Submit for Review
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          onClick={() => handleTaskStatusChange(task.id, 'COMPLETED')}
                                        >
                                          Complete
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleTaskStatusChange(task.id, 'BLOCKED')}
                                      >
                                        Blocked
                                      </Button>
                                    </>
                                  )}
                                  {task.status === 'BLOCKED' && (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleTaskStatusChange(task.id, 'IN_PROGRESS')}
                                    >
                                      Unblock
                                    </Button>
                                  )}
                                </Flex>
                              )}

                              {/* Verification buttons for verifiers */}
                              {task.status === 'IN_REVIEW' && canVerifyTasks && (
                                <Flex gap="sm">
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTask(task)
                                      setShowVerifyModal(true)
                                    }}
                                  >
                                    Review
                                  </Button>
                                </Flex>
                              )}
                            </Stack>
                          </Flex>

                          {/* Verification info */}
                          {task.verificationStatus && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <Flex gap="sm" align="center">
                                <Badge variant={task.verificationStatus === 'APPROVED' ? 'success' : task.verificationStatus === 'REJECTED' ? 'danger' : 'warning'}>
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
                      ))}
                    </Stack>
                  ) : (
                    <Alert variant="info">
                      <Text>No tasks yet. {canUpdateProject ? 'Click "Add Task" to create one.' : ''}</Text>
                    </Alert>
                  )}
                </Stack>
              </Card>

              {/* Project Details */}
              <Card>
                <Stack spacing="lg">
                  <Heading level={2}>Details</Heading>
                  
                  {project.description ? (
                    <Stack spacing="sm">
                      <Text weight="semibold">Description</Text>
                      <Text style={{ whiteSpace: 'pre-wrap' }}>{project.description}</Text>
                    </Stack>
                  ) : (
                    <Text variant="muted">No description provided</Text>
                  )}

                  <Flex gap="xl" className="flex-wrap">
                    <Stack spacing="sm">
                      <Text weight="semibold">Created By</Text>
                      <Text>{project.createdBy.name}</Text>
                    </Stack>
                    <Stack spacing="sm">
                      <Text weight="semibold">Created</Text>
                      <Text>{new Date(project.createdAt).toLocaleDateString()}</Text>
                    </Stack>
                    {project.startDate && (
                      <Stack spacing="sm">
                        <Text weight="semibold">Start Date</Text>
                        <Text>{new Date(project.startDate).toLocaleDateString()}</Text>
                      </Stack>
                    )}
                    {project.targetDate && (
                      <Stack spacing="sm">
                        <Text weight="semibold">Target Date</Text>
                        <Text>{new Date(project.targetDate).toLocaleDateString()}</Text>
                      </Stack>
                    )}
                  </Flex>
                </Stack>
              </Card>

              {/* Original Proposal */}
              <Card>
                <Stack spacing="lg">
                  <Heading level={2}>Original Proposal</Heading>
                  <Text weight="semibold">{proposal.title}</Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/bands/${slug}/proposals/${proposal.id}`)}
                  >
                    View Full Proposal →
                  </Button>
                </Stack>
              </Card>
            </Stack>
          </div>

          {/* Right Sidebar */}
          <aside className="w-80 bg-white rounded-lg shadow p-4">
            <Stack spacing="lg">
              <Heading level={3}>Project Info</Heading>
              
              <Stack spacing="md">
                <Flex justify="between">
                  <Text variant="small">Status</Text>
                  {getStatusBadge(project.status)}
                </Flex>
                
                <Flex justify="between">
                  <Text variant="small">Priority</Text>
                  {getPriorityBadge(project.priority)}
                </Flex>
                
                <Flex justify="between">
                  <Text variant="small">Tasks</Text>
                  <Text variant="small" weight="semibold">
                    {project.completedTasks}/{project.totalTasks}
                  </Text>
                </Flex>

                {project.targetDate && (
                  <Flex justify="between">
                    <Text variant="small">Target</Text>
                    <Text variant="small" weight="semibold">
                      {new Date(project.targetDate).toLocaleDateString()}
                    </Text>
                  </Flex>
                )}
              </Stack>

              {/* Progress */}
              {project.totalTasks > 0 && (
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold">Progress</Text>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${Math.round((project.completedTasks / project.totalTasks) * 100)}%` 
                      }}
                    />
                  </div>
                  <Text variant="small" className="text-gray-500">
                    {Math.round((project.completedTasks / project.totalTasks) * 100)}% complete
                  </Text>
                </Stack>
              )}

              {/* Project Lead */}
              {project.lead && (
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold">Project Lead</Text>
                  <Flex gap="sm" align="center">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {project.lead.name.charAt(0)}
                    </div>
                    <Text variant="small">{project.lead.name}</Text>
                  </Flex>
                </Stack>
              )}

              {/* Team */}
              <Stack spacing="sm">
                <Text variant="small" weight="semibold">Band Members</Text>
                {band.members.slice(0, 5).map((member: any) => (
                  <Flex key={member.id} gap="sm" align="center">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                      {member.user.name.charAt(0)}
                    </div>
                    <Text variant="small">{member.user.name}</Text>
                  </Flex>
                ))}
              </Stack>
            </Stack>
          </aside>
        </Flex>
      </DashboardContainer>

      {/* Verify Task Modal */}
      <Modal isOpen={showVerifyModal} onClose={() => setShowVerifyModal(false)}>
        <Stack spacing="lg">
          <Heading level={2}>Review Task</Heading>
          {selectedTask && (
            <>
              <Text weight="semibold">{selectedTask.name}</Text>
              {selectedTask.proofDescription && (
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold">Proof Description:</Text>
                  <Text variant="small">{selectedTask.proofDescription}</Text>
                </Stack>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Add feedback or notes..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <Flex gap="md" justify="end">
                <Button
                  variant="ghost"
                  onClick={() => setShowVerifyModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => verifyTaskMutation.mutate({
                    taskId: selectedTask.id,
                    userId: userId!,
                    approved: false,
                    verificationNotes: verifyNotes || undefined,
                  })}
                  disabled={verifyTaskMutation.isPending}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  onClick={() => verifyTaskMutation.mutate({
                    taskId: selectedTask.id,
                    userId: userId!,
                    approved: true,
                    verificationNotes: verifyNotes || undefined,
                  })}
                  disabled={verifyTaskMutation.isPending}
                >
                  Approve
                </Button>
              </Flex>
            </>
          )}
        </Stack>
      </Modal>
    </PageWrapper>
  )
}