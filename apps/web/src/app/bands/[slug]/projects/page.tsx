'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Button,
  Flex,
  Badge,
  Loading,
  Alert,
  BandLayout,
  useToast
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { OnboardingHint } from '@/components/onboarding'

// Status icons
const STATUS_ICONS = {
  COMPLETED: '✅',
  IN_PROGRESS: '⏳',
  NOT_STARTED: '○',
}

interface ProjectData {
  id: string
  name: string
  description: string | null
  status: string
  priority: string
  startDate: string | null
  targetDate: string | null
  completedAt: string | null
  createdAt: string
  createdBy: { id: string; name: string }
  proposal: { id: string; title: string }
  taskCount: number
  tasksCompleted: number
  allTasksComplete: boolean
}

interface TaskData {
  id: string
  name: string
  status: string
  dueDate: string | null
  assignee: { id: string; name: string } | null
  checklistCount: number
  checklistCompleted: number
}

interface ChecklistData {
  id: string
  description: string
  isCompleted: boolean
  assignee: { id: string; name: string } | null
}

// LocalStorage key for expansion state
const EXPANSION_STATE_KEY = 'projects-expansion-state'

// Helper to get stored expansion state
function getStoredExpansionState(slug: string): { projects: string[], tasks: string[] } | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(`${EXPANSION_STATE_KEY}-${slug}`)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to parse expansion state:', e)
  }
  return null
}

