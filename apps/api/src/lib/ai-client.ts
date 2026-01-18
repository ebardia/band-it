import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

// Environmental conversion factors per 1000 tokens
const ENVIRONMENTAL_FACTORS = {
  co2GramsPerKTokens: 0.3,      // grams CO2
  waterMlPerKTokens: 0.5,       // milliliters water
  electricityWhPerKTokens: 1,   // watt-hours (0.001 kWh)
  ledMinutesPerKTokens: 0.1,    // minutes of 10W LED bulb equivalent
}

// Cost factors per 1M tokens (Anthropic Sonnet pricing)
const COST_FACTORS = {
  inputCostPerMTokens: 3.00,    // $3 per 1M input tokens
  outputCostPerMTokens: 15.00,  // $15 per 1M output tokens
}

// Operation types for tracking
export type AIOperationType =
  | 'proposal_draft'
  | 'proposal_validation'
  | 'project_validation'
  | 'task_validation'
  | 'content_legality_check'
  | 'content_values_check'
  | 'content_scope_check'
  | 'project_suggestions'
  | 'task_suggestions'
  | 'checklist_suggestions'

// Entity types for context
export type AIEntityType = 'proposal' | 'project' | 'task' | 'checklist' | 'band'

// Context for AI calls
export interface AICallContext {
  operation: AIOperationType
  entityType: AIEntityType
  entityId?: string
  bandId?: string
  userId?: string
}

// Options for AI calls
export interface AICallOptions {
  model?: string
  maxTokens?: number
  system?: string
  temperature?: number
}

// Response from AI calls
export interface AICallResponse<T = string> {
  content: T
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  environmental: {
    co2Grams: number
    waterMl: number
    electricityWh: number
    ledMinutes: number
  }
  durationMs: number
}

// Calculate environmental impact from token count
function calculateEnvironmentalImpact(totalTokens: number) {
  const kTokens = totalTokens / 1000
  return {
    co2Grams: kTokens * ENVIRONMENTAL_FACTORS.co2GramsPerKTokens,
    waterMl: kTokens * ENVIRONMENTAL_FACTORS.waterMlPerKTokens,
    electricityWh: kTokens * ENVIRONMENTAL_FACTORS.electricityWhPerKTokens,
    ledMinutes: kTokens * ENVIRONMENTAL_FACTORS.ledMinutesPerKTokens,
  }
}

// Create Anthropic client singleton
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Default model to use
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

/**
 * Centralized AI client wrapper that tracks all API calls
 *
 * @param prompt - The user prompt to send
 * @param context - Context for tracking (operation, entity, band, user)
 * @param options - Optional model settings
 * @returns Response with content, usage stats, and environmental impact
 */
export async function callAI(
  prompt: string,
  context: AICallContext,
  options: AICallOptions = {}
): Promise<AICallResponse> {
  const {
    model = DEFAULT_MODEL,
    maxTokens = 1500,
    system,
    temperature,
  } = options

  const startTime = Date.now()
  let success = true
  let error: string | undefined

  try {
    // Build message options
    const messageOptions: Anthropic.MessageCreateParams = {
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }

    if (system) {
      messageOptions.system = system
    }

    if (temperature !== undefined) {
      messageOptions.temperature = temperature
    }

    // Make the API call
    const response = await anthropic.messages.create(messageOptions)

    const durationMs = Date.now() - startTime

    // Extract usage
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const totalTokens = inputTokens + outputTokens

    // Calculate environmental impact
    const environmental = calculateEnvironmentalImpact(totalTokens)

    // Extract text content
    const textBlock = response.content.find(block => block.type === 'text')
    const content = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    // Save to database (fire and forget - don't block on this)
    saveUsageRecord({
      context,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      environmental,
      durationMs,
      success: true,
    }).catch(err => {
      console.error('Failed to save AI usage record:', err)
    })

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
      },
      environmental,
      durationMs,
    }
  } catch (err) {
    const durationMs = Date.now() - startTime
    success = false
    error = err instanceof Error ? err.message : 'Unknown error'

    // Save error record (fire and forget)
    saveUsageRecord({
      context,
      model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      environmental: calculateEnvironmentalImpact(0),
      durationMs,
      success: false,
      error,
    }).catch(saveErr => {
      console.error('Failed to save AI usage error record:', saveErr)
    })

    throw err
  }
}

// Internal function to save usage record
async function saveUsageRecord(data: {
  context: AICallContext
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  environmental: {
    co2Grams: number
    waterMl: number
    electricityWh: number
    ledMinutes: number
  }
  durationMs: number
  success: boolean
  error?: string
}) {
  await prisma.aIUsage.create({
    data: {
      bandId: data.context.bandId || null,
      userId: data.context.userId || null,
      entityType: data.context.entityType,
      entityId: data.context.entityId || null,
      operation: data.context.operation,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.totalTokens,
      co2Grams: data.environmental.co2Grams,
      waterMl: data.environmental.waterMl,
      electricityWh: data.environmental.electricityWh,
      ledMinutes: data.environmental.ledMinutes,
      model: data.model,
      durationMs: data.durationMs,
      success: data.success,
      error: data.error || null,
    },
  })
}

/**
 * Helper to parse JSON from AI response safely
 */
export function parseAIJson<T>(content: string): T | null {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim()
    return JSON.parse(jsonStr) as T
  } catch {
    return null
  }
}

// Export the factors for use in frontend display
export { ENVIRONMENTAL_FACTORS, COST_FACTORS }
