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

  // Get all matching FAQ entries
  const matches = await prisma.faqEntry.findMany({
    where: {
      isPublished: true,
      keywords: { hasSome: keywords },
    },
  })

  if (matches.length === 0) return null

  // Score each match by number of overlapping keywords
  const scored = matches.map(entry => {
    const entryKeywords = new Set(entry.keywords.map(k => k.toLowerCase()))
    const overlapCount = keywords.filter(k => entryKeywords.has(k)).length
    const matchRatio = overlapCount / keywords.length

    // Require at least 2 keyword matches AND 70% of query keywords
    // This prevents partial matches from overriding AI (e.g., "channel locked" matching "create channel")
    const minCount = Math.max(2, Math.ceil(keywords.length * 0.7))
    const meetsThreshold = overlapCount >= minCount && matchRatio >= 0.7

    return {
      entry,
      score: overlapCount,
      matchRatio,
      meetsThreshold,
    }
  })

  // Filter to entries meeting threshold, then sort by match ratio (desc), score (desc), viewCount (desc)
  const qualified = scored
    .filter(s => s.meetsThreshold)
    .sort((a, b) => b.matchRatio - a.matchRatio || b.score - a.score || (b.entry.viewCount - a.entry.viewCount))

  if (qualified.length === 0) return null

  const best = qualified[0].entry

  // Increment view count (fire and forget)
  prisma.faqEntry.update({
    where: { id: best.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {})

  return best
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

CRITICAL RULE - ONLY USE THE KNOWLEDGE ABOVE:
- You must ONLY answer questions using the information provided above
- If the answer is NOT explicitly covered in the knowledge above, respond with: "I don't have information about that. Please send us a note using the feedback button and we will add your question/answer to the Help function."
- Do NOT extrapolate, guess, or use general knowledge to fill in gaps
- Do NOT make up features, workflows, or capabilities that aren't documented above

GUIDELINES:
- Be concise (3-5 sentences max unless step-by-step instructions needed)
- Give step-by-step instructions when appropriate
- If unsure about their specific account, tell them where to look
- For billing issues, suggest contacting band leadership`

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
      model: process.env.ANTHROPIC_HELP_MODEL || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
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

      try {
        // 1. Try FAQ first
        console.log('[Help] Step 1: Searching FAQ...')
        let faqMatch = null
        try {
          faqMatch = await searchFaq(question)
        } catch (faqErr) {
          console.error('[Help] FAQ search error:', faqErr)
          // Continue without FAQ
        }

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

        // 2. Try AI cache (SKIP for now - cache may have bad entries)
        console.log('[Help] Step 2: Skipping cache check...')
        // Cache disabled temporarily to clear bad cached error responses
        // let cacheMatch = null
        // try {
        //   cacheMatch = await checkAiCache(question)
        // } catch (cacheErr) {
        //   console.error('[Help] Cache check error:', cacheErr)
        // }
        // if (cacheMatch) {
        //   ...
        // }

        // 3. Check rate limit
        console.log('[Help] Step 3: Checking rate limit...')
        let rateLimit = { allowed: true, remaining: 20 }
        try {
          rateLimit = await checkRateLimit(userId)
        } catch (rateLimitErr) {
          console.error('[Help] Rate limit check error:', rateLimitErr)
          // Continue with default (allow)
        }

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
        console.log('[Help] Step 4: Calling AI...')
        const aiAnswer = await getAiHelpResponse(question, currentPage, userId)
        console.log('[Help] Step 4 complete: Got AI response')

        // 5. Cache the response (non-blocking)
        cacheAiResponse(question, aiAnswer).catch(err =>
          console.error('[Help] Error caching AI response:', err)
        )

        // 6. Increment rate limit (non-blocking)
        incrementRateLimit(userId).catch(err =>
          console.error('[Help] Error incrementing rate limit:', err)
        )

        // 7. Log interaction
        console.log('[Help] Step 7: Logging interaction...')
        let interactionId = 'unknown'
        try {
          interactionId = await logInteraction(userId, question, 'AI', aiAnswer, currentPage)
        } catch (logErr) {
          console.error('[Help] Error logging help interaction:', logErr)
        }

        return {
          source: 'AI' as const,
          answer: aiAnswer,
          interactionId,
          category: null,
          remaining: rateLimit.remaining - 1,
        }
      } catch (error) {
        console.error('[Help] Unhandled error in help.ask:', error)
        // Return a graceful error instead of 500
        return {
          source: 'ERROR' as const,
          answer: 'Sorry, I encountered an error processing your question. Please try again or browse the FAQ below.',
          interactionId: 'error',
          category: null,
          remaining: null,
        }
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
