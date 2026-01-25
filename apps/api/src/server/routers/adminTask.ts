import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import {
  adminTaskService,
  canExecuteTask,
  getAllAdminTaskHandlers,
  getAdminTaskHandler,
} from '../../services/admin-task.service'

// Import to ensure handlers are registered
import '../../services/admin-tasks'

// Roles that can access admin tasks
const CAN_ACCESS_ADMIN_TASKS = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const adminTaskRouter = router({
  /**
   * List all available admin tasks for this band
   * Returns tasks the current user's role can execute
   */
  list: publicProcedure
    .input(z.object({
      bandId: z.string(),
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      const { bandId, userId } = input

      // Get user's membership
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId, bandId },
        },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not an active member of this band',
        })
      }

      if (!CAN_ACCESS_ADMIN_TASKS.includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your role does not have access to admin tools',
        })
      }

      // Get all handlers and filter by user's role
      const handlers = getAllAdminTaskHandlers()
      const userRole = membership.role as string

      const availableTasks = handlers
        .filter(h => h.allowedRoles.includes(userRole as any))
        .map(h => ({
          taskType: h.taskType,
          name: h.name,
          description: h.description,
          icon: h.icon,
          category: h.category,
          parametersSchema: h.parametersSchema,
        }))

      // Group by category
      const byCategory = availableTasks.reduce((acc, task) => {
        if (!acc[task.category]) {
          acc[task.category] = []
        }
        acc[task.category].push(task)
        return acc
      }, {} as Record<string, typeof availableTasks>)

      return {
        tasks: availableTasks,
        byCategory,
      }
    }),

  /**
   * Get details of a specific task
   */
  getDetails: publicProcedure
    .input(z.object({
      bandId: z.string(),
      userId: z.string(),
      taskType: z.string(),
    }))
    .query(async ({ input }) => {
      const { bandId, userId, taskType } = input

      // Check permission
      const permissionCheck = await canExecuteTask(bandId, userId, taskType)
      if (!permissionCheck.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: permissionCheck.reason || 'Permission denied',
        })
      }

      const handler = getAdminTaskHandler(taskType)
      if (!handler) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Task type not found: ${taskType}`,
        })
      }

      return {
        taskType: handler.taskType,
        name: handler.name,
        description: handler.description,
        icon: handler.icon,
        category: handler.category,
        parametersSchema: handler.parametersSchema,
        hasPreview: !!handler.preview,
      }
    }),

  /**
   * Preview what a task will do before executing
   */
  preview: publicProcedure
    .input(z.object({
      bandId: z.string(),
      userId: z.string(),
      taskType: z.string(),
      parameters: z.record(z.unknown()).optional(),
    }))
    .query(async ({ input }) => {
      const { bandId, userId, taskType, parameters = {} } = input

      try {
        const preview = await adminTaskService.preview(bandId, userId, taskType, parameters)
        return preview
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Preview failed',
        })
      }
    }),

  /**
   * Execute an admin task
   */
  execute: publicProcedure
    .input(z.object({
      bandId: z.string(),
      userId: z.string(),
      taskType: z.string(),
      parameters: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { bandId, userId, taskType, parameters = {} } = input

      try {
        const result = await adminTaskService.execute(bandId, userId, taskType, parameters)
        return result
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Task execution failed',
        })
      }
    }),

  /**
   * Get execution history for this band
   */
  history: publicProcedure
    .input(z.object({
      bandId: z.string(),
      userId: z.string(),
      taskType: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const { bandId, userId, taskType, page, pageSize } = input

      // Check user has access to admin tasks
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId, bandId },
        },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not an active member of this band',
        })
      }

      if (!CAN_ACCESS_ADMIN_TASKS.includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your role does not have access to admin tools',
        })
      }

      // Build where clause
      const where: any = { bandId }
      if (taskType) {
        where.taskType = taskType
      }

      // Get total count
      const total = await prisma.adminTaskExecution.count({ where })

      // Get paginated executions
      const executions = await prisma.adminTaskExecution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          taskDefinition: {
            select: {
              name: true,
              icon: true,
            },
          },
        },
      })

      // Get executor names
      const executorIds = [...new Set(executions.map(e => e.executedById))]
      const executors = await prisma.user.findMany({
        where: { id: { in: executorIds } },
        select: { id: true, name: true },
      })
      const executorMap = new Map(executors.map(e => [e.id, e.name]))

      // Map executions with executor names
      const items = executions.map(e => ({
        id: e.id,
        taskType: e.taskType,
        taskName: e.taskDefinition?.name || e.taskType,
        taskIcon: e.taskDefinition?.icon,
        status: e.status,
        resultSummary: e.resultSummary,
        errorMessage: e.errorMessage,
        outputFileUrl: e.outputFileUrl,
        outputFileName: e.outputFileName,
        outputFileSize: e.outputFileSize,
        executedById: e.executedById,
        executedByName: executorMap.get(e.executedById) || 'Unknown',
        startedAt: e.startedAt,
        completedAt: e.completedAt,
        createdAt: e.createdAt,
        parameters: e.parameters,
      }))

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }
    }),

  /**
   * Get a specific execution details
   */
  getExecution: publicProcedure
    .input(z.object({
      bandId: z.string(),
      userId: z.string(),
      executionId: z.string(),
    }))
    .query(async ({ input }) => {
      const { bandId, userId, executionId } = input

      // Check user has access to admin tasks
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId, bandId },
        },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not an active member of this band',
        })
      }

      if (!CAN_ACCESS_ADMIN_TASKS.includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your role does not have access to admin tools',
        })
      }

      const execution = await prisma.adminTaskExecution.findFirst({
        where: {
          id: executionId,
          bandId,
        },
        include: {
          taskDefinition: true,
        },
      })

      if (!execution) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Execution not found',
        })
      }

      // Get executor name
      const executor = await prisma.user.findUnique({
        where: { id: execution.executedById },
        select: { name: true },
      })

      return {
        ...execution,
        executedByName: executor?.name || 'Unknown',
      }
    }),
})
