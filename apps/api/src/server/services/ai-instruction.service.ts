import { prisma } from '../../lib/prisma'
import type { AIOperationType } from '../../lib/ai-client'

// Map operation types to categories
const OPERATION_CATEGORIES: Record<AIOperationType, 'generation' | 'validation' | 'help'> = {
  proposal_draft: 'generation',
  proposal_validation: 'validation',
  project_validation: 'validation',
  task_validation: 'validation',
  content_legality_check: 'validation',
  content_values_check: 'validation',
  content_scope_check: 'validation',
  project_suggestions: 'generation',
  task_suggestions: 'generation',
  checklist_suggestions: 'generation',
  help_question: 'help',
}

/**
 * Get category for an operation type
 */
export function getOperationCategory(operation: AIOperationType): 'generation' | 'validation' | 'help' {
  return OPERATION_CATEGORIES[operation]
}

/**
 * Fetch all active AI instructions for a band that apply to a specific operation.
 * Instructions are matched by:
 * 1. Exact operation match (most specific)
 * 2. Category match (e.g., all 'generation' operations)
 * 3. Band-wide match (applies to all AI operations)
 */
export async function getInstructionsForOperation(
  bandId: string,
  operation: AIOperationType
): Promise<string[]> {
  const category = getOperationCategory(operation)

  const instructions = await prisma.aIInstruction.findMany({
    where: {
      bandId,
      isActive: true,
      OR: [
        // Exact operation match
        { operation },
        // Category match (operation is null for category-wide)
        { category, operation: null },
        // Band-wide match (both category and operation are null)
        { category: null, operation: null },
      ],
    },
    orderBy: [
      // Most specific first
      { operation: 'desc' }, // non-null first
      { category: 'desc' },  // non-null first
      { createdAt: 'asc' },  // oldest first
    ],
  })

  return instructions.map(i => i.instruction)
}

/**
 * Format instructions for injection into a system prompt
 */
export function formatInstructionsForPrompt(instructions: string[]): string {
  if (instructions.length === 0) return ''

  return `\n\nBand-Specific Instructions:\nThis band has provided the following guidance for AI interactions:\n${instructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\nPlease incorporate these preferences while completing your task.`
}

/**
 * Create a new AI instruction for a band
 */
export async function createInstruction(data: {
  bandId: string
  createdById: string
  instruction: string
  operation?: AIOperationType
  category?: 'generation' | 'validation' | 'help'
}) {
  return prisma.aIInstruction.create({
    data: {
      bandId: data.bandId,
      createdById: data.createdById,
      instruction: data.instruction,
      operation: data.operation || null,
      category: data.category || null,
    },
  })
}

/**
 * List all instructions for a band
 */
export async function listInstructions(bandId: string, includeInactive = false) {
  return prisma.aIInstruction.findMany({
    where: {
      bandId,
      ...(includeInactive ? {} : { isActive: true }),
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
}

/**
 * Toggle an instruction's active status
 */
export async function toggleInstruction(instructionId: string, isActive: boolean) {
  return prisma.aIInstruction.update({
    where: { id: instructionId },
    data: { isActive },
  })
}

/**
 * Delete an instruction
 */
export async function deleteInstruction(instructionId: string) {
  return prisma.aIInstruction.delete({
    where: { id: instructionId },
  })
}
