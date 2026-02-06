import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'

export const getProjectsByProposal = publicProcedure
  .input(z.object({
    proposalId: z.string(),
  }))
  .query(async ({ input }) => {
    const { proposalId } = input

    const projects = await prisma.project.findMany({
      where: { proposalId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        lead: {
          select: { id: true, name: true, email: true }
        },
        proposal: {
          select: { id: true, title: true, status: true }
        },
      },
      orderBy: [
        { orderIndex: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return { projects }
  })

export const getProjectById = publicProcedure
  .input(z.object({
    projectId: z.string(),
  }))
  .query(async ({ input }) => {
    const { projectId } = input

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
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
        proposal: {
          select: { 
            id: true, 
            title: true, 
            description: true,
            status: true,
            expectedOutcome: true,
            milestones: true,
            budgetRequested: true,
            proposedStartDate: true,
            proposedEndDate: true,
          }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        lead: {
          select: { id: true, name: true, email: true }
        },
      }
    })

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found'
      })
    }

    return { project }
  })

export const getProjectsByBand = publicProcedure
  .input(z.object({
    bandId: z.string(),
    status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  }))
  .query(async ({ input }) => {
    const { bandId, status, priority } = input

    const projects = await prisma.project.findMany({
      where: { 
        bandId,
        ...(status && { status }),
        ...(priority && { priority })
      },
      include: {
        proposal: {
          select: { id: true, title: true }
        },
        createdBy: {
          select: { id: true, name: true }
        },
        lead: {
          select: { id: true, name: true }
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { orderIndex: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return { projects }
  })

export const getMyProjects = publicProcedure
  .input(z.object({
    userId: z.string(),
  }))
  .query(async ({ input }) => {
    const { userId } = input

    // Get projects where user is lead or creator
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { leadId: userId },
          { createdById: userId },
        ]
      },
      include: {
        band: {
          select: { id: true, name: true, slug: true }
        },
        proposal: {
          select: { id: true, title: true }
        },
        lead: {
          select: { id: true, name: true }
        },
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return { projects }
  })

export const getProjectDeliverables = publicProcedure
  .input(z.object({
    projectId: z.string(),
    search: z.string().optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(50).default(20),
  }))
  .query(async ({ input }) => {
    const { projectId, search, page, limit } = input
    const skip = (page - 1) * limit

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, bandId: true }
    })

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found'
      })
    }

    // Build where clause for search
    const searchWhere = search ? {
      OR: [
        { summary: { contains: search, mode: 'insensitive' as const } },
        { task: { name: { contains: search, mode: 'insensitive' as const } } },
        { files: { some: { originalName: { contains: search, mode: 'insensitive' as const } } } },
      ]
    } : {}

    // Get deliverables for all tasks in this project
    const [deliverables, total] = await Promise.all([
      prisma.taskDeliverable.findMany({
        where: {
          task: { projectId },
          ...searchWhere,
        },
        include: {
          task: {
            select: {
              id: true,
              name: true,
              status: true,
              verificationStatus: true,
              completedAt: true,
              assignee: {
                select: { id: true, name: true }
              }
            }
          },
          createdBy: {
            select: { id: true, name: true }
          },
          files: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              mimeType: true,
              size: true,
              url: true,
              category: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.taskDeliverable.count({
        where: {
          task: { projectId },
          ...searchWhere,
        }
      })
    ])

    return {
      deliverables,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    }
  })