// Helper to save expansion state
function saveExpansionState(slug: string, projects: Set<string>, tasks: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${EXPANSION_STATE_KEY}-${slug}`, JSON.stringify({
      projects: Array.from(projects),
      tasks: Array.from(tasks),
    }))
  } catch (e) {
    console.error('Failed to save expansion state:', e)
  }
}

export default function BandProjectsPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [expansionRestored, setExpansionRestored] = useState(false)

  // Expansion state - will be restored from localStorage
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  // Cache for lazy-loaded data
  const [tasksCache, setTasksCache] = useState<Record<string, TaskData[]>>({})
  const [checklistCache, setChecklistCache] = useState<Record<string, ChecklistData[]>>({})

  // Reorder mutations
  const reorderProjectMutation = trpc.reorder.reorderProject.useMutation()
  const reorderTaskMutation = trpc.reorder.reorderTask.useMutation()
  const reorderChecklistMutation = trpc.reorder.reorderChecklistItem.useMutation()

  // Restore expansion state from localStorage on mount
  useEffect(() => {
    if (slug && !expansionRestored) {
      const stored = getStoredExpansionState(slug)
      if (stored) {
        setExpandedProjects(new Set(stored.projects))
        setExpandedTasks(new Set(stored.tasks))
      }
      setExpansionRestored(true)
    }
  }, [slug, expansionRestored])

  // Save expansion state to localStorage when it changes
  useEffect(() => {
    if (slug && expansionRestored) {
      saveExpansionState(slug, expandedProjects, expandedTasks)
    }
  }, [slug, expandedProjects, expandedTasks, expansionRestored])

  const utils = trpc.useUtils()

  // Reorder handlers
  const handleReorderProject = async (projectId: string, direction: 'up' | 'down') => {
    if (!userId || !bandData?.band?.id) {
      showToast('Unable to reorder - please refresh the page', 'error')
      return
    }
    try {
      await reorderProjectMutation.mutateAsync({ projectId, direction, userId })
      await utils.project.getProjectsList.invalidate({ bandId: bandData.band.id })
    } catch (error: any) {
      console.error('Failed to reorder project:', error)
      showToast(error?.message || 'Failed to reorder project', 'error')
    }
  }

  const handleReorderTask = async (taskId: string, projectId: string, direction: 'up' | 'down') => {
    if (!userId) {
      showToast('Unable to reorder - please refresh the page', 'error')
      return
    }
    try {
      await reorderTaskMutation.mutateAsync({ taskId, direction, userId })
      // Invalidate the tasks cache for this project
      setTasksCache(prev => {
        const { [projectId]: _, ...rest } = prev
        return rest
      })
      // Re-fetch tasks for the project
      const result = await utils.project.getTasksForProject.fetch({ projectId })
      if (result.tasks) {
        setTasksCache(prev => ({ ...prev, [projectId]: result.tasks }))
      }
    } catch (error: any) {
      console.error('Failed to reorder task:', error)
      showToast(error?.message || 'Failed to reorder task', 'error')
    }
  }

  const handleReorderChecklist = async (itemId: string, taskId: string, direction: 'up' | 'down') => {
    if (!userId) {
      showToast('Unable to reorder - please refresh the page', 'error')
      return
    }
    try {
      await reorderChecklistMutation.mutateAsync({ itemId, direction, userId })
      // Invalidate the checklist cache for this task
      setChecklistCache(prev => {
        const { [taskId]: _, ...rest } = prev
        return rest
      })
      // Re-fetch checklist for the task
      const result = await utils.project.getChecklistForTask.fetch({ taskId })
      if (result.checklistItems) {
        setChecklistCache(prev => ({ ...prev, [taskId]: result.checklistItems }))
      }
    } catch (error: any) {
      console.error('Failed to reorder checklist item:', error)
      showToast(error?.message || 'Failed to reorder checklist item', 'error')
    }
  }

  // Fetch data for restored expanded items
  useEffect(() => {
    if (!expansionRestored) return

    // Fetch tasks for expanded projects
    expandedProjects.forEach(async (projectId) => {
      if (!tasksCache[projectId]) {
        try {
          const result = await utils.project.getTasksForProject.fetch({ projectId })
          if (result.tasks) {
            setTasksCache(prev => ({ ...prev, [projectId]: result.tasks }))
          }
        } catch (error) {
          console.error('Failed to fetch tasks:', error)
        }
      }
    })

    // Fetch checklist for expanded tasks
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

  const { data: bandData, isLoading: bandLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  // Use the new hierarchy endpoint
  const { data: projectsData, isLoading: projectsLoading } = trpc.project.getProjectsList.useQuery(
    { bandId: bandData?.band?.id || '' },
    { enabled: !!bandData?.band?.id }
  )

  // Toggle project expansion
  const toggleProject = useCallback(async (projectId: string) => {
    const newExpanded = new Set(expandedProjects)

    if (newExpanded.has(projectId)) {
      // Collapse: remove from expanded and collapse all children
      newExpanded.delete(projectId)

      // Collapse child tasks
      const childTasks = tasksCache[projectId] || []
      const taskIds = new Set(childTasks.map(t => t.id))
      setExpandedTasks(prev => {
        const next = new Set(prev)
        taskIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      // Expand: add to expanded and fetch tasks if not cached
      newExpanded.add(projectId)

      if (!tasksCache[projectId]) {
        try {
          const result = await utils.project.getTasksForProject.fetch({ projectId })
          if (result.tasks) {
            setTasksCache(prev => ({ ...prev, [projectId]: result.tasks }))
          }
        } catch (error) {
          console.error('Failed to fetch tasks:', error)
        }
      }
    }

    setExpandedProjects(newExpanded)
  }, [expandedProjects, tasksCache, utils])

  // Toggle task expansion
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

  // Get status indicator
  const getStatusIndicator = (completed: number, total: number) => {
    if (total === 0) return STATUS_ICONS.NOT_STARTED
    if (completed === total) return STATUS_ICONS.COMPLETED
    if (completed > 0) return STATUS_ICONS.IN_PROGRESS
    return STATUS_ICONS.NOT_STARTED
  }

  if (bandLoading || projectsLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Projects"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading projects..." />
        </BandLayout>
      </>
    )
  }

  if (!bandData?.band) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Projects"
          isMember={false}
          wide={true}
        >
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const band = bandData.band
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const isMember = !!currentMember
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)

  const projects = projectsData?.projects || { active: [], planning: [], onHold: [], completed: [], cancelled: [] }
  const counts = projectsData?.counts || { active: 0, planning: 0, onHold: 0, completed: 0, cancelled: 0 }

  // Render a single project row
  const renderProjectRow = (project: ProjectData, index: number, totalInSection: number) => {
    const isExpanded = expandedProjects.has(project.id)
    const hasTasks = project.taskCount > 0
    const tasks = tasksCache[project.id] || []
    const statusIcon = getStatusIndicator(project.tasksCompleted, project.taskCount)
    const isFirst = index === 0
    const isLast = index === totalInSection - 1

    return (
      <div key={project.id} className="border-b border-gray-100 last:border-b-0">
        {/* Project row */}
        <div className="flex items-center py-3 px-2 hover:bg-gray-50 group">
          {/* Expand toggle - 44px tap target on mobile */}
          <button
            onClick={(e) => { e.stopPropagation(); if (hasTasks) toggleProject(project.id) }}
            className={`min-w-[44px] min-h-[44px] md:w-8 md:h-8 md:min-w-0 md:min-h-0 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0 ${!hasTasks ? 'invisible' : ''}`}
            disabled={!hasTasks}
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          {/* Project info */}
          <div className="flex-1 min-w-0 ml-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">{statusIcon}</span>
              <button
                onClick={() => router.push(`/bands/${slug}/projects/${project.id}`)}
                className="flex items-center gap-2 hover:text-blue-600 transition-colors group/nav"
                title="View project"
              >
                <Text weight="semibold" className="truncate group-hover/nav:text-blue-600">{project.name}</Text>
                <span className="text-blue-500 font-bold text-lg">→</span>
              </button>
              {project.allTasksComplete && project.taskCount > 0 && (
                <Badge variant="success">All tasks done</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
              {project.taskCount > 0 && (
                <span>{project.tasksCompleted}/{project.taskCount} tasks</span>
              )}
              <span>
                from{' '}
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/bands/${slug}/proposals/${project.proposal.id}`) }}
                  className="text-blue-500 hover:text-blue-700 hover:underline"
                >
                  {project.proposal.title}
                </button>
              </span>
              {project.targetDate && (
                <span>Target: {new Date(project.targetDate).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {/* Reorder buttons */}
          {canAccessAdminTools && (
            <div className="flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); handleReorderProject(project.id, 'up') }}
                disabled={isFirst || reorderProjectMutation.isPending}
                className={`p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded ${isFirst ? 'invisible' : ''}`}
                title="Move up"
              >
                ▲
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleReorderProject(project.id, 'down') }}
                disabled={isLast || reorderProjectMutation.isPending}
                className={`p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded ${isLast ? 'invisible' : ''}`}
                title="Move down"
              >
                ▼
              </button>
            </div>
          )}
        </div>

        {/* Expanded tasks - 8px indent mobile, 16px desktop */}
        {isExpanded && hasTasks && (
          <div className="ml-2 md:ml-4 border-l-2 border-gray-200">
            {tasks.length === 0 ? (
              <div className="py-2 px-4 text-sm text-gray-400">Loading tasks...</div>
            ) : (
              tasks.map((task, idx) => renderTaskRow(task, project.id, idx, tasks.length))
            )}
          </div>
        )}
      </div>
    )
  }

  // Render a task row
  const renderTaskRow = (task: TaskData, projectId: string, index: number, totalInProject: number) => {
    const isExpanded = expandedTasks.has(task.id)
    const hasChecklist = task.checklistCount > 0
    const checklistItems = checklistCache[task.id] || []
    const isCompleted = task.status === 'COMPLETED'
    const statusIcon = isCompleted ? '✅' : (task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW') ? '⏳' : '○'
    const isFirst = index === 0
    const isLast = index === totalInProject - 1

    return (
      <div key={task.id} className="group/task">
        {/* Task row */}
        <div className="flex items-center py-1 md:py-2 px-1 md:px-2 hover:bg-gray-50">
          {/* Expand toggle - 44px tap target on mobile */}
          <button
            onClick={(e) => { e.stopPropagation(); if (hasChecklist) toggleTask(task.id) }}
            className={`min-w-[44px] min-h-[44px] md:w-6 md:h-6 md:min-w-0 md:min-h-0 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0 text-xs ${!hasChecklist ? 'invisible' : ''}`}
            disabled={!hasChecklist}
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          {/* Task info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 md:gap-2 flex-wrap">
              <span className="text-sm">{statusIcon}</span>
              <button
                onClick={() => router.push(`/bands/${slug}/tasks/${task.id}`)}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors group/nav"
                title="View task"
              >
                <Text variant="small" className="truncate group-hover/nav:text-blue-600">{task.name}</Text>
                <span className="text-blue-500 font-bold text-sm">→</span>
              </button>
              {task.assignee && (
                <Text variant="small" color="muted" className="hidden sm:inline">({task.assignee.name})</Text>
              )}
            </div>
            {hasChecklist && (
              <Text variant="small" color="muted" className="ml-4 md:ml-5">
                {task.checklistCompleted}/{task.checklistCount} items
              </Text>
            )}
          </div>

          {/* Reorder buttons */}
          {canAccessAdminTools && (
            <div className="flex items-center gap-0.5 ml-2 opacity-0 group-hover/task:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); handleReorderTask(task.id, projectId, 'up') }}
                disabled={isFirst || reorderTaskMutation.isPending}
                className={`p-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded ${isFirst ? 'invisible' : ''}`}
                title="Move up"
              >
                ▲
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleReorderTask(task.id, projectId, 'down') }}
                disabled={isLast || reorderTaskMutation.isPending}
                className={`p-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded ${isLast ? 'invisible' : ''}`}
                title="Move down"
              >
                ▼
              </button>
            </div>
          )}
        </div>

        {/* Expanded checklist - 8px indent mobile, 16px desktop */}
        {isExpanded && hasChecklist && (
          <div className="ml-2 md:ml-4 border-l-2 border-gray-100">
            {checklistItems.length === 0 ? (
              <div className="py-1 px-4 text-sm text-gray-400">Loading checklist...</div>
            ) : (
              checklistItems.map((item, idx) => renderChecklistRow(item, task.id, idx, checklistItems.length))
            )}
          </div>
        )}
      </div>
    )
  }

  // Render a checklist item row
  const renderChecklistRow = (item: ChecklistData, taskId: string, index: number, totalInTask: number) => {
    const isFirst = index === 0
    const isLast = index === totalInTask - 1
    // Assignee can also reorder their own checklist items
    const canReorderItem = canAccessAdminTools || (item.assignee && userId && item.assignee.id === userId)

    return (
      <div key={item.id} className="flex items-center py-1 px-1 md:px-2 hover:bg-gray-50 min-h-[44px] md:min-h-0 group/checklist">
        {/* Spacer for alignment - smaller on mobile */}
        <div className="w-4 md:w-6 flex-shrink-0" />

        {/* Checklist info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 md:gap-2">
            <span className="text-sm">{item.isCompleted ? '☑️' : '☐'}</span>
            <button
              onClick={() => router.push(`/bands/${slug}/tasks/${taskId}/checklist/${item.id}`)}
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

        {/* Reorder buttons */}
        {canReorderItem && (
          <div className="flex items-center gap-0.5 ml-2 opacity-0 group-hover/checklist:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); handleReorderChecklist(item.id, taskId, 'up') }}
              disabled={isFirst || reorderChecklistMutation.isPending}
              className={`p-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded ${isFirst ? 'invisible' : ''}`}
              title="Move up"
            >
              ▲
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleReorderChecklist(item.id, taskId, 'down') }}
              disabled={isLast || reorderChecklistMutation.isPending}
              className={`p-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded ${isLast ? 'invisible' : ''}`}
              title="Move down"
            >
              ▼
            </button>
          </div>
        )}
      </div>
    )
  }

  const totalProjects = counts.active + counts.planning + counts.onHold + counts.completed + counts.cancelled

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="Projects"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        bandId={bandData?.band?.id}
        userId={userId || undefined}
      >
        <Stack spacing="lg">
          {/* Onboarding Hint */}
          {userId && band.id && (
            <OnboardingHint
              bandId={band.id}
              userId={userId}
              relevantSteps={[8, 9]}
            />
          )}

          {/* Active Section - only show if not empty */}
          {counts.active > 0 && (
            <SectionHeader
              icon="🚀"
              title="Active"
              count={counts.active}
              projects={projects.active}
              renderProjectRow={renderProjectRow}
            />
          )}

          {/* Planning Section - only show if not empty */}
          {counts.planning > 0 && (
            <SectionHeader
              icon="📋"
              title="Planning"
              count={counts.planning}
              projects={projects.planning}
              renderProjectRow={renderProjectRow}
            />
          )}

          {/* On Hold Section - only show if not empty */}
          {counts.onHold > 0 && (
            <SectionHeader
              icon="⏸️"
              title="On Hold"
              count={counts.onHold}
              projects={projects.onHold}
              renderProjectRow={renderProjectRow}
            />
          )}

          {/* Completed Section - only show if not empty */}
          {counts.completed > 0 && (
            <SectionHeader
              icon="✅"
              title="Completed"
              count={counts.completed}
              projects={projects.completed}
              renderProjectRow={renderProjectRow}
              defaultCollapsed={counts.completed > 5}
            />
          )}

          {/* Cancelled Section - only show if not empty */}
          {counts.cancelled > 0 && (
            <SectionHeader
              icon="❌"
              title="Cancelled"
              count={counts.cancelled}
              projects={projects.cancelled}
              renderProjectRow={renderProjectRow}
              defaultCollapsed={true}
            />
          )}

          {/* Show message if no projects at all */}
          {totalProjects === 0 && (
            <Alert variant="info">
              <Stack spacing="sm">
                <Text>No projects yet.</Text>
                <Text variant="small" color="muted">
                  Projects are created from approved proposals. Go to Proposals to create and vote on ideas.
                </Text>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(`/bands/${slug}/proposals`)}
                >
                  View Proposals
                </Button>
              </Stack>
            </Alert>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}

// Section header component
function SectionHeader({
  icon,
  title,
  count,
  projects,
  renderProjectRow,
  defaultCollapsed = false,
}: {
  icon: string
  title: string
  count: number
  projects: ProjectData[]
  renderProjectRow: (project: ProjectData, index: number, total: number) => React.ReactNode
  defaultCollapsed?: boolean
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <div>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center gap-2 py-2 px-1 text-left hover:bg-gray-50 rounded-lg transition-colors"
      >
        <span className="text-xl">{icon}</span>
        <span className="flex-1 font-semibold text-gray-800">
          {title} <span className="text-gray-400 font-normal">({count})</span>
        </span>
        <span className="text-gray-400 text-sm px-2">{isCollapsed ? '▶' : '▼'}</span>
      </button>

      {!isCollapsed && (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
          {projects.map((project, index) => renderProjectRow(project, index, projects.length))}
        </div>
      )}
    </div>
  )
}
