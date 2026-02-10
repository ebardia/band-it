'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import {
  Heading,
  Text,
  Stack,
  Button,
  Flex,
  Card,
  Badge,
  Alert
} from '@/components/ui'

interface ProposalProjectsHierarchyProps {
  proposalId: string
  proposalStatus: string
  bandSlug: string
  canCreateProject: boolean
}

interface ProjectData {
  id: string
  name: string
  description: string | null
  status: string
  aiGenerated: boolean
  _count?: { tasks: number }
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
const EXPANSION_STATE_KEY = 'proposal-projects-expansion-state'

function getStoredExpansionState(proposalId: string): { projects: string[], tasks: string[] } | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(`${EXPANSION_STATE_KEY}-${proposalId}`)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to parse expansion state:', e)
  }
  return null
}

function saveExpansionState(proposalId: string, projects: Set<string>, tasks: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${EXPANSION_STATE_KEY}-${proposalId}`, JSON.stringify({
      projects: Array.from(projects),
      tasks: Array.from(tasks),
    }))
  } catch (e) {
    console.error('Failed to save expansion state:', e)
  }
}

export function ProposalProjectsHierarchy({
  proposalId,
  proposalStatus,
  bandSlug,
  canCreateProject,
}: ProposalProjectsHierarchyProps) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const isApproved = proposalStatus === 'APPROVED'

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [tasksCache, setTasksCache] = useState<Record<string, TaskData[]>>({})
  const [checklistCache, setChecklistCache] = useState<Record<string, ChecklistData[]>>({})
  const [expansionRestored, setExpansionRestored] = useState(false)

  const { data: projectsData, isLoading } = trpc.project.getByProposal.useQuery(
    { proposalId },
    { enabled: isApproved }
  )

  const projects = projectsData?.projects || []

  // Restore expansion state from localStorage on mount
  useEffect(() => {
    if (proposalId && !expansionRestored) {
      const stored = getStoredExpansionState(proposalId)
      if (stored) {
        setExpandedProjects(new Set(stored.projects))
        setExpandedTasks(new Set(stored.tasks))
      }
      setExpansionRestored(true)
    }
  }, [proposalId, expansionRestored])

  // Save expansion state to localStorage when it changes
  useEffect(() => {
    if (proposalId && expansionRestored) {
      saveExpansionState(proposalId, expandedProjects, expandedTasks)
    }
  }, [proposalId, expandedProjects, expandedTasks, expansionRestored])

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

  const toggleProject = useCallback(async (projectId: string) => {
    const newExpanded = new Set(expandedProjects)

    if (newExpanded.has(projectId)) {
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
      case 'ACTIVE':
      case 'IN_PROGRESS': return '⏳'
      case 'IN_REVIEW': return '👁️'
      case 'BLOCKED':
      case 'CANCELLED': return '🚫'
      case 'ON_HOLD': return '⏸️'
      default: return '○'
    }
  }

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

  // Don't show for non-approved proposals
  if (!isApproved) {
    return null
  }

  const renderProjectRow = (project: ProjectData) => {
    const isExpanded = expandedProjects.has(project.id)
    const tasks = tasksCache[project.id] || []
    const hasTasks = (project._count?.tasks || 0) > 0 || tasks.length > 0
    const taskCount = project._count?.tasks || tasks.length
    const statusIcon = getStatusIcon(project.status)

    return (
      <div key={project.id} className="border-b border-gray-100 last:border-b-0">
        {/* Project row */}
        <div className="flex items-center py-3 px-2 hover:bg-gray-50">
          {/* Expand toggle */}
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
                onClick={() => router.push(`/bands/${bandSlug}/projects/${project.id}`)}
                className="flex items-center gap-2 hover:text-blue-600 transition-colors group/nav"
                title="View project"
              >
                <Text weight="semibold" className="truncate group-hover/nav:text-blue-600">{project.name}</Text>
                <span className="text-blue-500 font-bold text-lg">→</span>
              </button>
              {project.aiGenerated && <Badge variant="info">AI</Badge>}
              {getStatusBadge(project.status)}
            </div>
            {hasTasks && (
              <Text variant="small" color="muted" className="ml-5">
                {taskCount} task{taskCount !== 1 ? 's' : ''}
              </Text>
            )}
          </div>
        </div>

        {/* Expanded tasks */}
        {isExpanded && hasTasks && (
          <div className="ml-2 md:ml-4 border-l-2 border-gray-200">
            {tasks.length === 0 ? (
              <div className="py-2 px-4 text-sm text-gray-400">Loading tasks...</div>
            ) : (
              tasks.map((task: TaskData) => renderTaskRow(task, project.id))
            )}
          </div>
        )}
      </div>
    )
  }

  const renderTaskRow = (task: TaskData, projectId: string) => {
    const isExpanded = expandedTasks.has(task.id)
    const checklistItems = checklistCache[task.id] || []
    const hasChecklist = task.checklistCount > 0 || checklistItems.length > 0
    const checklistCount = task.checklistCount || checklistItems.length
    const statusIcon = getStatusIcon(task.status)

    return (
      <div key={task.id}>
        {/* Task row */}
        <div className="flex items-center py-1 md:py-2 px-1 md:px-2 hover:bg-gray-50">
          {/* Expand toggle */}
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
                onClick={() => router.push(`/bands/${bandSlug}/tasks/${task.id}`)}
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
                {task.checklistCompleted}/{checklistCount} items
              </Text>
            )}
          </div>
        </div>

        {/* Expanded checklist */}
        {isExpanded && hasChecklist && (
          <div className="ml-2 md:ml-4 border-l-2 border-gray-100">
            {checklistItems.length === 0 ? (
              <div className="py-1 px-4 text-sm text-gray-400">Loading checklist...</div>
            ) : (
              checklistItems.map((item: ChecklistData) => (
                <div key={item.id} className="flex items-center py-1 px-1 md:px-2 hover:bg-gray-50 min-h-[44px] md:min-h-0">
                  <div className="w-4 md:w-6 flex-shrink-0" />
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
    <Card>
      <Stack spacing="lg">
        <Flex justify="between" align="center">
          <Heading level={2}>Projects ({projects.length})</Heading>
          {canCreateProject && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/bands/${bandSlug}/proposals/${proposalId}/projects`)}
            >
              Manage Projects
            </Button>
          )}
        </Flex>

        {isLoading ? (
          <Text color="muted">Loading projects...</Text>
        ) : projects.length > 0 ? (
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            {projects.map((project: any) => renderProjectRow(project))}
          </div>
        ) : (
          <Stack spacing="md">
            <Alert variant="info">
              <Text>This approved proposal doesn't have any projects yet.</Text>
            </Alert>
            {canCreateProject && (
              <Flex gap="sm">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(`/bands/${bandSlug}/proposals/${proposalId}/projects`)}
                >
                  Create Projects
                </Button>
              </Flex>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  )
}
