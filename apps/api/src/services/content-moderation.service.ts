import { prisma } from '../lib/prisma'
import { TRPCError } from '@trpc/server'
import type { FlaggedContentType } from '@prisma/client'

export interface ModerationResult {
  allowed: boolean
  flagged: boolean
  matchedTerms: {
    term: string
    severity: 'WARN' | 'BLOCK'
    category: string | null
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
    userAppealAllowed: boolean
    reason: string | null
  }[]
}

export interface FlaggedContentContext {
  contentType: FlaggedContentType
  contentId: string
  authorId: string
  contentText: string
}

// Cache blocked terms for performance (refresh every 5 minutes)
let cachedTerms: {
  terms: Array<{
    id: string
    term: string
    isRegex: boolean
    severity: 'WARN' | 'BLOCK'
    category: string | null
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
    userAppealAllowed: boolean
    reason: string | null
  }>
  lastFetch: number
} | null = null

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getBlockedTerms() {
  const now = Date.now()

  if (cachedTerms && (now - cachedTerms.lastFetch) < CACHE_TTL) {
    return cachedTerms.terms
  }

  const terms = await prisma.blockedTerm.findMany({
    where: { isActive: true },
    select: {
      id: true,
      term: true,
      isRegex: true,
      severity: true,
      category: true,
      confidence: true,
      userAppealAllowed: true,
      reason: true,
    },
  })

  cachedTerms = {
    terms,
    lastFetch: now,
  }

  return terms
}

/**
 * Clear the cached terms (call after adding/updating/deleting terms)
 */
export function clearModerationCache() {
  cachedTerms = null
}

/**
 * Check text content against blocked terms
 */
export async function checkContent(text: string): Promise<ModerationResult> {
  if (!text || text.trim().length === 0) {
    return { allowed: true, flagged: false, matchedTerms: [] }
  }

  const terms = await getBlockedTerms()
  const lowerText = text.toLowerCase()
  const matchedTerms: ModerationResult['matchedTerms'] = []

  for (const blockedTerm of terms) {
    let matches = false

    if (blockedTerm.isRegex) {
      try {
        const regex = new RegExp(blockedTerm.term, 'gi')
        matches = regex.test(text)
      } catch (e) {
        // Invalid regex, skip
        console.error(`Invalid regex pattern: ${blockedTerm.term}`)
        continue
      }
    } else {
      // Simple word boundary match for non-regex terms
      // This ensures "spam" matches "spam" but not "antispam"
      const escapedTerm = blockedTerm.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const wordRegex = new RegExp(`\\b${escapedTerm}\\b`, 'gi')
      matches = wordRegex.test(text)
    }

    if (matches) {
      matchedTerms.push({
        term: blockedTerm.term,
        severity: blockedTerm.severity,
        category: blockedTerm.category,
        confidence: blockedTerm.confidence,
        userAppealAllowed: blockedTerm.userAppealAllowed,
        reason: blockedTerm.reason,
      })
    }
  }

  // Determine if content should be blocked
  const hasBlockTerm = matchedTerms.some(t => t.severity === 'BLOCK')
  const hasWarnTerm = matchedTerms.some(t => t.severity === 'WARN')

  return {
    allowed: !hasBlockTerm,
    flagged: hasWarnTerm || hasBlockTerm,
    matchedTerms,
  }
}

/**
 * Save flagged content for admin review
 */
export async function saveFlaggedContent(
  result: ModerationResult,
  context: FlaggedContentContext
): Promise<void> {
  // Only save if there are WARN matches (BLOCK content won't be posted anyway)
  const warnMatches = result.matchedTerms.filter(t => t.severity === 'WARN')
  if (warnMatches.length === 0) {
    return
  }

  const categories = [...new Set(warnMatches.map(t => t.category).filter(Boolean))] as string[]

  // Determine overall confidence (use lowest confidence of all matched terms)
  const confidencePriority = { LOW: 0, MEDIUM: 1, HIGH: 2 }
  const lowestConfidence = warnMatches.reduce((lowest, match) => {
    return confidencePriority[match.confidence] < confidencePriority[lowest]
      ? match.confidence
      : lowest
  }, 'HIGH' as 'HIGH' | 'MEDIUM' | 'LOW')

  // Can only appeal if ALL matched terms allow appeals
  const canAppeal = warnMatches.every(t => t.userAppealAllowed)

  await prisma.flaggedContent.create({
    data: {
      contentType: context.contentType,
      contentId: context.contentId,
      contentText: context.contentText,
      authorId: context.authorId,
      matchedTerms: warnMatches.map(t => t.term),
      categories,
      confidence: lowestConfidence,
      canAppeal,
    },
  })
}

/**
 * Check content, save if flagged (WARN), and throw error if blocked
 * Use this for content that has already been saved (has an ID)
 */
export async function checkAndFlagContent(
  text: string,
  context: FlaggedContentContext
): Promise<ModerationResult> {
  const result = await checkContent(text)

  if (result.flagged && result.allowed) {
    // Content is flagged but allowed (WARN terms) - save for review
    await saveFlaggedContent(result, context)
  }

  return result
}

/**
 * Check content and throw error if blocked
 * Use this in mutation handlers
 */
export async function enforceContentModeration(
  text: string,
  fieldName: string = 'content'
): Promise<ModerationResult> {
  const result = await checkContent(text)

  if (!result.allowed) {
    const blockedTerms = result.matchedTerms
      .filter(t => t.severity === 'BLOCK')
      .map(t => t.term)

    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Your ${fieldName} contains prohibited content and cannot be posted. Please review and revise.`,
    })
  }

  return result
}

/**
 * Check multiple text fields at once
 */
export async function checkMultipleFields(
  fields: Record<string, string | null | undefined>
): Promise<{
  allowed: boolean
  flagged: boolean
  fieldResults: Record<string, ModerationResult>
}> {
  const fieldResults: Record<string, ModerationResult> = {}
  let allowed = true
  let flagged = false

  for (const [fieldName, text] of Object.entries(fields)) {
    if (text) {
      const result = await checkContent(text)
      fieldResults[fieldName] = result

      if (!result.allowed) {
        allowed = false
      }
      if (result.flagged) {
        flagged = true
      }
    }
  }

  return { allowed, flagged, fieldResults }
}

/**
 * Enforce moderation on multiple fields
 */
export async function enforceMultipleFields(
  fields: Record<string, string | null | undefined>
): Promise<void> {
  const { allowed, fieldResults } = await checkMultipleFields(fields)

  if (!allowed) {
    // Find the first blocked field
    const blockedField = Object.entries(fieldResults).find(
      ([_, result]) => !result.allowed
    )

    if (blockedField) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Your ${blockedField[0]} contains prohibited content and cannot be posted. Please review and revise.`,
      })
    }
  }
}

export const contentModerationService = {
  checkContent,
  enforceContentModeration,
  checkMultipleFields,
  enforceMultipleFields,
  saveFlaggedContent,
  checkAndFlagContent,
  clearCache: clearModerationCache,
}
