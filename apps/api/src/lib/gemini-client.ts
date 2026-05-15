import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from './prisma'

const ENVIRONMENTAL_FACTORS = {
  co2GramsPerKTokens: 0.3,
  waterMlPerKTokens: 0.5,
  electricityWhPerKTokens: 1,
  ledMinutesPerKTokens: 0.1,
}

export type GeminiOperationType =
  | 'talk_it_out_gate'
  | 'talk_it_out_opening'
  | 'talk_it_out_intervention'
  | 'talk_it_out_closing'

export interface GeminiCallContext {
  operation: GeminiOperationType
  sessionId: string
  userId?: string
  bandId?: string | null
}

export interface GeminiCallOptions {
  model?: string
  maxOutputTokens?: number
  temperature?: number
  system?: string
}

export interface GeminiCallResponse {
  content: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
  durationMs: number
}

function calculateEnvironmental(totalTokens: number) {
  const kTokens = totalTokens / 1000
  return {
    co2Grams: kTokens * ENVIRONMENTAL_FACTORS.co2GramsPerKTokens,
    waterMl: kTokens * ENVIRONMENTAL_FACTORS.waterMlPerKTokens,
    electricityWh: kTokens * ENVIRONMENTAL_FACTORS.electricityWhPerKTokens,
    ledMinutes: kTokens * ENVIRONMENTAL_FACTORS.ledMinutesPerKTokens,
  }
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  return new GoogleGenerativeAI(apiKey)
}

const DEFAULT_GATE_MODEL = process.env.GEMINI_MODEL_GATE || 'gemini-2.0-flash'
const DEFAULT_FACILITATOR_MODEL = process.env.GEMINI_MODEL_FACILITATOR || 'gemini-2.0-flash'

export function getGeminiGateModel() {
  return DEFAULT_GATE_MODEL
}

export function getGeminiFacilitatorModel() {
  return DEFAULT_FACILITATOR_MODEL
}

async function saveUsageRecord(data: {
  context: GeminiCallContext
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  durationMs: number
  success: boolean
  error?: string
}) {
  const environmental = calculateEnvironmental(data.totalTokens)
  await prisma.aIUsage.create({
    data: {
      bandId: data.context.bandId || null,
      userId: data.context.userId || null,
      entityType: 'talk_it_out',
      entityId: data.context.sessionId,
      operation: data.context.operation,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.totalTokens,
      co2Grams: environmental.co2Grams,
      waterMl: environmental.waterMl,
      electricityWh: environmental.electricityWh,
      ledMinutes: environmental.ledMinutes,
      model: data.model,
      durationMs: data.durationMs,
      success: data.success,
      error: data.error || null,
    },
  })
}

export async function callGemini(
  prompt: string,
  context: GeminiCallContext,
  options: GeminiCallOptions = {}
): Promise<GeminiCallResponse> {
  const modelName =
    options.model ||
    (context.operation === 'talk_it_out_gate' ? DEFAULT_GATE_MODEL : DEFAULT_FACILITATOR_MODEL)
  const maxOutputTokens = options.maxOutputTokens ?? (context.operation === 'talk_it_out_gate' ? 64 : 1200)
  const temperature = options.temperature ?? (context.operation === 'talk_it_out_gate' ? 0.2 : 0.7)

  const startTime = Date.now()
  try {
    const genAI = getClient()
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: options.system,
      generationConfig: {
        maxOutputTokens,
        temperature,
      },
    })

    const result = await model.generateContent(prompt)
    const durationMs = Date.now() - startTime
    const response = result.response
    const content = response.text() || ''

    const usageMeta = response.usageMetadata
    const inputTokens = usageMeta?.promptTokenCount ?? Math.ceil(prompt.length / 4)
    const outputTokens = usageMeta?.candidatesTokenCount ?? Math.ceil(content.length / 4)
    const totalTokens = usageMeta?.totalTokenCount ?? inputTokens + outputTokens

    saveUsageRecord({
      context,
      model: modelName,
      inputTokens,
      outputTokens,
      totalTokens,
      durationMs,
      success: true,
    }).catch((err) => console.error('Failed to save Gemini usage:', err))

    return {
      content,
      usage: { inputTokens, outputTokens, totalTokens },
      durationMs,
    }
  } catch (err) {
    const durationMs = Date.now() - startTime
    const error = err instanceof Error ? err.message : 'Unknown error'
    saveUsageRecord({
      context,
      model: modelName,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      durationMs,
      success: false,
      error,
    }).catch(() => {})
    throw err
  }
}
