import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'

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