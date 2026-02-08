import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import type { AIOperationType } from '../../../lib/ai-client'

// Roles that can manage AI instructions
const CAN_MANAGE_AI = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

// Valid operation types for instructions
const OPERATION_TYPES = [
  'proposal_draft',
  'proposal_validation',
  'project_validation',
  'task_validation',
  'content_legality_check',
  'content_values_check',
  'content_scope_check',
  'project_suggestions',
  'task_suggestions',
  'checklist_suggestions',
  'help_question',
] as const

// Valid category types
const CATEGORY_TYPES = ['generation', 'validation', 'help'] as const

export const bandAIInstructionRouter = router({
  /**
   * List all AI instructions for a band
   */
  list: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        includeInactive: z.boolean().optional().default(false),
      })
    )
    .query(async ({ input }) => {
      // Check membership and role
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member to view AI instructions',
        })
      }

      if (!CAN_MANAGE_AI.includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only moderators and above can view AI instructions',
        })
      }

      const instructions = await prisma.aIInstruction.findMany({
        where: {
          bandId: input.bandId,
          ...(input.includeInactive ? {} : { isActive: true }),
        },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: [
          { isActive: 'desc' },
          { createdAt: 'desc' },
        ],
      })

      return { instructions, canManage: CAN_MANAGE_AI.includes(membership.role) }
    }),

  /**
   * Create a new AI instruction
   */
  create: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        instruction: z.string().min(10).max(500),
        operation: z.enum(OPERATION_TYPES).optional(),
        category: z.enum(CATEGORY_TYPES).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check membership and role
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member to create AI instructions',
        })
      }

      if (!CAN_MANAGE_AI.includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only moderators and above can create AI instructions',
        })
      }

      // If operation is specified, don't allow category (operation implies category)
      // If category is specified without operation, that's fine
      const instruction = await prisma.aIInstruction.create({
        data: {
          bandId: input.bandId,
          createdById: input.userId,
          instruction: input.instruction,
          operation: input.operation || null,
          category: input.operation ? null : (input.category || null),
        },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
      })

      // Log to audit
      await prisma.auditLog.create({
        data: {
          bandId: input.bandId,
          action: 'created',
          entityType: 'AIInstruction',
          entityId: instruction.id,
          entityName: instruction.instruction.substring(0, 50),
          actorId: input.userId,
          actorType: 'user',
        },
      })

      return { instruction }
    }),

  /**
   * Toggle an instruction's active status
   */
  toggle: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        instructionId: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      // Check membership and role
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member',
        })
      }

      if (!CAN_MANAGE_AI.includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only moderators and above can manage AI instructions',
        })
      }

      // Verify instruction belongs to this band
      const existing = await prisma.aIInstruction.findUnique({
        where: { id: input.instructionId },
      })

      if (!existing || existing.bandId !== input.bandId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Instruction not found',
        })
      }

      const instruction = await prisma.aIInstruction.update({
        where: { id: input.instructionId },
        data: { isActive: input.isActive },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
      })

      // Log to audit
      await prisma.auditLog.create({
        data: {
          bandId: input.bandId,
          action: 'updated',
          entityType: 'AIInstruction',
          entityId: instruction.id,
          entityName: instruction.instruction.substring(0, 50),
          actorId: input.userId,
          actorType: 'user',
          changes: { isActive: { from: existing.isActive, to: input.isActive } },
        },
      })

      return { instruction }
    }),

  /**
   * Delete an instruction
   */
  delete: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        instructionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Check membership and role
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an active member',
        })
      }

      if (!CAN_MANAGE_AI.includes(membership.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only moderators and above can delete AI instructions',
        })
      }

      // Verify instruction belongs to this band
      const existing = await prisma.aIInstruction.findUnique({
        where: { id: input.instructionId },
      })

      if (!existing || existing.bandId !== input.bandId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Instruction not found',
        })
      }

      await prisma.aIInstruction.delete({
        where: { id: input.instructionId },
      })

      // Log to audit
      await prisma.auditLog.create({
        data: {
          bandId: input.bandId,
          action: 'deleted',
          entityType: 'AIInstruction',
          entityId: input.instructionId,
          entityName: existing.instruction.substring(0, 50),
          actorId: input.userId,
          actorType: 'user',
        },
      })

      return { success: true }
    }),
})
