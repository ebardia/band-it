import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { callAI } from '../../lib/ai-client'
import crypto from 'crypto'
import { PLATFORM_CONTEXT } from '../../lib/help/generated-context'

// ==========================================
// HELPERS
// ==========================================

const STOP_WORDS = new Set([
  'how', 'do', 'i', 'the', 'a', 'an', 'to', 'what', 'is', 'can', 'my',
  'where', 'when', 'why', 'does', 'are', 'in', 'on', 'for', 'it', 'of',
  'and', 'or', 'this', 'that', 'with', 'from', 'be', 'have', 'has',
])

const DAILY_AI_LIMIT = 20
const CACHE_TTL_DAYS = 30

function normalizeQuestion(q: string): string {
  return q.toLowerCase().trim().replace(/[?!.,;:'"]/g, '')
}

function extractKeywords(q: string): string[] {
  return normalizeQuestion(q)
    .split(/\s+/)
    .filter(word => !STOP_WORDS.has(word) && word.length > 2)
}

function hashQuestion(question: string): string {
  // Sort keywords alphabetically for better cache hits
  const keywords = extractKeywords(question).sort()
  return crypto.createHash('md5').update(keywords.join(' ')).digest('hex')
}

// ==========================================
// FAQ SEARCH
// ==========================================

async function searchFaq(question: string) {
  const keywords = extractKeywords(question)

  if (keywords.length === 0) return null

  // Try keyword match
  const match = await prisma.faqEntry.findFirst({
    where: {
      isPublished: true,
      keywords: { hasSome: keywords },
    },
    orderBy: [
      { sortOrder: 'asc' },
      { viewCount: 'desc' },
    ],
  })

  if (match) {
    // Increment view count (fire and forget)
    prisma.faqEntry.update({
      where: { id: match.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {})

    return match
  }

  return null
}

// ==========================================
// AI CACHE
// ==========================================

async function checkAiCache(question: string) {
  const hash = hashQuestion(question)

  const cached = await prisma.aiHelpCache.findFirst({
    where: {
      questionHash: hash,
      expiresAt: { gt: new Date() },
    },
  })

  if (cached) {
    // Update hit count (fire and forget)
    prisma.aiHelpCache.update({
      where: { id: cached.id },
      data: {
        hitCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    }).catch(() => {})

    return cached
  }

  return null
}

async function cacheAiResponse(question: string, answer: string) {
  const hash = hashQuestion(question)
  const normalized = normalizeQuestion(question)
  const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000)

  await prisma.aiHelpCache.upsert({
    where: { questionHash: hash },
    create: {
      questionHash: hash,
      questionNormalized: normalized,
      questionOriginal: question,
      answer,
      expiresAt,
    },
    update: {
      answer,
      hitCount: { increment: 1 },
      lastUsedAt: new Date(),
      expiresAt,
    },
  })
}

// ==========================================
// RATE LIMITING
// ==========================================

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split('T')[0]!

  const record = await prisma.helpRateLimit.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, aiRequestCount: 0 },
    update: {},
  })

  const remaining = DAILY_AI_LIMIT - record.aiRequestCount

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
  }
}

async function incrementRateLimit(userId: string) {
  const today = new Date().toISOString().split('T')[0]!

  await prisma.helpRateLimit.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, aiRequestCount: 1 },
    update: { aiRequestCount: { increment: 1 } },
  })
}

// ==========================================
// AI CALL
// ==========================================

const HELP_SYSTEM_PROMPT = `You are a helpful assistant for Band It.

${PLATFORM_CONTEXT}

CURRENT PAGE CONTEXT: The user is on: {currentPage}

GUIDELINES:
- Be concise (3-5 sentences max unless step-by-step instructions needed)
- Give step-by-step instructions when appropriate
- If unsure about their specific account, tell them where to look
- Never make up features that don't exist
- For billing issues, suggest contacting band leadership
- Use the knowledge above to answer accurately - don't guess or make things up`

