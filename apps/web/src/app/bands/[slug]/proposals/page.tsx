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
  useToast,
  Flex,
  Card,
  Badge,
  Loading,
  Alert,
  BandLayout
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

// Roles that can create proposals
const CAN_CREATE_PROPOSAL = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']
// Roles that can review proposals
const CAN_REVIEW = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

// Status icons
const STATUS_ICONS = {
  COMPLETED: '✅',
  IN_PROGRESS: '⏳',
  NOT_STARTED: '○',
}

interface ProposalData {
  id: string
  title: string
  status: string
  type: string
  executionType: string
  createdAt: string
  votingEndsAt: string | null
  votingStartedAt: string | null
  closedAt: string | null
  createdBy: { id: string; name: string }
  projectCount: number
  projectsCompleted: number
  voteCount: number
  voteBreakdown: { yes: number; no: number; abstain: number } | null
  allProjectsComplete: boolean
}

interface ProjectData {
  id: string
  name: string
  status: string
  priority: string
  taskCount: number
  tasksCompleted: number
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
const EXPANSION_STATE_KEY = 'proposals-expansion-state'

// Helper to get stored expansion state
function getStoredExpansionState(slug: string): { proposals: string[], projects: string[], tasks: string[] } | null {
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
function saveExpansionState(slug: string, proposals: Set<string>, projects: Set<string>, tasks: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${EXPANSION_STATE_KEY}-${slug}`, JSON.stringify({
      proposals: Array.from(proposals),
      projects: Array.from(projects),
      tasks: Array.from(tasks),
    }))
  } catch (e) {
    console.error('Failed to save expansion state:', e)
  }
}

export default function ProposalsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [expansionRestored, setExpansionRestored] = useState(false)

  // Expansion state - will be restored from localStorage
  const [expandedProposals, setExpandedProposals] = useState<Set<string>>(new Set())
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  // Cache for lazy-loaded data
  const [projectsCache, setProjectsCache] = useState<Record<string, ProjectData[]>>({})
  const [tasksCache, setTasksCache] = useState<Record<string, TaskData[]>>({})
  const [checklistCache, setChecklistCache] = useState<Record<string, ChecklistData[]>>({})

  // Restore expansion state from localStorage on mount
  useEffect(() => {
    if (slug && !expansionRestored) {
      const stored = getStoredExpansionState(slug)
      if (stored) {
        setExpandedProposals(new Set(stored.proposals))
        setExpandedProjects(new Set(stored.projects))
        setExpandedTasks(new Set(stored.tasks))
      }
      setExpansionRestored(true)
    }
  }, [slug, expansionRestored])

  // Save expansion state to localStorage when it changes
  useEffect(() => {
    if (slug && expansionRestored) {
      saveExpansionState(slug, expandedProposals, expandedProjects, expandedTasks)
    }
  }, [slug, expandedProposals, expandedProjects, expandedTasks, expansionRestored])

  const utils = trpc.useUtils()

  // Fetch data for restored expanded items
  useEffect(() => {
    if (!expansionRestored) return

    // Fetch projects for expanded proposals
    expandedProposals.forEach(async (proposalId) => {
      if (!projectsCache[proposalId]) {
        try {
          const result = await utils.proposal.getProjectsForProposal.fetch({ proposalId })
          if (result.projects) {
            setProjectsCache(prev => ({ ...prev, [proposalId]: result.projects }))
          }
        } catch (error) {
          console.error('Failed to fetch projects:', error)
        }
      }
    })

    // Fetch tasks for expanded projects
    expandedProjects.forEach(async (projectId) => {
      if (!tasksCache[projectId]) {
        try {
          const result = await utils.proposal.getTasksForProject.fetch({ projectId })
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
          const result = await utils.proposal.getChecklistForTask.fetch({ taskId })
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
  const { data: proposalsData, isLoading: proposalsLoading } = trpc.proposal.getProposalsList.useQuery(
    { bandId: bandData?.band?.id || '' },
    { enabled: !!bandData?.band?.id }
  )

  // Query for pending review proposals (for reviewers)
  const { data: pendingReviewData } = trpc.proposal.getPendingReview.useQuery(
    { bandId: bandData?.band?.id || '', userId: userId || '' },
    { enabled: !!bandData?.band?.id && !!userId }
  )

  // Lazy loading queries
  const projectsQuery = trpc.proposal.getProjectsForProposal.useQuery(
    { proposalId: '' },
    { enabled: false }
  )

  const tasksQuery = trpc.proposal.getTasksForProject.useQuery(
    { projectId: '' },
    { enabled: false }
  )

  const checklistQuery = trpc.proposal.getChecklistForTask.useQuery(
    { taskId: '' },
    { enabled: false }
  )

  // Toggle proposal expansion
  const toggleProposal = useCallback(async (proposalId: string) => {
    const newExpanded = new Set(expandedProposals)

    if (newExpanded.has(proposalId)) {
      // Collapse: remove from expanded and collapse all children
      newExpanded.delete(proposalId)

      // Collapse child projects
      const childProjects = projectsCache[proposalId] || []
      const projectIds = new Set(childProjects.map(p => p.id))
      setExpandedProjects(prev => {
        const next = new Set(prev)
        projectIds.forEach(id => next.delete(id))
        return next
      })

      // Collapse child tasks
      childProjects.forEach(project => {
        const childTasks = tasksCache[project.id] || []
        const taskIds = new Set(childTasks.map(t => t.id))
        setExpandedTasks(prev => {
          const next = new Set(prev)
          taskIds.forEach(id => next.delete(id))
          return next
        })
      })
    } else {
      // Expand: add to expanded and fetch projects if not cached
      newExpanded.add(proposalId)

      if (!projectsCache[proposalId]) {
        try {
          const result = await utils.proposal.getProjectsForProposal.fetch({ proposalId })
          if (result.projects) {
            setProjectsCache(prev => ({ ...prev, [proposalId]: result.projects }))
          }
        } catch (error) {
          console.error('Failed to fetch projects:', error)
        }
      }
    }

    setExpandedProposals(newExpanded)
  }, [expandedProposals, projectsCache, tasksCache, utils])

  // Toggle project expansion
  const toggleProject = useCallback(async (projectId: string) => {
    const newExpanded = new Set(expandedProjects)

    if (newExpanded.has(projectId)) {
      // Collapse
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
      // Expand
      newExpanded.add(projectId)

      if (!tasksCache[projectId]) {
        try {
          const result = await utils.proposal.getTasksForProject.fetch({ projectId })
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
          const result = await utils.proposal.getChecklistForTask.fetch({ taskId })
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

  // Get status indicator for project/task
  const getStatusIndicator = (completed: number, total: number) => {
    if (total === 0) return STATUS_ICONS.NOT_STARTED
    if (completed === total) return STATUS_ICONS.COMPLETED
    if (completed > 0) return STATUS_ICONS.IN_PROGRESS
    return STATUS_ICONS.NOT_STARTED
  }

  // Format relative time for voting end
  const getVotingTimeLeft = (votingEndsAt: string | null) => {
    if (!votingEndsAt) return ''
    const end = new Date(votingEndsAt)
    const now = new Date()
    const diffMs = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Ended'
    if (diffDays === 0) return 'Ends today'
    if (diffDays === 1) return 'Ends tomorrow'
    return `Ends in ${diffDays} days`
  }

  if (bandLoading || proposalsLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Proposals"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading proposals..." />
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
          pageTitle="Proposals"
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
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const canCreateProposal = currentMember && CAN_CREATE_PROPOSAL.includes(currentMember.role)
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)
  const canReview = currentMember && CAN_REVIEW.includes(currentMember.role)
  const pendingReviewProposals = pendingReviewData?.proposals || []

  const proposals = proposalsData?.proposals || { drafts: [], voting: [], inProgress: [], past: [] }
  const counts = proposalsData?.counts || { drafts: 0, voting: 0, inProgress: 0, past: 0 }

  // Render a single proposal row
  const renderProposalRow = (proposal: ProposalData, showExpandToggle: boolean = true) => {
    const isExpanded = expandedProposals.has(proposal.id)
    const hasProjects = proposal.projectCount > 0
    const projects = projectsCache[proposal.id] || []

    return (
      <div key={proposal.id} className="border-b border-gray-100 last:border-b-0">
        {/* Proposal row */}
        <div className="flex items-center py-3 px-2 hover:bg-gray-50 group">
          {/* Expand toggle - 44px tap target on mobile */}
          <button
            onClick={(e) => { e.stopPropagation(); if (hasProjects) toggleProposal(proposal.id) }}
            className={`min-w-[44px] min-h-[44px] md:w-8 md:h-8 md:min-w-0 md:min-h-0 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0 ${!hasProjects ? 'invisible' : ''}`}
            disabled={!hasProjects}
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          {/* Proposal info */}
          <div className="flex-1 min-w-0 ml-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => router.push(`/bands/${slug}/proposals/${proposal.id}`)}
                className="flex items-center gap-2 hover:text-blue-600 transition-colors group/nav"
                title="View proposal"
              >
                <Text weight="semibold" className="truncate group-hover/nav:text-blue-600">{proposal.title}</Text>
                <span className="text-blue-500 font-bold text-lg">→</span>
              </button>
              {proposal.allProjectsComplete && proposal.status === 'APPROVED' && (
                <Badge variant="success">✅ All complete</Badge>
              )}
              {/* Status badge - inline on mobile */}
              {proposal.status === 'DRAFT' && <Badge variant="neutral">DRAFT</Badge>}
              {proposal.status === 'PENDING_REVIEW' && <Badge variant="warning">PENDING</Badge>}
              {proposal.status === 'APPROVED' && !proposal.allProjectsComplete && <Badge variant="info">IN PROGRESS</Badge>}
              {proposal.status === 'REJECTED' && <Badge variant="danger">REJECTED</Badge>}
              {proposal.status === 'CLOSED' && <Badge variant="neutral">CLOSED</Badge>}
              {proposal.status === 'WITHDRAWN' && <Badge variant="neutral">WITHDRAWN</Badge>}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
              {proposal.status === 'OPEN' && (
                <span>{getVotingTimeLeft(proposal.votingEndsAt)}</span>
              )}
              {proposal.status === 'APPROVED' && proposal.projectCount > 0 && (
                <span>{proposal.projectsCompleted} of {proposal.projectCount} projects ✓</span>
              )}
              {(proposal.status === 'DRAFT' || proposal.status === 'PENDING_REVIEW') && (
                <span>Started {new Date(proposal.createdAt).toLocaleDateString()}</span>
              )}
              {['CLOSED', 'REJECTED', 'WITHDRAWN'].includes(proposal.status) && proposal.voteBreakdown && (
                <span>{proposal.voteBreakdown.yes} yes, {proposal.voteBreakdown.no} no</span>
              )}
              <span>by {proposal.createdBy.name}</span>
            </div>
          </div>
        </div>

        {/* Expanded projects - 8px indent mobile, 16px desktop */}
        {isExpanded && hasProjects && (
          <div className="ml-2 md:ml-4 border-l-2 border-gray-200">
            {projects.length === 0 ? (
              <div className="py-2 px-4 text-sm text-gray-400">Loading projects...</div>
            ) : (
              projects.map(project => renderProjectRow(project, proposal.id))
            )}
          </div>
        )}
      </div>
    )
  }

  // Render a project row
  const renderProjectRow = (project: ProjectData, proposalId: string) => {
    const isExpanded = expandedProjects.has(project.id)
    const hasTasks = project.taskCount > 0
    const tasks = tasksCache[project.id] || []
    const statusIcon = getStatusIndicator(project.tasksCompleted, project.taskCount)

    return (
      <div key={project.id}>
        {/* Project row */}
        <div className="flex items-center py-1 md:py-2 px-1 md:px-2 hover:bg-gray-50">
          {/* Expand toggle - 44px tap target on mobile */}
          <button
            onClick={(e) => { e.stopPropagation(); if (hasTasks) toggleProject(project.id) }}
            className={`min-w-[44px] min-h-[44px] md:w-7 md:h-7 md:min-w-0 md:min-h-0 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0 text-sm ${!hasTasks ? 'invisible' : ''}`}
            disabled={!hasTasks}
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          {/* Project info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-gray-500 text-sm">📁</span>
              <button
                onClick={() => router.push(`/bands/${slug}/projects/${project.id}`)}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors group/nav"
                title="View project"
              >
                <Text variant="small" weight="semibold" className="truncate group-hover/nav:text-blue-600">{project.name}</Text>
                <span className="text-blue-500 font-bold">→</span>
              </button>
              <span className="text-sm">{statusIcon}</span>
            </div>
            {project.taskCount > 0 && (
              <Text variant="small" color="muted" className="ml-5 md:ml-6">
                {project.tasksCompleted}/{project.taskCount} tasks
              </Text>
            )}
          </div>
        </div>

        {/* Expanded tasks - 8px indent mobile, 16px desktop */}
        {isExpanded && hasTasks && (
          <div className="ml-2 md:ml-4 border-l-2 border-gray-100">
            {tasks.length === 0 ? (
              <div className="py-2 px-4 text-sm text-gray-400">Loading tasks...</div>
            ) : (
              tasks.map(task => renderTaskRow(task, project.id))
            )}
          </div>
        )}
      </div>
    )
  }

  // Render a task row
  const renderTaskRow = (task: TaskData, projectId: string) => {
    const isExpanded = expandedTasks.has(task.id)
    const hasChecklist = task.checklistCount > 0
    const checklistItems = checklistCache[task.id] || []
    const isCompleted = task.status === 'COMPLETED'
    const statusIcon = isCompleted ? '✅' : (task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW') ? '⏳' : '○'

    return (
      <div key={task.id}>
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
        </div>

        {/* Expanded checklist - 8px indent mobile, 16px desktop */}
        {isExpanded && hasChecklist && (
          <div className="ml-2 md:ml-4 border-l-2 border-gray-50">
            {checklistItems.length === 0 ? (
              <div className="py-1 px-4 text-sm text-gray-400">Loading checklist...</div>
            ) : (
              checklistItems.map(item => renderChecklistRow(item, task.id))
            )}
          </div>
        )}
      </div>
    )
  }

  // Render a checklist item row
  const renderChecklistRow = (item: ChecklistData, taskId: string) => {
    return (
      <div key={item.id} className="flex items-center py-1 px-1 md:px-2 hover:bg-gray-50 min-h-[44px] md:min-h-0">
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
      </div>
    )
  }

  // Render a section
  const renderSection = (
    icon: string,
    title: string,
    count: number,
    proposalsList: ProposalData[],
    emptyMessage: string,
    defaultCollapsed: boolean = false
  ) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

    return (
      <div className="mb-6">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center gap-2 py-2 text-left hover:bg-gray-50 rounded"
        >
          <span className="text-lg">{icon}</span>
          <Heading level={3} className="flex-1">
            {title} ({count})
          </Heading>
          <span className="text-gray-400 text-sm">{isCollapsed ? '▶' : '▼'}</span>
        </button>

        {!isCollapsed && (
          <div className="border border-gray-200 rounded-lg mt-2 bg-white">
            {proposalsList.length === 0 ? (
              <div className="py-4 px-4 text-center text-gray-500">
                {emptyMessage}
              </div>
            ) : (
              proposalsList.map(proposal => renderProposalRow(proposal))
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="Proposals"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        canCreateProposal={canCreateProposal}
        bandId={bandData?.band?.id}
        userId={userId || undefined}
        action={
          canCreateProposal ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push(`/bands/${slug}/proposals/create`)}
            >
              + New Proposal
            </Button>
          ) : undefined
        }
      >
        <Stack spacing="lg">
          {/* Pending Review Alert (for reviewers) */}
          {canReview && pendingReviewProposals.length > 0 && (
            <Alert variant="warning">
              <Flex justify="between" align="center" className="flex-wrap gap-2">
                <Text weight="semibold">
                  ⚠️ {pendingReviewProposals.length} proposal(s) waiting for your review
                </Text>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // Scroll to drafts section or expand it
                    const el = document.getElementById('drafts-section')
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  Review Now
                </Button>
              </Flex>
            </Alert>
          )}

          {/* Drafts & Pending Review Section */}
          <div id="drafts-section">
            <SectionHeader
              icon="📝"
              title="Drafts & Pending Review"
              count={counts.drafts}
              proposals={proposals.drafts}
              emptyMessage="No drafts. Start a new proposal above."
              renderProposalRow={renderProposalRow}
              slug={slug}
              router={router}
            />
          </div>

          {/* Open for Voting Section */}
          <SectionHeader
            icon="🗳️"
            title="Open for Voting"
            count={counts.voting}
            proposals={proposals.voting}
            emptyMessage="No proposals currently open for voting."
            renderProposalRow={renderProposalRow}
            slug={slug}
            router={router}
          />

          {/* In Progress Section */}
          <SectionHeader
            icon="⚙️"
            title="In Progress"
            count={counts.inProgress}
            proposals={proposals.inProgress}
            emptyMessage="No approved proposals in progress."
            renderProposalRow={renderProposalRow}
            slug={slug}
            router={router}
          />

          {/* Past Section */}
          <SectionHeader
            icon="📁"
            title="Past"
            count={counts.past}
            proposals={proposals.past}
            emptyMessage="No past proposals yet."
            renderProposalRow={renderProposalRow}
            defaultCollapsed={counts.past > 5}
            slug={slug}
            router={router}
          />
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
  proposals,
  emptyMessage,
  renderProposalRow,
  defaultCollapsed = false,
  slug,
  router,
}: {
  icon: string
  title: string
  count: number
  proposals: ProposalData[]
  emptyMessage: string
  renderProposalRow: (proposal: ProposalData) => React.ReactNode
  defaultCollapsed?: boolean
  slug: string
  router: any
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
          {proposals.length === 0 ? (
            <div className="py-6 px-4 text-center text-gray-500">
              {emptyMessage}
            </div>
          ) : (
            proposals.map(proposal => renderProposalRow(proposal))
          )}
        </div>
      )}
    </div>
  )
}
