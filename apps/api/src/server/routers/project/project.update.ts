import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'

// Roles that can update projects
const CAN_UPDATE_PROJECT = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const updateProject = publicProcedure
  .input(z.object({
    projectId: z.string(),
    userId: z.string(),
    // Optional fields to update
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    startDate: z.string().datetime().optional().nullable(),
    targetDate: z.string().datetime().optional().nullable(),
    estimatedBudget: z.number().positive().optional().nullable(),
    estimatedHours: z.number().int().positive().optional().nullable(),
    deliverables: z.string().optional().nullable(),
    successCriteria: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
    dependsOn: z.array(z.string()).optional(),
    leadId: z.string().optional().nullable(),
    orderIndex: z.number().int().optional(),
  }))
  .mutation(async ({ input }) => {
    const { 
      projectId, userId, name, description, status, priority,
      startDate, targetDate, estimatedBudget, estimatedHours,
      deliverables, successCriteria, tags, dependsOn, leadId, orderIndex
    } = input

    // Get project with band members
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    })

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found'
      })
    }

    // Validate dates (considering both new and existing values)
    const finalStartDate = startDate !== undefined 
      ? (startDate ? new Date(startDate) : null)
      : project.startDate
    const finalTargetDate = targetDate !== undefined
      ? (targetDate ? new Date(targetDate) : null)
      : project.targetDate
    
    if (finalStartDate && finalTargetDate && finalTargetDate < finalStartDate) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Target date cannot be before start date'
      })
    }

    // Check user has permission
    const member = project.band.members.find(m => m.userId === userId)
    if (!member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member to update projects'
      })
    }

    if (!CAN_UPDATE_PROJECT.includes(member.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to update projects'
      })
    }

    // If leadId provided, verify they are a band member
    if (leadId) {
      const leadMember = project.band.members.find(m => m.userId === leadId)
      if (!leadMember) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Lead must be a band member'
        })
      }
    }

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) {
      updateData.status = status
      // Set completedAt if marking as completed
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
      } else if (project.status === 'COMPLETED' && status !== 'COMPLETED') {
        // Clear completedAt if moving away from completed
        updateData.completedAt = null
      }
    }
    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null
    }
    if (targetDate !== undefined) {
      updateData.targetDate = targetDate ? new Date(targetDate) : null
    }
    if (estimatedBudget !== undefined) {
      updateData.estimatedBudget = estimatedBudget
    }
    if (estimatedHours !== undefined) {
      updateData.estimatedHours = estimatedHours
    }
    if (deliverables !== undefined) {
      updateData.deliverables = deliverables
    }
    if (successCriteria !== undefined) {
      updateData.successCriteria = successCriteria
    }
    if (tags !== undefined) {
      updateData.tags = tags
    }
    if (dependsOn !== undefined) {
      updateData.dependsOn = dependsOn
    }
    if (leadId !== undefined) {
      updateData.leadId = leadId
    }
    if (orderIndex !== undefined) {
      updateData.orderIndex = orderIndex
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        band: true,
        proposal: {
          select: { id: true, title: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        lead: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return { project: updatedProject }
  })