import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../../services/notification.service'
import { setAuditFlags, clearAuditFlags } from '../../../lib/auditContext'
import { requireGoodStanding, getBandIdFromProposal } from '../../../lib/dues-enforcement'
import { MIN_MEMBERS_TO_ACTIVATE } from '@band-it/shared'
import { checkAndAdvanceOnboarding } from '../../../lib/onboarding/milestones'

// Roles that can create projects from approved proposals
const CAN_CREATE_PROJECT = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const createProject = publicProcedure
  .input(z.object({
    proposalId: z.string(),
    name: z.string().min(1, 'Project name is required').max(200),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
    startDate: z.string().datetime().optional(),
    targetDate: z.string().datetime().optional(),
    estimatedBudget: z.number().positive().optional(),
    estimatedHours: z.number().int().positive().optional(),
    deliverables: z.string().optional(),
    successCriteria: z.string().optional(),
    tags: z.array(z.string()).optional(),
    dependsOn: z.array(z.string()).optional(),
    leadId: z.string().optional(),
    orderIndex: z.number().int().optional(),
    userId: z.string(),
    aiGenerated: z.boolean().optional().default(false),
    // Integrity Guard flags
    proceedWithFlags: z.boolean().optional(),
    flagReasons: z.array(z.string()).optional(),
    flagDetails: z.any().optional(),
  }))
  .mutation(async ({ input }) => {
    // Check dues standing
    const bandId = await getBandIdFromProposal(input.proposalId)
    await requireGoodStanding(bandId, input.userId)

    const {
      proposalId, name, description, priority, startDate, targetDate,
      estimatedBudget, estimatedHours, deliverables, successCriteria,
      tags, dependsOn, leadId, orderIndex, userId, aiGenerated,
      proceedWithFlags, flagReasons, flagDetails
    } = input

    // Set integrity flags in audit context if user proceeded with warnings
    if (proceedWithFlags && flagReasons && flagReasons.length > 0) {
      setAuditFlags({
        flagged: true,
        flagReasons,
        flagDetails,
      })
    }

    // Validate dates
    if (startDate && targetDate) {
      const start = new Date(startDate)
      const target = new Date(targetDate)
      if (target < start) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Target date cannot be before start date'
        })
      }
    }

    // Get proposal with band info
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              include: { user: true }
            }
          }
        }
      }
    })

    if (!proposal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Proposal not found'
      })
    }

    // CRITICAL: Proposal must be APPROVED
    if (proposal.status !== 'APPROVED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Can only create projects from approved proposals'
      })
    }

    // Check if band is active (has minimum members)
    if (proposal.band.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Band must be active (${MIN_MEMBERS_TO_ACTIVATE}+ members) before creating projects`
      })
    }

    // Check user is a member with permission
    const member = proposal.band.members.find(m => m.userId === userId)
    if (!member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a band member to create projects'
      })
    }

    if (!CAN_CREATE_PROJECT.includes(member.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to create projects'
      })
    }

    // If leadId provided, verify they are a band member
    if (leadId) {
      const leadMember = proposal.band.members.find(m => m.userId === leadId)
      if (!leadMember) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Lead must be a band member'
        })
      }
    }

    // Get current max orderIndex if not provided
    let finalOrderIndex = orderIndex
    if (finalOrderIndex === undefined) {
      const maxOrder = await prisma.project.aggregate({
        where: { proposalId },
        _max: { orderIndex: true }
      })
      finalOrderIndex = (maxOrder._max.orderIndex ?? -1) + 1
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        bandId: proposal.bandId,
        proposalId: proposal.id,
        name,
        description,
        priority,
        startDate: startDate ? new Date(startDate) : null,
        targetDate: targetDate ? new Date(targetDate) : null,
        estimatedBudget,
        estimatedHours,
        deliverables,
        successCriteria,
        tags: tags || [],
        dependsOn: dependsOn || [],
        leadId,
        orderIndex: finalOrderIndex,
        createdById: userId,
        aiGenerated,
      },
      include: {
        band: true,
        proposal: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        lead: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Notify band members about new project
    const notificationPromises = proposal.band.members
      .filter(m => m.userId !== userId) // Don't notify creator
      .map(m => notificationService.create({
        userId: m.userId,
        type: 'PROJECT_CREATED',
        title: 'New Project Created',
        message: `Project "${name}" was created from the approved proposal "${proposal.title}"`,
        relatedId: project.id,
        relatedType: 'project',
        actionUrl: `/bands/${proposal.band.slug}/projects/${project.id}`,
      }))

    await Promise.all(notificationPromises)

    // Clear flags to prevent leaking to other operations
    clearAuditFlags()

    // Check onboarding progress (project creation = milestone 8)
    checkAndAdvanceOnboarding(proposal.bandId).catch(err =>
      console.error('Error checking onboarding:', err)
    )

    return { project }
  })