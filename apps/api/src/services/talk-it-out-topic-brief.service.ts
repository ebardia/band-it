import { TalkItOutGoal } from '@prisma/client'
import { callGemini, callGeminiWithGoogleSearch, getGeminiBriefModel } from '../lib/gemini-client'
import { prisma } from '../lib/prisma'
import {
  TalkItOutTopicBrief,
  TopicBriefResearchMode,
  parseTopicBriefJson,
} from './talk-it-out-topic-brief.types'

const GOAL_DESCRIPTIONS: Record<TalkItOutGoal, string> = {
  DECISION: 'reach a clear decision the group can commit to',
  EXPLORE: 'explore options and tradeoffs without forcing an immediate decision',
  RESOLVE: 'resolve a conflict or tension between perspectives',
  IDEATE: 'generate ideas and creative possibilities',
  ALIGN: 'align on direction and shared priorities',
  UNDERSTAND: 'build shared understanding of the topic',
}

const BRIEF_SYSTEM = `You prepare background briefs for "Talk It Out" discussions on Band It (bands and creative groups).
Be factual, concise, and useful for a live conversation. Label uncertain claims as things to verify in the room.
Never invent private band facts not present in the provided context.`

const previewCache = new Map<string, { at: number; brief: TalkItOutTopicBrief }>()
const PREVIEW_CACHE_MS = 5 * 60 * 1000

function cacheKey(topic: string, goal: TalkItOutGoal, bandId: string | null) {
  return `${goal}::${bandId || ''}::${topic.trim().toLowerCase()}`
}

export function classifyTopicResearchMode(
  topic: string,
  bandName?: string | null
): TopicBriefResearchMode {
  const t = topic.toLowerCase()
  const bandLower = bandName?.toLowerCase()

  if (bandLower && t.includes(bandLower)) return 'internal'

  const generalPatterns = [
    /\b(how to|what is|what are|best practices|copyright|licensing|equipment|gear|microphone|PA system|venue|insurance|streaming royalties|music industry)\b/i,
    /\b(vs\.|versus|compare|comparison|guide to)\b/i,
  ]
  const internalPatterns = [
    /\b(our|we|us|my band|the band|bandmate|bandmates)\b/i,
    /\b(should we|do we|can we|are we)\b/i,
    /\b(tour|setlist|drummer|bassist|vocalist|rehearsal|split|royalt|lineup|member|creative control|leave the band|kick out|fired)\b/i,
    /\b(this project|our album|our show|our song|our ep|our release)\b/i,
  ]

  const looksGeneral = generalPatterns.some((p) => p.test(topic))
  const looksInternal = internalPatterns.some((p) => p.test(topic))

  if (looksInternal && !looksGeneral) return 'internal'
  if (looksGeneral && !looksInternal) return 'general'
  if (bandName) return looksGeneral ? 'mixed' : 'internal'
  return 'general'
}

async function buildBandContextPack(
  bandId: string,
  topic: string,
  depth: 'preview' | 'full'
) {
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: { name: true, mission: true, description: true },
  })
  if (!band) return null

  const words = topic
    .split(/\s+/)
    .map((w) => w.replace(/[^\w]/g, ''))
    .filter((w) => w.length > 3)
    .slice(0, 8)

  const projectWhere =
    words.length > 0
      ? {
          bandId,
          OR: words.flatMap((w) => [
            { name: { contains: w, mode: 'insensitive' as const } },
            { description: { contains: w, mode: 'insensitive' as const } },
          ]),
        }
      : { bandId }

  const projects = await prisma.project.findMany({
    where: projectWhere,
    take: depth === 'preview' ? 3 : 6,
    orderBy: { updatedAt: 'desc' },
    select: {
      name: true,
      description: true,
      status: true,
      successCriteria: true,
    },
  })

  let priorSessions: { topic: string; summary: string | null }[] = []
  if (depth === 'full') {
    priorSessions = await prisma.talkItOutSession.findMany({
      where: { bandId, status: 'CLOSED', summary: { not: null } },
      take: 3,
      orderBy: { closedAt: 'desc' },
      select: { topic: true, summary: true },
    })
  }

  const lines: string[] = [
    `Band: ${band.name}`,
    `Mission (excerpt): ${band.mission.slice(0, 400)}`,
  ]
  if (projects.length) {
    lines.push('Relevant projects:')
    for (const p of projects) {
      lines.push(
        `- ${p.name} (${p.status})${p.description ? `: ${p.description.slice(0, 200)}` : ''}`
      )
    }
  }
  if (priorSessions.length) {
    lines.push('Prior Talk It Out sessions on this band:')
    for (const s of priorSessions) {
      lines.push(`- "${s.topic}"${s.summary ? ` — ${s.summary.slice(0, 150)}…` : ''}`)
    }
  }

  return { bandName: band.name, text: lines.join('\n') }
}

