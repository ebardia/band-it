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
  Loading,
  Alert,
  BandSidebar,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { ProjectHeader } from './components/ProjectHeader'
import { ProjectEditForm } from './components/ProjectEditForm'
import { ProjectStatusBar } from './components/ProjectStatusBar'
import { ProjectDetails } from './components/ProjectDetails'
import { ProjectTasks } from './components/ProjectTasks'
import { TaskVerifyModal } from './components/TaskVerifyModal'
import { ProjectSidebar } from './components/ProjectSidebar'

const CAN_UPDATE_PROJECT = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']
const CAN_VERIFY_TASK = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED'

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

  const handleStatusChange = (newStatus: ProjectStatus) => {
    updateProjectMutation.mutate({
      projectId,
      userId: userId!,
      status: newStatus,
    })
  }

  const handleSaveProject = (data: any) => {
    updateProjectMutation.mutate({
      projectId,
      userId: userId!,
      ...data,
    })
  }

  const handleCreateTask = (data: any) => {
    createTaskMutation.mutate({
      projectId,
      userId: userId!,
      ...data,
    })
  }

  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTaskMutation.mutate({
      taskId,
      userId: userId!,
      status: newStatus,
    })
  }

  const handleSubmitForVerification = (task: any) => {
    submitForVerificationMutation.mutate({
      taskId: task.id,
      userId: userId!,
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

  return (
    <PageWrapper variant="dashboard">
      <AppNav />

      <DashboardContainer>
        <Flex gap="md" align="start">
          <BandSidebar 
            bandSlug={slug} 
            canApprove={false} 
            isMember={!!currentMember}
          />

          <div className="flex-1 bg-white rounded-lg shadow p-8">
            <Stack spacing="xl">
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

              {isEditing ? (
                <ProjectEditForm
                  project={project}
                  bandMembers={band.members}
                  onSave={handleSaveProject}
                  onCancel={() => setIsEditing(false)}
                  isSaving={updateProjectMutation.isPending}
                />
              ) : (
                <ProjectHeader
                  project={project}
                  proposal={proposal}
                  canUpdateProject={canUpdateProject || false}
                  onEdit={() => setIsEditing(true)}
                  onValidate={() => validateProjectMutation.mutate({ projectId, userId: userId! })}
                  isValidating={validateProjectMutation.isPending}
                />
              )}

              {canUpdateProject && !isEditing && (
                <ProjectStatusBar
                  currentStatus={project.status}
                  onStatusChange={handleStatusChange}
                  isUpdating={updateProjectMutation.isPending}
                />
              )}

              <ProjectTasks
                tasks={tasks}
                bandMembers={band.members}
                userId={userId}
                highlightedTaskId={highlightedTaskId}
                canUpdate={canUpdateProject || false}
                canVerify={canVerifyTasks || false}
                showCreateForm={showCreateTask}
                onShowCreateForm={setShowCreateTask}
                onCreateTask={handleCreateTask}
                isCreating={createTaskMutation.isPending}
                onStatusChange={handleTaskStatusChange}
                onSubmitForVerification={handleSubmitForVerification}
                onReview={handleReviewTask}
                isUpdating={updateTaskMutation.isPending || submitForVerificationMutation.isPending}
              />

              <ProjectDetails project={project} />

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

          <ProjectSidebar
            project={project}
            bandMembers={band.members}
          />
        </Flex>
      </DashboardContainer>

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
    </PageWrapper>
  )
}