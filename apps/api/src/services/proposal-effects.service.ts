import { TRPCError } from '@trpc/server'
import { prisma } from '../lib/prisma'
import type { ProposalExecutionType } from '@prisma/client'

// ============================================
// TYPES
// ============================================

/**
 * Base structure for a proposal effect.
 * Each effect describes an action to be executed when a proposal is approved.
 */
export interface ProposalEffect {
  type: string           // Effect type identifier (e.g., "UPDATE_BAND_SETTING", "CREATE_TASK")
  payload: Record<string, unknown>  // Effect-specific data
  order?: number         // Execution order (lower = earlier)
}

/**
 * Result of validating effects
 */
export interface EffectsValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Result of executing effects
 */
export interface EffectsExecutionResult {
  success: boolean
  effectsExecuted: ProposalEffect[]
  error?: string
}

/**
 * Effect handler interface - implement this for each effect type
 */
export interface EffectHandler {
  type: string
  validate: (payload: Record<string, unknown>, context: EffectContext) => Promise<string[]>
  execute: (payload: Record<string, unknown>, context: EffectContext) => Promise<void>
}

/**
 * Context passed to effect handlers
 */
export interface EffectContext {
  bandId: string
  proposalId: string
  executedById: string
}

// ============================================
// EFFECT HANDLERS REGISTRY
// ============================================

// Map of effect type -> handler
// This will be populated as we add specific effect types in future steps
const effectHandlers = new Map<string, EffectHandler>()

/**
 * Register an effect handler
 */
export function registerEffectHandler(handler: EffectHandler): void {
  effectHandlers.set(handler.type, handler)
}

/**
 * Get a registered effect handler
 */
export function getEffectHandler(type: string): EffectHandler | undefined {
  return effectHandlers.get(type)
}

// ============================================
// SUBTYPE VALIDATORS REGISTRY
// ============================================

// Map of subtype -> allowed effect types
// This defines what effects are valid for each proposal subtype
const subtypeAllowedEffects = new Map<string, string[]>()

/**
 * Register allowed effects for a subtype
 */
export function registerSubtypeEffects(subtype: string, allowedEffectTypes: string[]): void {
  subtypeAllowedEffects.set(subtype, allowedEffectTypes)
}

/**
 * Get allowed effect types for a subtype
 */