function extractJsonObject(text: string): TalkItOutTopicBrief | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as TalkItOutTopicBrief
  } catch {
    return null
  }
}

async function runWebResearch(
  topic: string,
  goal: TalkItOutGoal,
  context: { sessionId: string; userId?: string; bandId?: string | null }
) {
  const goalDesc = GOAL_DESCRIPTIONS[goal]
  const prompt = `Use web search to gather public background for a group discussion.

Topic: ${topic}
Session goal: ${goalDesc}

Summarize:
- Key concepts and definitions
- Common options or approaches people consider
- Typical tradeoffs, constraints, and stakeholder concerns
- Practical factors worth discussing (cost, time, legal, safety, audience, etc.)

Do NOT invent facts about any specific band. Write for a facilitator preparing a neutral brief.
Length: about 400–700 words.`

  const res = await callGeminiWithGoogleSearch(prompt, {
    operation: 'talk_it_out_topic_brief_web',
    sessionId: context.sessionId,
    userId: context.userId,
    bandId: context.bandId,
  }, {
    model: getGeminiBriefModel(),
    maxOutputTokens: 1800,
    system: BRIEF_SYSTEM,
  })

  return { publicContext: res.content.trim(), webSources: res.webSources }
}

async function synthesizeBrief(input: {
  topic: string
  goal: TalkItOutGoal
  researchMode: TopicBriefResearchMode
  publicContext?: string
  internalContext?: string
  webSources?: { title: string; uri: string }[]
  context: { sessionId: string; userId?: string; bandId?: string | null }
  depth: 'preview' | 'full'
}): Promise<TalkItOutTopicBrief> {
  const goalDesc = GOAL_DESCRIPTIONS[input.goal]

  const prompt = `Create a structured JSON brief for a Talk It Out session.

Topic: ${input.topic}
Goal: ${goalDesc}
Research mode: ${input.researchMode}
Depth: ${input.depth}

${input.internalContext ? `Band It internal context (trusted — only use these facts):\n${input.internalContext}\n` : ''}
${input.publicContext ? `Public/web research notes:\n${input.publicContext}\n` : ''}

Return ONLY valid JSON with this shape (no markdown fences):
{
  "summary": "2-4 sentences everyone reads before the discussion",
  "researchMode": "${input.researchMode}",
  "keyTerms": ["..."],
  "whatSuccessLooksLike": "tied to the goal",
  "likelyPerspectives": ["..."],
  "commonTensions": ["..."],
  "questionsToSurface": ["at least 3 concrete questions"],
  "factsToVerifyInRoom": ["things not to assume"],
  "publicContext": "optional paragraph or empty string",
  "internalContext": "optional paragraph or empty string"
}

Rules:
- summary must help all participants understand what they are here to work through
- questionsToSurface should move toward the goal, not generic icebreakers
- If web notes conflict with band context, prefer band context for internal matters
- factsToVerifyInRoom must include anything from web research the group should confirm`

  const res = await callGemini(prompt, {
    operation: 'talk_it_out_topic_brief_synthesis',
    sessionId: input.context.sessionId,
    userId: input.context.userId,
    bandId: input.context.bandId,
  }, {
    model: getGeminiBriefModel(),
    maxOutputTokens: input.depth === 'preview' ? 1200 : 2000,
    temperature: 0.35,
    system: BRIEF_SYSTEM,
  })

  const parsed = extractJsonObject(res.content)
  if (!parsed?.summary) {
    throw new Error('Failed to parse topic brief JSON')
  }

  parsed.researchMode = input.researchMode
  if (input.webSources?.length) {
    parsed.webSources = input.webSources
  }
  if (input.publicContext && !parsed.publicContext) {
    parsed.publicContext = input.publicContext.slice(0, 1500)
  }
  if (input.internalContext && !parsed.internalContext) {
    parsed.internalContext = input.internalContext.slice(0, 1500)
  }

  return parsed
}

