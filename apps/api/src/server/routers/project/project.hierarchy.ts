import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'

// Status groupings for the projects page
const STATUS_GROUPS = {
  active: ['ACTIVE'],
  planning: ['PLANNING'],
  onHold: ['ON_HOLD'],
  completed: ['COMPLETED'],
  cancelled: ['CANCELLED'],
} as const

type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

function getStatusGroup(status: ProjectStatus): keyof typeof STATUS_GROUPS {
  if (STATUS_GROUPS.active.includes(status as any)) return 'active'
  if (STATUS_GROUPS.planning.includes(status as any)) return 'planning'
  if (STATUS_GROUPS.onHold.includes(status as any)) return 'onHold'
  if (STATUS_GROUPS.completed.includes(status as any)) return 'completed'
  return 'cancelled'
}

export const projectHierarchyRouter = router({
  /**
   * Get projects list grouped by status with task counts
   * Used for the main projects page with expandable hierarchy
   */
  getProjectsList: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Fetch all projects with basic info and counts
      const projects = await prisma.project.findMany({
        where: { bandId: input.bandId },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
          proposal: {
            select: { id: true, title: true },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
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
            description: project.description,
            status: project.status,
            priority: project.priority,
            startDate: project.startDate,
            targetDate: project.targetDate,
            completedAt: project.completedAt,
            createdAt: project.createdAt,
            createdBy: project.createdBy,
            proposal: project.proposal,
            taskCount: project._count.tasks,
            tasksCompleted,
            allTasksComplete: project._count.tasks > 0 && tasksCompleted === project._count.tasks,
          }
        })
      )

      // Group by status
      const grouped = {
        active: projectsWithCounts.filter(p => getStatusGroup(p.status as ProjectStatus) === 'active'),
        planning: projectsWithCounts.filter(p => getStatusGroup(p.status as ProjectStatus) === 'planning'),
        onHold: projectsWithCounts.filter(p => getStatusGroup(p.status as ProjectStatus) === 'onHold'),
        completed: projectsWithCounts.filter(p => getStatusGroup(p.status as ProjectStatus) === 'completed'),
        cancelled: projectsWithCounts.filter(p => getStatusGroup(p.status as ProjectStatus) === 'cancelled'),
      }

      return {
        success: true,
        projects: grouped,
        counts: {
          active: grouped.active.length,
          planning: grouped.planning.length,
          onHold: grouped.onHold.length,
          completed: grouped.completed.length,
          cancelled: grouped.cancelled.length,
        },
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
