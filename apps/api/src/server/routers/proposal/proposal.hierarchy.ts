import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'

// Status groupings for the proposals page
const STATUS_GROUPS = {
  drafts: ['DRAFT', 'PENDING_REVIEW'],
  voting: ['OPEN'],
  inProgress: ['APPROVED'],
  past: ['CLOSED', 'REJECTED', 'WITHDRAWN'],
} as const

type ProposalStatus = 'DRAFT' | 'PENDING_REVIEW' | 'OPEN' | 'CLOSED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'

function getStatusGroup(status: ProposalStatus): keyof typeof STATUS_GROUPS {
  if (STATUS_GROUPS.drafts.includes(status as any)) return 'drafts'
  if (STATUS_GROUPS.voting.includes(status as any)) return 'voting'
  if (STATUS_GROUPS.inProgress.includes(status as any)) return 'inProgress'
  return 'past'
}

export const proposalHierarchyRouter = router({
  /**
   * Get proposals list grouped by status with project counts
   * Used for the main proposals page with expandable hierarchy
   */
  getProposalsList: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Fetch all proposals with basic info and counts
      const proposals = await prisma.proposal.findMany({
        where: { bandId: input.bandId },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              votes: true,
              projects: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      // Calculate project completion counts for each proposal
      const proposalsWithCounts = await Promise.all(
        proposals.map(async (proposal) => {
          const projectsCompleted = await prisma.project.count({
            where: {
              proposalId: proposal.id,
              status: 'COMPLETED',
            },
          })

          // Get vote breakdown for past/voting proposals
          let voteBreakdown = null
          if (['OPEN', 'CLOSED', 'APPROVED', 'REJECTED'].includes(proposal.status)) {
            const votes = await prisma.vote.groupBy({
              by: ['vote'],
              where: { proposalId: proposal.id },
              _count: true,
            })
            voteBreakdown = {
              yes: votes.find(v => v.vote === 'YES')?._count || 0,
              no: votes.find(v => v.vote === 'NO')?._count || 0,
              abstain: votes.find(v => v.vote === 'ABSTAIN')?._count || 0,
            }
          }

          return {
            id: proposal.id,
            title: proposal.title,
            status: proposal.status,
            type: proposal.type,
            executionType: proposal.executionType,
            createdAt: proposal.createdAt,
            votingEndsAt: proposal.votingEndsAt,
            votingStartedAt: proposal.votingStartedAt,
            closedAt: proposal.closedAt,
            createdBy: proposal.createdBy,
            projectCount: proposal._count.projects,
            projectsCompleted,
            voteCount: proposal._count.votes,
            voteBreakdown,
            allProjectsComplete: proposal._count.projects > 0 && projectsCompleted === proposal._count.projects,
          }
        })
      )

      // Group by status
      const grouped = {
        drafts: proposalsWithCounts.filter(p => getStatusGroup(p.status as ProposalStatus) === 'drafts'),
        voting: proposalsWithCounts.filter(p => getStatusGroup(p.status as ProposalStatus) === 'voting'),
        inProgress: proposalsWithCounts.filter(p => getStatusGroup(p.status as ProposalStatus) === 'inProgress'),
        past: proposalsWithCounts.filter(p => getStatusGroup(p.status as ProposalStatus) === 'past'),
      }

      return {
        success: true,
        proposals: grouped,
        counts: {
          drafts: grouped.drafts.length,
          voting: grouped.voting.length,
          inProgress: grouped.inProgress.length,
          past: grouped.past.length,
        },
      }
    }),

  /**
   * Get projects for a proposal (on expand)
   * Returns projects with task completion counts
   */
  getProjectsForProposal: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const projects = await prisma.project.findMany({
        where: { proposalId: input.proposalId },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      // Calculate task completion counts for each project
      const projectsWithCounts = await Promise.all(
        projects.map(async (project) => {
          const tasksCompleted = await prisma.task.count({
            where: {
              projectId: project.id,
              status: 'COMPLETED',
            },
          })

          return {
            id: project.id,
            name: project.name,
            status: project.status,
            priority: project.priority,
            startDate: project.startDate,
            targetDate: project.targetDate,
            completedAt: project.completedAt,
            taskCount: project._count.tasks,
            tasksCompleted,
          }
        })
      )

      return {
        success: true,
        projects: projectsWithCounts,
      }
    }),

  /**
   * Get tasks for a project (on expand)
   * Returns tasks with checklist completion counts
   */
  getTasksForProject: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const tasks = await prisma.task.findMany({
        where: { projectId: input.projectId },
        include: {
          assignee: {
            select: { id: true, name: true },
          },
          _count: {
            select: { checklistItems: true },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      // Calculate checklist completion counts for each task
      const tasksWithCounts = await Promise.all(
        tasks.map(async (task) => {
          const checklistCompleted = await prisma.checklistItem.count({
            where: {
              taskId: task.id,
              isCompleted: true,
            },
          })

          return {
            id: task.id,
            name: task.name,
            status: task.status,
            dueDate: task.dueDate,
            completedAt: task.completedAt,
            assignee: task.assignee,
            checklistCount: task._count.checklistItems,
            checklistCompleted,
          }
        })
      )

      return {
        success: true,
        tasks: tasksWithCounts,
      }
    }),

  /**
   * Get checklist items for a task (on expand)
   * Returns all checklist items with their status
   */
  getChecklistForTask: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const checklistItems = await prisma.checklistItem.findMany({
        where: { taskId: input.taskId },
        include: {
          assignee: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      return {
        success: true,
        checklistItems: checklistItems.map(item => ({
          id: item.id,
          description: item.description,
          isCompleted: item.isCompleted,
          dueDate: item.dueDate,
          completedAt: item.completedAt,
          assignee: item.assignee,
        })),
      }
    }),
})
