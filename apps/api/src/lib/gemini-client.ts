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
  | 'talk_it_out_topic_brief_web'
  | 'talk_it_out_topic_brief_synthesis'

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
  model: string
}

/** Lighter / alternate models when the primary is overloaded or unavailable. */
const DEFAULT_FALLBACK_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
]

function parseFallbackModels(): string[] {
  const raw = process.env.GEMINI_MODEL_FALLBACKS
  if (!raw?.trim()) return DEFAULT_FALLBACK_MODELS
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function buildGeminiModelChain(preferredModel: string): string[] {
  const chain: string[] = []
  const seen = new Set<string>()
  for (const model of [preferredModel, ...parseFallbackModels()]) {
    if (!seen.has(model)) {
      seen.add(model)
      chain.push(model)
    }
  }
  return chain
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

/** True when trying another model in the chain may succeed. */
export function shouldTryNextGeminiModel(err: unknown): boolean {
  const message = getErrorMessage(err)
  const lower = message.toLowerCase()

  if (/\[404\b|not found|no longer available/i.test(message)) return true
  if (/\[503\b|service unavailable|high demand|overloaded|try again later/i.test(message)) {
    return true
  }
  if (/\[429\b|resource exhausted|rate limit|quota/i.test(message)) return true
  if (/\[502\b|\[504\b|\b502\b|\b504\b/.test(message)) return true
  if (lower.includes('unavailable') && !lower.includes('api key')) return true

  return false
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

const DEFAULT_GATE_MODEL = process.env.GEMINI_MODEL_GATE || 'gemini-2.5-flash'
const DEFAULT_FACILITATOR_MODEL = process.env.GEMINI_MODEL_FACILITATOR || 'gemini-2.5-flash'

export function getGeminiGateModel() {
  return DEFAULT_GATE_MODEL
}

export function getGeminiFacilitatorModel() {
  return DEFAULT_FACILITATOR_MODEL
}

const DEFAULT_BRIEF_MODEL = process.env.GEMINI_MODEL_BRIEF || 'gemini-2.5-flash'

export function getGeminiBriefModel() {
  return DEFAULT_BRIEF_MODEL
}

export interface GeminiWebSearchResult {
  content: string
  webSources: { title: string; uri: string }[]
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
  durationMs: number
  model: string
}

function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
  return apiKey
}

/** Gemini generateContent with Google Search grounding (general/public topics). */
export async function callGeminiWithGoogleSearch(
  prompt: string,
  context: GeminiCallContext,
  options: { model?: string; maxOutputTokens?: number; temperature?: number; system?: string } = {}
): Promise<GeminiWebSearchResult> {
  const preferredModel = options.model || getGeminiBriefModel()
  const modelChain = buildGeminiModelChain(preferredModel)
  const maxOutputTokens = options.maxOutputTokens ?? 2048
  const temperature = options.temperature ?? 0.4
  const apiKey = getApiKey()

  const overallStart = Date.now()
  let lastError: unknown

  for (let i = 0; i < modelChain.length; i++) {
    const modelName = modelChain[i]
    const hasNext = i < modelChain.length - 1
    const startTime = Date.now()

    try {
      const body: Record<string, unknown> = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens, temperature },
      }
      if (options.system) {
        body.systemInstruction = { parts: [{ text: options.system }] }
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(
          `[${res.status}] GoogleGenerativeAI Error: ${errText.slice(0, 500)}`
        )
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> }
          groundingMetadata?: {
            groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>
          }
        }>
        usageMetadata?: {
          promptTokenCount?: number
          candidatesTokenCount?: number
          totalTokenCount?: number
        }
      }

      const candidate = data.candidates?.[0]
      const content =
        candidate?.content?.parts?.map((p) => p.text || '').join('') || ''

      const webSources: { title: string; uri: string }[] = []
      const seen = new Set<string>()
      for (const chunk of candidate?.groundingMetadata?.groundingChunks || []) {
        const web = chunk.web
        if (!web?.uri || seen.has(web.uri)) continue
        seen.add(web.uri)
        webSources.push({
          title: web.title || web.uri,
          uri: web.uri,
        })
      }

      const usageMeta = data.usageMetadata
      const inputTokens = usageMeta?.promptTokenCount ?? Math.ceil(prompt.length / 4)
      const outputTokens = usageMeta?.candidatesTokenCount ?? Math.ceil(content.length / 4)
      const totalTokens = usageMeta?.totalTokenCount ?? inputTokens + outputTokens
      const durationMs = Date.now() - overallStart

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
        webSources,
        usage: { inputTokens, outputTokens, totalTokens },
        durationMs,
        model: modelName,
      }
    } catch (err) {
      lastError = err
      if (hasNext && shouldTryNextGeminiModel(err)) {
        console.warn(
          `[Gemini] ${modelName} web search failed (${getErrorMessage(err)}); trying ${modelChain[i + 1]}`
        )
        continue
      }
      break
    }
  }

  const durationMs = Date.now() - overallStart
  saveUsageRecord({
    context,
    model: modelChain[modelChain.length - 1],
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    durationMs,
    success: false,
    error: getErrorMessage(lastError),
  }).catch(() => {})

  throw lastError
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

async function callGeminiOnce(
  prompt: string,
  modelName: string,
  options: Pick<GeminiCallOptions, 'maxOutputTokens' | 'temperature' | 'system'>
): Promise<Omit<GeminiCallResponse, 'durationMs' | 'model'> & { durationMs: number }> {
  const startTime = Date.now()
  const genAI = getClient()
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: options.system,
    generationConfig: {
      maxOutputTokens: options.maxOutputTokens,
      temperature: options.temperature,
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

  return {
    content,
    usage: { inputTokens, outputTokens, totalTokens },
    durationMs,
  }
}

export async function callGemini(
  prompt: string,
  context: GeminiCallContext,
  options: GeminiCallOptions = {}
): Promise<GeminiCallResponse> {
  const preferredModel =
    options.model ||
    (context.operation === 'talk_it_out_gate' ? DEFAULT_GATE_MODEL : DEFAULT_FACILITATOR_MODEL)
  const modelChain = buildGeminiModelChain(preferredModel)
  const maxOutputTokens = options.maxOutputTokens ?? (context.operation === 'talk_it_out_gate' ? 64 : 1200)
  const temperature = options.temperature ?? (context.operation === 'talk_it_out_gate' ? 0.2 : 0.7)
  const callOptions = { maxOutputTokens, temperature, system: options.system }

  const overallStart = Date.now()
  let lastError: unknown

  for (let i = 0; i < modelChain.length; i++) {
    const modelName = modelChain[i]
    const hasNext = i < modelChain.length - 1

    try {
      const result = await callGeminiOnce(prompt, modelName, callOptions)
      const durationMs = Date.now() - overallStart

      if (modelName !== preferredModel) {
        console.warn(
          `[Gemini] ${context.operation} used fallback model ${modelName} (preferred: ${preferredModel})`
        )
      }

      saveUsageRecord({
        context,
        model: modelName,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        durationMs,
        success: true,
      }).catch((err) => console.error('Failed to save Gemini usage:', err))

      return {
        content: result.content,
        usage: result.usage,
        durationMs,
        model: modelName,
      }
    } catch (err) {
      lastError = err
      if (hasNext && shouldTryNextGeminiModel(err)) {
        console.warn(
          `[Gemini] ${modelName} failed (${getErrorMessage(err)}); trying ${modelChain[i + 1]}`
        )
        continue
      }
      break
    }
  }

  const durationMs = Date.now() - overallStart
  const error = getErrorMessage(lastError)
  const failedModel = modelChain[modelChain.length - 1]

  saveUsageRecord({
    context,
    model: failedModel,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    durationMs,
    success: false,
    error,
  }).catch(() => {})

  throw lastError
}
