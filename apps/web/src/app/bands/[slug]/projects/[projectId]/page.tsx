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
  Flex,
  Card,
  Loading,
  Alert,
  BandLayout,
  DiscussionSidebar,
  IntegrityBlockModal,
  IntegrityWarningModal,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { ProjectHeaderCompact } from './components/ProjectHeaderCompact'
import { ProjectEditForm } from './components/ProjectEditForm'
import { ProjectTasksHierarchy } from './components/ProjectTasksHierarchy'
import { TaskVerifyModal } from './components/TaskVerifyModal'
import { TaskSubmitModal } from './components/TaskSubmitModal'

const CAN_UPDATE_PROJECT = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']
const CAN_VERIFY_TASK = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED'

interface TaskSuggestion {
  name: string
  description: string
  estimatedHours: number | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  order: number
  requiresVerification: boolean
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const projectId = params.projectId as string
  const highlightedTaskId = searchParams.get('task')
  const { showToast } = useToast()
  const utils = trpc.useUtils()
  
  const [userId, setUserId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  
  // AI Suggestions state
  const [taskSuggestions, setTaskSuggestions] = useState<TaskSuggestion[] | null>(null)
  const [suggestionsCreatedCount, setSuggestionsCreatedCount] = useState(0)
  const [aiTasksRequireDeliverable, setAiTasksRequireDeliverable] = useState(false)

  // Integrity Guard state (for task creation)
  const [validationIssues, setValidationIssues] = useState<any[]>([])
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [pendingTaskData, setPendingTaskData] = useState<any>(null)

  // Integrity Guard state (for project edit)
  const [projectValidationIssues, setProjectValidationIssues] = useState<any[]>([])
  const [showProjectBlockModal, setShowProjectBlockModal] = useState(false)
  const [showProjectWarningModal, setShowProjectWarningModal] = useState(false)
  const [pendingProjectData, setPendingProjectData] = useState<any>(null)

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

  // @ts-ignore - tRPC type instantiation depth issue
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

  const validateProjectMutation = trpc.ai.validateProject.useMutation({
    onSuccess: () => {
      showToast('Project validated!', 'success')
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
      refetchTasks()
      refetchProject()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  // Separate mutation for AI-suggested tasks to track count
  const createSuggestedTaskMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      setSuggestionsCreatedCount(prev => prev + 1)
      refetchTasks()
      refetchProject()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const suggestTasksMutation = trpc.task.suggestTasks.useMutation({
    onSuccess: (data) => {
      if (data.suggestions.length === 0) {
        showToast('All necessary tasks already exist - no new suggestions needed', 'info')
      } else {
        setTaskSuggestions(data.suggestions)
        setSuggestionsCreatedCount(0)
        showToast(`Generated ${data.suggestions.length} task suggestions`, 'success')
      }
      // Refresh AI usage tracker
      utils.aiUsage.invalidate()
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
      setShowSubmitModal(false)
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
      refetchTasks()
      refetchProject()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  // Integrity Guard validation mutation
  const validationMutation = trpc.validation.check.useMutation()

  const handleStatusChange = (newStatus: ProjectStatus) => {
    updateProjectMutation.mutate({
      projectId,
      userId: userId!,
      status: newStatus,
    })
  }

  const handleSaveProject = async (data: any) => {
    const projectEditData = {
      projectId,
      userId: userId!,
      ...data,
    }

    // Store data for potential later use
    setPendingProjectData(projectEditData)

    // Run integrity validation
    try {
      const validation = await validationMutation.mutateAsync({
        entityType: 'Project',
        action: 'update',
        bandId: projectData?.project?.bandId || '',
        data: {
          name: data.name,
          description: data.description,
          deliverables: data.deliverables,
          successCriteria: data.successCriteria,
        },
      })

      if (!validation.canProceed) {
        // BLOCK - show block modal, cannot proceed
        setProjectValidationIssues(validation.issues)
        setShowProjectBlockModal(true)
        return
      }

      if (validation.issues.length > 0) {
        // FLAG - show warning modal, user can choose to proceed
        setProjectValidationIssues(validation.issues)
        setShowProjectWarningModal(true)
        return
      }

      // All clear - update project normally
      updateProjectMutation.mutate(projectEditData)
    } catch (error) {
      // Validation failed - show error but don't update
      console.error('Validation error:', error)
      showToast('Unable to validate content. Please try again.', 'error')
    }
  }

  // Handle proceeding with warnings for project edit
  const handleProceedWithWarningsProject = () => {
    if (!pendingProjectData) return

    updateProjectMutation.mutate({
      ...pendingProjectData,
      proceedWithFlags: true,
      flagReasons: projectValidationIssues.map(i => `${i.type}_mismatch`),
      flagDetails: projectValidationIssues,
    })

    // Close modal and clear state
    setShowProjectWarningModal(false)
    setProjectValidationIssues([])
    setPendingProjectData(null)
  }

  // Handle canceling warning for project edit
  const handleCancelWarningProject = () => {
    setShowProjectWarningModal(false)
    setProjectValidationIssues([])
    setPendingProjectData(null)
  }

  // Handle closing block modal for project edit - keep form open so user can edit and retry
  const handleCloseBlockProject = () => {
    setShowProjectBlockModal(false)
    setProjectValidationIssues([])
    setPendingProjectData(null)
  }

  const handleCreateTask = async (data: any) => {
    // Store the data for potential later use
    setPendingTaskData(data)

    // Run integrity validation
    try {
      const validation = await validationMutation.mutateAsync({
        entityType: 'Task',
        action: 'create',
        bandId: project?.bandId || '',
        data: {
          name: data.name,
          description: data.description,
        },
        parentId: projectId,
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

      // All clear - create task normally
      createTaskMutation.mutate({
        projectId,
        userId: userId!,
        ...data,
      })
    } catch (error) {
      // Validation failed - show error but don't create task (security first)
      console.error('Validation error:', error)
      showToast('Unable to validate content. Please try again.', 'error')
    }
  }

  // Handle proceeding with warnings (user clicked "Proceed Anyway")
  const handleProceedWithWarnings = () => {
    if (!pendingTaskData) return

    createTaskMutation.mutate({
      projectId,
      userId: userId!,
      ...pendingTaskData,
      proceedWithFlags: true,
      flagReasons: validationIssues.map(i => `${i.type}_mismatch`),
      flagDetails: validationIssues,
    })

    // Close modal and clear state
    setShowWarningModal(false)
    setValidationIssues([])
    setPendingTaskData(null)
  }

  // Handle closing warning modal (user clicked "Cancel")
  const handleCancelWarning = () => {
    setShowWarningModal(false)
    setValidationIssues([])
    setPendingTaskData(null)
  }

  // Handle closing block modal - keep form open so user can edit and retry
  const handleCloseBlock = () => {
    setShowBlockModal(false)
    setValidationIssues([])
    setPendingTaskData(null)
  }

  const handleSuggestTasks = () => {
    suggestTasksMutation.mutate({
      projectId,
      userId: userId!,
    })
  }

  const handleAcceptSuggestion = (suggestion: TaskSuggestion) => {
    createSuggestedTaskMutation.mutate({
      projectId,
      userId: userId!,
      name: suggestion.name,
      description: suggestion.description,
      priority: suggestion.priority,
      estimatedHours: suggestion.estimatedHours || undefined,
      requiresVerification: suggestion.requiresVerification,
      requiresDeliverable: aiTasksRequireDeliverable,
      aiGenerated: true,
    })
  }

  const handleAcceptAllSuggestions = async () => {
    if (!taskSuggestions) return

    for (const suggestion of taskSuggestions) {
      await createSuggestedTaskMutation.mutateAsync({
        projectId,
        userId: userId!,
        name: suggestion.name,
        description: suggestion.description,
        priority: suggestion.priority,
        estimatedHours: suggestion.estimatedHours || undefined,
        requiresVerification: suggestion.requiresVerification,
        requiresDeliverable: aiTasksRequireDeliverable,
        aiGenerated: true,
      })
    }

    showToast(`Created ${taskSuggestions.length} tasks!`, 'success')
    setTaskSuggestions(null)
    setSuggestionsCreatedCount(0)
    setAiTasksRequireDeliverable(false)
  }

  const handleDismissSuggestions = () => {
    setTaskSuggestions(null)
    setSuggestionsCreatedCount(0)
    setAiTasksRequireDeliverable(false)
  }

  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTaskMutation.mutate({
      taskId,
      userId: userId!,
      status: newStatus,
    })
  }

  const handleSubmitForVerification = (task: any) => {
    setSelectedTask(task)
    setShowSubmitModal(true)
  }

  const handleSubmitTask = (proofDescription?: string) => {
    if (!selectedTask) return
    submitForVerificationMutation.mutate({
      taskId: selectedTask.id,
      userId: userId!,
      proofDescription,
    })
  }

  const handleReviewTask = (task: any) => {
    setSelectedTask(task)
    setShowVerifyModal(true)
  }

  const handleVerifyTask = (approved: boolean, notes?: string) => {
    if (!selectedTask) return
    verifyTaskMutation.mutate({
      taskId: selectedTask.id,
      userId: userId!,
      approved,
      verificationNotes: notes,
    })
  }

  if (projectLoading || tasksLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Project Details"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading project..." />
        </BandLayout>
      </>
    )
  }

  if (!projectData?.project) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Project Details"
          isMember={false}
          wide={true}
        >
          <Alert variant="danger">
            <Text>Project not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const project = projectData.project
  const band = project.band
  const proposal = project.proposal
  const tasks = tasksData?.tasks || []
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canUpdateProject = currentMember && CAN_UPDATE_PROJECT.includes(currentMember.role)
  const canVerifyTasks = currentMember && CAN_VERIFY_TASK.includes(currentMember.role)

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle={project.name}
        canApprove={false}
        isMember={!!currentMember}
        wide={true}
        action={
          canUpdateProject && !isEditing ? (
            <Button variant="secondary" size="md" onClick={() => setIsEditing(true)}>
              Edit Project
            </Button>
          ) : undefined
        }
        rightSidebar={
          <DiscussionSidebar
            projectId={projectId}
            userId={userId}
            bandMembers={band.members}
          />
        }
      >
        <Stack spacing="md">
          {/* Breadcrumb */}
          <button
            onClick={() => router.push(`/bands/${slug}/projects`)}
            className="text-sm text-gray-500 hover:text-blue-600"
          >
            ← Projects
          </button>

          {isEditing ? (
            <Card>
              <ProjectEditForm
                project={project}
                bandMembers={band.members}
                onSave={handleSaveProject}
                onCancel={() => setIsEditing(false)}
                isSaving={updateProjectMutation.isPending}
              />
            </Card>
          ) : (
            <Card className="p-4">
              <ProjectHeaderCompact
                project={project}
                proposal={proposal}
                bandSlug={slug}
                canUpdateProject={canUpdateProject || false}
                onEdit={() => setIsEditing(true)}
                onValidate={() => validateProjectMutation.mutate({ projectId, userId: userId! })}
                isValidating={validateProjectMutation.isPending}
                onStatusChange={handleStatusChange}
                isUpdatingStatus={updateProjectMutation.isPending}
              />
            </Card>
          )}

          <Card>
            <ProjectTasksHierarchy
              tasks={tasks}
              bandSlug={slug}
              bandId={band.id}
              bandMembers={band.members}
              userId={userId}
              userRole={currentMember?.role || ''}
              highlightedTaskId={highlightedTaskId}
              canUpdate={canUpdateProject || false}
              canVerify={canVerifyTasks || false}
              showCreateForm={showCreateTask}
              onShowCreateForm={setShowCreateTask}
              onCreateTask={handleCreateTask}
              isCreating={createTaskMutation.isPending || createSuggestedTaskMutation.isPending || validationMutation.isPending}
              onStatusChange={handleTaskStatusChange}
              onSubmitForVerification={handleSubmitForVerification}
              onReview={handleReviewTask}
              isUpdating={updateTaskMutation.isPending || submitForVerificationMutation.isPending}
              suggestions={taskSuggestions}
              onSuggestTasks={handleSuggestTasks}
              onAcceptSuggestion={handleAcceptSuggestion}
              onAcceptAllSuggestions={handleAcceptAllSuggestions}
              onDismissSuggestions={handleDismissSuggestions}
              isSuggesting={suggestTasksMutation.isPending}
              suggestionsCreatedCount={suggestionsCreatedCount}
              aiRequiresDeliverable={aiTasksRequireDeliverable}
              onAiRequiresDeliverableChange={setAiTasksRequireDeliverable}
            />
          </Card>

          {/* Quick Links */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => router.push(`/bands/${slug}/projects/${projectId}/deliverables`)}
              className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
            >
              📦 Deliverables →
            </button>
            <button
              onClick={() => router.push(`/bands/${slug}/proposals/${proposal.id}`)}
              className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
            >
              📋 Original Proposal →
            </button>
          </div>
        </Stack>

        <TaskSubmitModal
          isOpen={showSubmitModal}
          task={selectedTask}
          userId={userId}
          onClose={() => {
            setShowSubmitModal(false)
            setSelectedTask(null)
          }}
          onSubmit={handleSubmitTask}
          isSubmitting={submitForVerificationMutation.isPending}
        />

        <TaskVerifyModal
          isOpen={showVerifyModal}
          task={selectedTask}
          onClose={() => {
            setShowVerifyModal(false)
            setSelectedTask(null)
          }}
          onApprove={(notes) => handleVerifyTask(true, notes)}
          onReject={(notes) => handleVerifyTask(false, notes)}
          isSubmitting={verifyTaskMutation.isPending}
        />

        {/* Integrity Guard Modals - Task Creation */}
        <IntegrityBlockModal
          isOpen={showBlockModal}
          onClose={handleCloseBlock}
          issues={validationIssues}
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
        />

        <IntegrityWarningModal
          isOpen={showWarningModal}
          onClose={handleCancelWarning}
          onProceed={handleProceedWithWarnings}
          issues={validationIssues}
          isProceeding={createTaskMutation.isPending}
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
        />

        {/* Integrity Guard Modals - Project Edit */}
        <IntegrityBlockModal
          isOpen={showProjectBlockModal}
          onClose={handleCloseBlockProject}
          issues={projectValidationIssues}
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
        />

        <IntegrityWarningModal
          isOpen={showProjectWarningModal}
          onClose={handleCancelWarningProject}
          onProceed={handleProceedWithWarningsProject}
          issues={projectValidationIssues}
          isProceeding={updateProjectMutation.isPending}
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
        />
      </BandLayout>
    </>
  )
}