import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { MemberRole } from '@prisma/client'

// Role hierarchy for minClaimRole checks
const ROLE_HIERARCHY: Record<MemberRole, number> = {
  FOUNDER: 6,
  GOVERNOR: 5,
  MODERATOR: 4,
  CONDUCTOR: 3,
  VOTING_MEMBER: 2,
  OBSERVER: 1,
}

export const getTasksByProject = publicProcedure
  .input(z.object({
    projectId: z.string(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED']).optional(),
  }))
  .query(async ({ input }) => {
    const { projectId, status } = input

    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        ...(status && { status })
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        },
        verifiedBy: {
          select: { id: true, name: true }
        },
        _count: {
          select: { checklistItems: true }
        },
      },
      orderBy: [
        { orderIndex: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return { tasks }
  })

export const getTaskById = publicProcedure
  .input(z.object({
    taskId: z.string(),
  }))
  .query(async ({ input }) => {
    const { taskId } = input

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: { 
            id: true, 
            name: true,
            status: true,
          }
        },
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        },
        verifiedBy: {
          select: { id: true, name: true, email: true }
        },
      }
    })

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found'
      })
    }

    return { task }
  })

export const getTasksByBand = publicProcedure
  .input(z.object({
    bandId: z.string(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED']).optional(),
    assigneeId: z.string().optional(),
    projectId: z.string().optional(),
  }))
  .query(async ({ input }) => {
    const { bandId, status, assigneeId, projectId } = input

    const tasks = await prisma.task.findMany({
      where: { 
        bandId,
        ...(status && { status }),
        ...(assigneeId && { assigneeId }),
        ...(projectId && { projectId }),
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true }
        },
        assignee: {
          select: { id: true, name: true }
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return { tasks }
  })

export const getMyTasks = publicProcedure
  .input(z.object({
    userId: z.string(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED']).optional(),
  }))
  .query(async ({ input }) => {
    const { userId, status } = input

    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        ...(status && { status }),
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
        band: {
          select: { id: true, name: true, slug: true }
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return { tasks }
  })

/**
 * Get tasks in projects where user is creator or lead
 */
export const getMyProjectTasks = publicProcedure
  .input(z.object({
    userId: z.string(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED']).optional(),
  }))
  .query(async ({ input }) => {
    const { userId, status } = input

    const tasks = await prisma.task.findMany({
      where: {
        project: {
          OR: [
            { leadId: userId },
            { createdById: userId },
          ]
        },
        ...(status && { status }),
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
        band: {
          select: { id: true, name: true, slug: true }
        },
        assignee: {
          select: { id: true, name: true }
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return { tasks }
  })

/**
 * Get claimable tasks for a user across all their bands
 * - Unassigned tasks in bands where user is active member
 * - Respects minClaimRole visibility
 * - Not completed/confirmed
 */
export const getClaimableTasks = publicProcedure
  .input(z.object({
    userId: z.string(),
    bandId: z.string().optional(), // Filter to specific band
    contextPhone: z.boolean().optional(),
    contextComputer: z.boolean().optional(),
    contextTravel: z.boolean().optional(),
    maxTimeMinutes: z.number().optional(),
    limit: z.number().min(1).max(50).optional(),
  }))
  .query(async ({ input }) => {
    const { userId, bandId, contextPhone, contextComputer, contextTravel, maxTimeMinutes, limit = 20 } = input

    // Get user's active memberships with roles
    const memberships = await prisma.member.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        ...(bandId && { bandId }),
        band: { dissolvedAt: null },
      },
      select: {
        bandId: true,
        role: true,
      },
    })

    if (memberships.length === 0) {
      return { tasks: [] }
    }

    // Build band-role map
    const bandRoles = new Map<string, MemberRole>()
    memberships.forEach(m => bandRoles.set(m.bandId, m.role))

    // Get all unassigned, non-completed tasks from user's bands
    const tasks = await prisma.task.findMany({
      where: {
        bandId: { in: Array.from(bandRoles.keys()) },
        assigneeId: null,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        verificationStatus: { not: 'APPROVED' },
        // Context filters
        ...(contextPhone !== undefined && { contextPhone }),
        ...(contextComputer !== undefined && { contextComputer }),
        ...(contextTravel !== undefined && { contextTravel }),
        ...(maxTimeMinutes && { contextTimeMinutes: { lte: maxTimeMinutes } }),
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
        band: {
          select: { id: true, name: true, slug: true }
        },
        createdBy: {
          select: { id: true, name: true }
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      take: limit * 2, // Fetch extra since we'll filter by role
    })

    // Filter by minClaimRole - user's role must meet or exceed the requirement
    const claimableTasks = tasks.filter(task => {
      const userRole = bandRoles.get(task.bandId)
      if (!userRole) return false

      // If no minClaimRole, anyone can claim
      if (!task.minClaimRole) return true

      // Check role hierarchy
      return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[task.minClaimRole]
    }).slice(0, limit)

    return { tasks: claimableTasks }
  })