async function getAiHelpResponse(question: string, currentPage?: string, userId?: string): Promise<string> {
  const systemPrompt = HELP_SYSTEM_PROMPT.replace(
    '{currentPage}',
    currentPage || 'Unknown'
  )

  try {
    const response = await callAI(question, {
      operation: 'help_question',
      entityType: 'help',
      userId,
    }, {
      model: 'claude-3-5-haiku-20241022',
      maxTokens: 500,
      system: systemPrompt,
    })

    return response.content || 'Sorry, I could not generate a response.'
  } catch (error) {
    console.error('AI help error:', error)
    return 'Sorry, I encountered an error. Please try again or browse the FAQ below.'
  }
}

// ==========================================
// LOGGING
// ==========================================

async function logInteraction(
  userId: string,
  question: string,
  source: string,
  answer: string,
  currentPage?: string,
  faqEntryId?: string | null,
  cacheEntryId?: string | null,
): Promise<string> {
  const interaction = await prisma.helpInteraction.create({
    data: {
      userId,
      question,
      source,
      answer,
      currentPage: currentPage || null,
      faqEntryId: faqEntryId || null,
      cacheEntryId: cacheEntryId || null,
    },
  })
  return interaction.id
}

// ==========================================
// ROUTER
// ==========================================

export const helpRouter = router({
  /**
   * Main help endpoint - FAQ first, cache second, AI third
   */
  ask: publicProcedure
    .input(z.object({
      userId: z.string(),
      question: z.string().min(3).max(500),
      currentPage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { userId, question, currentPage } = input

      // 1. Try FAQ first
      const faqMatch = await searchFaq(question)
      if (faqMatch) {
        const interactionId = await logInteraction(userId, question, 'FAQ', faqMatch.answer, currentPage, faqMatch.id)
        return {
          source: 'FAQ' as const,
          answer: faqMatch.answer,
          interactionId,
          category: faqMatch.category,
          remaining: null,
        }
      }

      // 2. Try AI cache
      const cacheMatch = await checkAiCache(question)
      if (cacheMatch) {
        const interactionId = await logInteraction(userId, question, 'CACHE', cacheMatch.answer, currentPage, null, cacheMatch.id)
        return {
          source: 'CACHE' as const,
          answer: cacheMatch.answer,
          interactionId,
          category: null,
          remaining: null,
        }
      }

      // 3. Check rate limit
      const rateLimit = await checkRateLimit(userId)
      if (!rateLimit.allowed) {
        const limitAnswer = 'You have reached your daily help limit (20 questions). Browse the FAQ below or try again tomorrow. Your limit resets at midnight.'
        const interactionId = await logInteraction(userId, question, 'RATE_LIMITED', limitAnswer, currentPage)
        return {
          source: 'RATE_LIMITED' as const,
          answer: limitAnswer,
          interactionId,
          category: null,
          remaining: 0,
        }
      }

      // 4. Call AI
      const aiAnswer = await getAiHelpResponse(question, currentPage, userId)

      // 5. Cache the response
      await cacheAiResponse(question, aiAnswer)

      // 6. Increment rate limit
      await incrementRateLimit(userId)

      // 7. Log interaction
      const interactionId = await logInteraction(userId, question, 'AI', aiAnswer, currentPage)

      return {
        source: 'AI' as const,
        answer: aiAnswer,
        interactionId,
        category: null,
        remaining: rateLimit.remaining - 1,
      }
    }),

  /**
   * Get FAQ list by category
   */
  getFaq: publicProcedure
    .input(z.object({
      category: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const where: any = { isPublished: true }
      if (input?.category) {
        where.category = input.category
      }

      return prisma.faqEntry.findMany({
        where,
        orderBy: [
          { category: 'asc' },
          { sortOrder: 'asc' },
        ],
      })
    }),

  /**
   * Submit feedback on an answer
   */
  feedback: publicProcedure
    .input(z.object({
      interactionId: z.string(),
      wasHelpful: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const interaction = await prisma.helpInteraction.update({
        where: { id: input.interactionId },
        data: { wasHelpful: input.wasHelpful },
      })

      // Also update FAQ helpful counts if applicable
      if (interaction.faqEntryId) {
        await prisma.faqEntry.update({
          where: { id: interaction.faqEntryId },
          data: input.wasHelpful
            ? { helpfulCount: { increment: 1 } }
            : { notHelpfulCount: { increment: 1 } },
        })
      }

      return { success: true }
    }),

  /**
   * Get user's remaining AI questions for today
   */
  getRateLimit: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      return checkRateLimit(input.userId)
    }),
})