export async function generateTopicBrief(input: {
  topic: string
  goal: TalkItOutGoal
  bandId?: string | null
  userId?: string
  sessionId: string
  depth: 'preview' | 'full'
}): Promise<TalkItOutTopicBrief> {
  const topic = input.topic.trim()
  if (topic.length < 8) {
    throw new Error('Topic must be at least 8 characters for background research')
  }

  let bandName: string | null = null
  let internalContext: string | undefined

  if (input.bandId) {
    const pack = await buildBandContextPack(input.bandId, topic, input.depth)
    if (pack) {
      bandName = pack.bandName
      internalContext = pack.text
    }
  }

  const researchMode = classifyTopicResearchMode(topic, bandName)
  const useWeb = researchMode === 'general' || researchMode === 'mixed'

  let publicContext: string | undefined
  let webSources: { title: string; uri: string }[] | undefined

  if (useWeb) {
    try {
      const web = await runWebResearch(topic, input.goal, {
        sessionId: input.sessionId,
        userId: input.userId,
        bandId: input.bandId,
      })
      publicContext = web.publicContext
      webSources = web.webSources
    } catch (err) {
      console.error('[TalkItOut] Web research failed:', err)
      if (researchMode === 'general') throw err
    }
  }

  if (researchMode === 'internal') {
    publicContext = undefined
    webSources = undefined
  }
  if (researchMode === 'general') {
    internalContext = undefined
  }

  return synthesizeBrief({
    topic,
    goal: input.goal,
    researchMode,
    publicContext,
    internalContext,
    webSources,
    context: {
      sessionId: input.sessionId,
      userId: input.userId,
      bandId: input.bandId,
    },
    depth: input.depth,
  })
}

export async function previewTopicBrief(input: {
  userId: string
  topic: string
  goal: TalkItOutGoal
  bandId?: string | null
}): Promise<TalkItOutTopicBrief> {
  const key = cacheKey(input.topic, input.goal, input.bandId ?? null)
  const cached = previewCache.get(key)
  if (cached && Date.now() - cached.at < PREVIEW_CACHE_MS) {
    return cached.brief
  }

  const brief = await generateTopicBrief({
    topic: input.topic,
    goal: input.goal,
    bandId: input.bandId ?? null,
    userId: input.userId,
    sessionId: `preview-${input.userId}`,
    depth: 'preview',
  })

  previewCache.set(key, { at: Date.now(), brief })
  return brief
}

export async function generateAndStoreSessionTopicBrief(sessionId: string) {
  const session = await prisma.talkItOutSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      topic: true,
      goal: true,
      bandId: true,
      createdByUserId: true,
    },
  })
  if (!session) return

  await prisma.talkItOutSession.update({
    where: { id: sessionId },
    data: { topicBriefStatus: 'PENDING' },
  })

  try {
    const brief = await generateTopicBrief({
      topic: session.topic,
      goal: session.goal,
      bandId: session.bandId,
      userId: session.createdByUserId,
      sessionId: session.id,
      depth: 'full',
    })

    await prisma.talkItOutSession.update({
      where: { id: sessionId },
      data: {
        topicBriefStatus: 'READY',
        topicBriefSummary: brief.summary,
        topicBriefJson: JSON.stringify(brief),
        topicBriefGeneratedAt: new Date(),
        facilitatorPrompt: compressBriefForFacilitator(brief),
      },
    })
  } catch (err) {
    console.error('[TalkItOut] Topic brief generation failed:', err)
    await prisma.talkItOutSession.update({
      where: { id: sessionId },
      data: { topicBriefStatus: 'FAILED' },
    })
  }
}

export async function ensureSessionTopicBriefFresh(
  sessionId: string,
  timeoutMs = 8000
): Promise<void> {
  const session = await prisma.talkItOutSession.findUnique({
    where: { id: sessionId },
    select: { topicBriefStatus: true },
  })
  if (!session || session.topicBriefStatus === 'READY') return

  const work = generateAndStoreSessionTopicBrief(sessionId)
  await Promise.race([
    work,
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ])
}

export function compressBriefForFacilitator(brief: TalkItOutTopicBrief): string {
  const lines = [
    `Summary: ${brief.summary}`,
    `Success looks like: ${brief.whatSuccessLooksLike}`,
    brief.likelyPerspectives?.length
      ? `Likely perspectives: ${brief.likelyPerspectives.join('; ')}`
      : '',
    brief.commonTensions?.length
      ? `Tensions to watch: ${brief.commonTensions.join('; ')}`
      : '',
    brief.questionsToSurface?.length
      ? `Questions to surface: ${brief.questionsToSurface.join(' | ')}`
      : '',
    brief.factsToVerifyInRoom?.length
      ? `Verify in room: ${brief.factsToVerifyInRoom.join('; ')}`
      : '',
  ].filter(Boolean)
  return lines.join('\n')
}

export function getSessionTopicBriefBlock(
  topicBriefJson: string | null | undefined,
  topicBriefSummary: string | null | undefined
): string {
  const brief = parseTopicBriefJson(topicBriefJson)
  if (brief) {
    return compressBriefForFacilitator(brief)
  }
  if (topicBriefSummary?.trim()) {
    return `Summary: ${topicBriefSummary.trim()}`
  }
  return ''
}