export function getAllowedEffectsForSubtype(subtype: string): string[] | undefined {
  return subtypeAllowedEffects.get(subtype)
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate that effects array has valid structure
 */
function validateEffectsStructure(effects: unknown): effects is ProposalEffect[] {
  if (!Array.isArray(effects)) {
    return false
  }

  for (const effect of effects) {
    if (typeof effect !== 'object' || effect === null) {
      return false
    }
    if (typeof (effect as Record<string, unknown>).type !== 'string') {
      return false
    }
    if (typeof (effect as Record<string, unknown>).payload !== 'object') {
      return false
    }
  }

  return true
}

/**
 * Validate effects for a proposal
 *
 * @param effects - The effects array to validate
 * @param executionType - The proposal execution type
 * @param executionSubtype - The proposal execution subtype (optional)
 * @param context - Context for validation (bandId, etc.)
 */
export async function validateEffects(
  effects: unknown,
  executionType: ProposalExecutionType,
  executionSubtype: string | null,
  context: { bandId: string }
): Promise<EffectsValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // Effects are only valid for GOVERNANCE and ACTION types
  if (executionType !== 'GOVERNANCE' && executionType !== 'ACTION') {
    if (effects !== null && effects !== undefined) {
      errors.push(`Effects are only allowed for GOVERNANCE and ACTION proposal types, not ${executionType}`)
    }
    return { valid: errors.length === 0, errors, warnings }
  }

  // For GOVERNANCE, effects are required
  // For ACTION, effects are optional (can be just a decision record until ACTION effects are defined)
  if (executionType === 'GOVERNANCE' && (effects === null || effects === undefined)) {
    errors.push('Effects are required for GOVERNANCE proposals')
    return { valid: false, errors, warnings }
  }

  // If no effects provided for ACTION, that's OK - skip further validation
  if (effects === null || effects === undefined) {
    return { valid: true, errors, warnings }
  }

  // Validate structure
  if (!validateEffectsStructure(effects)) {
    errors.push('Effects must be an array of objects with "type" (string) and "payload" (object) properties')
    return { valid: false, errors, warnings }
  }

  // Must have at least one effect
  if (effects.length === 0) {
    errors.push('At least one effect is required')
    return { valid: false, errors, warnings }
  }

  // If subtype is specified, validate effects against allowed types
  if (executionSubtype) {
    const allowedTypes = getAllowedEffectsForSubtype(executionSubtype)
    if (allowedTypes) {
      for (const effect of effects) {
        if (!allowedTypes.includes(effect.type)) {
          errors.push(`Effect type "${effect.type}" is not allowed for subtype "${executionSubtype}". Allowed types: ${allowedTypes.join(', ')}`)
        }
      }
    } else {
      // Unknown subtype - warn but don't fail
      warnings.push(`Unknown execution subtype "${executionSubtype}". Effects will be validated at execution time.`)
    }
  }

  // Validate each effect with its handler
  for (const effect of effects) {
    const handler = getEffectHandler(effect.type)
    if (!handler) {
      // Unknown effect type - this is an error
      errors.push(`Unknown effect type "${effect.type}". No handler registered.`)
      continue
    }

    // Run handler-specific validation
    const handlerErrors = await handler.validate(effect.payload, {
      bandId: context.bandId,
      proposalId: '', // Not available at creation time
      executedById: '', // Not available at validation time
    })
    errors.push(...handlerErrors)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================
// EXECUTION
// ============================================

/**
 * Execute effects for an approved proposal
 *
 * This runs all effects atomically - if any effect fails, all changes are rolled back.
 *
 * @param proposalId - The proposal ID
 * @param effects - The effects to execute
 * @param context - Execution context
 */
export async function executeEffects(
  proposalId: string,
  effects: ProposalEffect[],
  context: EffectContext
): Promise<EffectsExecutionResult> {
  const executedEffects: ProposalEffect[] = []

  try {
    // Sort effects by order (if specified)
    const sortedEffects = [...effects].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    // Execute all effects in a transaction for atomicity
    await prisma.$transaction(async (tx) => {
      for (const effect of sortedEffects) {
        const handler = getEffectHandler(effect.type)
        if (!handler) {
          throw new Error(`No handler registered for effect type "${effect.type}"`)
        }

        // Execute the effect
        await handler.execute(effect.payload, context)
        executedEffects.push(effect)
      }
    })

    return {
      success: true,
      effectsExecuted: executedEffects,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during effect execution'
    return {
      success: false,
      effectsExecuted: executedEffects,
      error: errorMessage,
    }
  }
}

/**
 * Execute effects for an approved proposal and log the result
 */
export async function executeAndLogEffects(
  proposal: {
    id: string
    bandId: string
    executionSubtype: string | null
    effects: unknown
  },
  executedById: string
): Promise<EffectsExecutionResult> {
  // Validate effects structure
  if (!validateEffectsStructure(proposal.effects)) {
    const error = 'Invalid effects structure'

    // Log the failure
    await prisma.proposalExecutionLog.create({
      data: {
        proposalId: proposal.id,
        bandId: proposal.bandId,
        executionSubtype: proposal.executionSubtype || 'UNKNOWN',
        effectsSubmitted: proposal.effects as object,
        effectsExecuted: [],
        status: 'FAILED',
        errorMessage: error,
      },
    })

    // Update proposal with error
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { executionError: error },
    })

    return { success: false, effectsExecuted: [], error }
  }

  const context: EffectContext = {
    bandId: proposal.bandId,
    proposalId: proposal.id,
    executedById,
  }

  const result = await executeEffects(proposal.id, proposal.effects, context)

  // Log the execution
  await prisma.proposalExecutionLog.create({
    data: {
      proposalId: proposal.id,
      bandId: proposal.bandId,
      executionSubtype: proposal.executionSubtype || 'UNKNOWN',
      effectsSubmitted: proposal.effects as object,
      effectsExecuted: result.effectsExecuted as unknown as object,
      status: result.success ? 'SUCCESS' : 'FAILED',
      errorMessage: result.error,
    },
  })

  // Update proposal with execution result
  await prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      effectsExecutedAt: result.success ? new Date() : undefined,
      executionError: result.error || null,
    },
  })

  return result
}

// ============================================
// SERVICE EXPORT
// ============================================

export const proposalEffectsService = {
  // Validation
  validateEffects,

  // Execution
  executeEffects,
  executeAndLogEffects,

  // Registry management
  registerEffectHandler,
  getEffectHandler,
  registerSubtypeEffects,
  getAllowedEffectsForSubtype,
}
