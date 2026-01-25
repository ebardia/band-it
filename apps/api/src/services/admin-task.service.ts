import { prisma } from '../lib/prisma'
import { storageService } from './storage.service'
import type { MemberRole, AdminTaskExecutionStatus } from '@prisma/client'

// ============================================
// TYPES
// ============================================

/**
 * Context passed to task handlers during execution
 */
export interface TaskExecutionContext {
  bandId: string
  executedById: string
  parameters: Record<string, unknown>
}

/**
 * Result returned from task handlers
 */
export interface TaskExecutionResult {
  success: boolean
  summary: string
  data?: Record<string, unknown>
  error?: string
  // For file exports
  fileBuffer?: Buffer
  fileName?: string
  mimeType?: string
}

/**
 * Task handler interface - implement this for each task type
 */
export interface AdminTaskHandler {
  taskType: string
  name: string
  description: string
  icon?: string
  category: string
  allowedRoles: MemberRole[]
  parametersSchema?: Record<string, unknown>

  // Validate parameters before execution
  validate: (parameters: Record<string, unknown>, context: TaskExecutionContext) => Promise<string[]>

  // Preview what the task will do (optional)
  preview?: (parameters: Record<string, unknown>, context: TaskExecutionContext) => Promise<{
    summary: string
    details?: Record<string, unknown>
  }>

  // Execute the task
  execute: (context: TaskExecutionContext) => Promise<TaskExecutionResult>
}

// ============================================
// HANDLER REGISTRY
// ============================================

const taskHandlers = new Map<string, AdminTaskHandler>()

/**
 * Register an admin task handler
 */
export function registerAdminTaskHandler(handler: AdminTaskHandler): void {
  taskHandlers.set(handler.taskType, handler)
}

/**
 * Get a registered task handler
 */
export function getAdminTaskHandler(taskType: string): AdminTaskHandler | undefined {
  return taskHandlers.get(taskType)
}

/**
 * Get all registered task handlers
 */
export function getAllAdminTaskHandlers(): AdminTaskHandler[] {
  return Array.from(taskHandlers.values())
}

// ============================================
// PERMISSION CHECKS
// ============================================

/**
 * Check if a user's role can execute a specific task
 */
export async function canExecuteTask(
  bandId: string,
  userId: string,
  taskType: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Get user's membership
  const membership = await prisma.member.findUnique({
    where: {
      userId_bandId: { userId, bandId },
    },
  })

  if (!membership || membership.status !== 'ACTIVE') {
    return { allowed: false, reason: 'You are not an active member of this band' }
  }

  // Get the task handler
  const handler = getAdminTaskHandler(taskType)
  if (!handler) {
    return { allowed: false, reason: `Unknown task type: ${taskType}` }
  }

  // Check role permission
  if (!handler.allowedRoles.includes(membership.role)) {
    return {
      allowed: false,
      reason: `Your role (${membership.role}) does not have permission to execute this task. Required: ${handler.allowedRoles.join(', ')}`
    }
  }

  return { allowed: true }
}

// ============================================
// TASK EXECUTION
// ============================================

/**
 * Execute an admin task
 */
export async function executeAdminTask(
  bandId: string,
  userId: string,
  taskType: string,
  parameters: Record<string, unknown> = {}
): Promise<{
  executionId: string
  success: boolean
  summary: string
  fileUrl?: string
  fileName?: string
  error?: string
}> {
  // Check permission
  const permissionCheck = await canExecuteTask(bandId, userId, taskType)
  if (!permissionCheck.allowed) {
    throw new Error(permissionCheck.reason)
  }

  // Get handler
  const handler = getAdminTaskHandler(taskType)
  if (!handler) {
    throw new Error(`Unknown task type: ${taskType}`)
  }

  // Get or create task definition in DB
  let taskDefinition = await prisma.adminTaskDefinition.findUnique({
    where: { taskType },
  })

  if (!taskDefinition) {
    // Auto-create definition from handler
    taskDefinition = await prisma.adminTaskDefinition.create({
      data: {
        taskType: handler.taskType,
        name: handler.name,
        description: handler.description,
        icon: handler.icon,
        category: handler.category,
        allowedRoles: handler.allowedRoles,
        parametersSchema: handler.parametersSchema as object | undefined,
      },
    })
  }

  // Create execution record
  const execution = await prisma.adminTaskExecution.create({
    data: {
      taskDefinitionId: taskDefinition.id,
      taskType,
      bandId,
      executedById: userId,
      parameters: parameters as object,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  })

  const context: TaskExecutionContext = {
    bandId,
    executedById: userId,
    parameters,
  }

  try {
    // Validate parameters
    const validationErrors = await handler.validate(parameters, context)
    if (validationErrors.length > 0) {
      await prisma.adminTaskExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          errorMessage: validationErrors.join('; '),
          completedAt: new Date(),
        },
      })
      return {
        executionId: execution.id,
        success: false,
        summary: 'Validation failed',
        error: validationErrors.join('; '),
      }
    }

    // Execute the task
    const result = await handler.execute(context)

    // Handle file output if present
    let outputFileUrl: string | undefined
    let outputFileName: string | undefined
    let outputFileSize: number | undefined

    if (result.fileBuffer && result.fileName) {
      const uploadResult = await storageService.upload(
        result.fileBuffer,
        result.fileName,
        result.mimeType || 'text/csv'
      )
      outputFileUrl = uploadResult.url
      outputFileName = result.fileName
      outputFileSize = result.fileBuffer.length
    }

    // Update execution record
    await prisma.adminTaskExecution.update({
      where: { id: execution.id },
      data: {
        status: result.success ? 'COMPLETED' : 'FAILED',
        resultSummary: result.summary,
        resultData: result.data as object | undefined,
        errorMessage: result.error,
        outputFileUrl,
        outputFileName,
        outputFileSize,
        completedAt: new Date(),
      },
    })

    return {
      executionId: execution.id,
      success: result.success,
      summary: result.summary,
      fileUrl: outputFileUrl,
      fileName: outputFileName,
      error: result.error,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await prisma.adminTaskExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        errorMessage,
        completedAt: new Date(),
      },
    })

    return {
      executionId: execution.id,
      success: false,
      summary: 'Task execution failed',
      error: errorMessage,
    }
  }
}

/**
 * Get preview of what a task will do
 */
export async function previewAdminTask(
  bandId: string,
  userId: string,
  taskType: string,
  parameters: Record<string, unknown> = {}
): Promise<{
  summary: string
  details?: Record<string, unknown>
}> {
  // Check permission
  const permissionCheck = await canExecuteTask(bandId, userId, taskType)
  if (!permissionCheck.allowed) {
    throw new Error(permissionCheck.reason)
  }

  // Get handler
  const handler = getAdminTaskHandler(taskType)
  if (!handler) {
    throw new Error(`Unknown task type: ${taskType}`)
  }

  if (!handler.preview) {
    return { summary: 'Preview not available for this task' }
  }

  const context: TaskExecutionContext = {
    bandId,
    executedById: userId,
    parameters,
  }

  return handler.preview(parameters, context)
}

// ============================================
// SERVICE EXPORT
// ============================================

export const adminTaskService = {
  registerHandler: registerAdminTaskHandler,
  getHandler: getAdminTaskHandler,
  getAllHandlers: getAllAdminTaskHandlers,
  canExecute: canExecuteTask,
  execute: executeAdminTask,
  preview: previewAdminTask,
}
