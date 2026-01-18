import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { aiValidationService } from '../../../services/ai-validation.service'

export const aiRouter = router({
  validateProposal: publicProcedure
    .input(z.object({
      proposalId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { proposalId, userId } = input

      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: {
          band: {
            select: { id: true, values: true, mission: true, members: true }
          }
        }
      })

      if (!proposal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposal not found' })
      }

      // Check user is a member
      const isMember = proposal.band.members.some((m: any) => m.userId === userId)
      if (!isMember) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be a band member' })
      }

      const validation = await aiValidationService.validateProposal({
        title: proposal.title,
        description: proposal.description,
        problemStatement: proposal.problemStatement,
        expectedOutcome: proposal.expectedOutcome,
        budgetRequested: proposal.budgetRequested ? Number(proposal.budgetRequested) : null,
        proposedStartDate: proposal.proposedStartDate,
        proposedEndDate: proposal.proposedEndDate,
        bandValues: proposal.band.values,
        bandMission: proposal.band.mission,
        // Tracking context
        bandId: proposal.band.id,
        userId,
        proposalId,
      })

      // Save validation result (cast to Json for Prisma)
      await prisma.proposal.update({
        where: { id: proposalId },
        data: { aiValidation: validation as any }
      })

      return { validation }
    }),

  validateProject: publicProcedure
    .input(z.object({
      projectId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { projectId, userId } = input

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          band: {
            select: { id: true, values: true, mission: true, members: true }
          },
          proposal: {
            select: { budgetRequested: true }
          }
        }
      })

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
      }

      // Check user is a member
      const isMember = project.band.members.some((m: any) => m.userId === userId)
      if (!isMember) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be a band member' })
      }

      const validation = await aiValidationService.validateProject({
        name: project.name,
        description: project.description,
        startDate: project.startDate,
        targetDate: project.targetDate,
        estimatedBudget: project.estimatedBudget ? Number(project.estimatedBudget) : null,
        estimatedHours: project.estimatedHours,
        deliverables: project.deliverables,
        successCriteria: project.successCriteria,
        bandValues: project.band.values,
        bandMission: project.band.mission,
        proposalBudget: project.proposal.budgetRequested ? Number(project.proposal.budgetRequested) : null,
        // Tracking context
        bandId: project.band.id,
        userId,
        projectId,
      })

      // Save validation result (cast to Json for Prisma)
      await prisma.project.update({
        where: { id: projectId },
        data: { aiValidation: validation as any }
      })

      return { validation }
    }),

  validateTask: publicProcedure
    .input(z.object({
      taskId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { taskId, userId } = input

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          band: {
            select: { id: true, members: true }
          },
          project: {
            select: { targetDate: true, estimatedBudget: true }
          }
        }
      })

      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      }

      // Check user is a member
      const isMember = task.band.members.some((m: any) => m.userId === userId)
      if (!isMember) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be a band member' })
      }

      const validation = await aiValidationService.validateTask({
        name: task.name,
        description: task.description,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        estimatedCost: task.estimatedCost ? Number(task.estimatedCost) : null,
        projectTargetDate: task.project.targetDate,
        projectBudget: task.project.estimatedBudget ? Number(task.project.estimatedBudget) : null,
        // Tracking context
        bandId: task.band.id,
        userId,
        taskId,
      })

      // Save validation result (cast to Json for Prisma)
      await prisma.task.update({
        where: { id: taskId },
        data: { aiValidation: validation as any }
      })

      return { validation }
    }),
})
