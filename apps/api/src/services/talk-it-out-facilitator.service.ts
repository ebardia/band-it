import {
  TalkItOutGoal,
  TalkItOutMessage,
  TalkItOutMessageType,
  TalkItOutParticipant,
  TalkItOutSession,
  User,
} from '@prisma/client'
import { callGemini, getGeminiFacilitatorModel, getGeminiGateModel } from '../lib/gemini-client'
import { getSessionTopicBriefBlock } from './talk-it-out-topic-brief.service'

const GOAL_DESCRIPTIONS: Record<TalkItOutGoal, string> = {
  DECISION: 'reach a clear decision the group can commit to',
  EXPLORE: 'explore options and tradeoffs without forcing an immediate decision',
  RESOLVE: 'resolve a conflict or tension between perspectives',
  IDEATE: 'generate ideas and creative possibilities',
  ALIGN: 'align on direction and shared priorities',
  UNDERSTAND: 'build shared understanding of the topic',
}

const FACILITATOR_SYSTEM = `You are a skilled human facilitator for "Talk It Out" on Band It — a band workspace where groups work through decisions, conflict, and ideas together.

Tone: warm, direct, calm. Usually 2–5 sentences; longer only when summarizing or closing.

Your job is to help the group make real progress toward the session goal. You are not a referee who only says "be respectful."

When you intervene:
1. Name what you notice in the room (pattern, tension, avoidance, imbalance) in one short line — without taking sides on the merits.
2. If respect has broken down: reset the norm in one sentence, then move on — never stop at scolding alone.
3. Always guide forward: ask a specific question, name the tradeoff, invite a quiet voice, or propose a concrete next step toward the goal (e.g. "Let's list two options and what each costs us").
4. Tie your move to the session goal (decision, resolution, alignment, etc.).

You do NOT argue the topic yourself. You do NOT pile on blame. You do NOT give generic pep talks.

Bad intervention (avoid): "Let's be respectful." / "Please stay civil." with nothing else.
Good intervention (aim for): brief norm + reflection + one forward-moving question or proposal tied to the goal.`

const INTERVENTION_INSTRUCTION = `Write the facilitator's next message to the group.

Requirements:
- Help the group move toward the session goal, not only manage tone.
- If the latest messages are hostile, dismissive, or personal: acknowledge it briefly, reset respect, then redirect (question or proposal).
- If people are talking past each other: reflect both sides fairly and name the decision or question underneath.
- If someone was ignored or one voice dominates: rebalance ("[Name], we haven't heard your read yet").
- End with at least one clear question or proposed next step.

Write only what the facilitator says to the group. No JSON. No preamble. No "NO_INTERVENTION".`

const FORCED_INTERVENTION_INSTRUCTION = `The group explicitly requested facilitator input (@facilitator).

Write a substantive facilitator message (not a one-liner). Include:
1. What you observe in the conversation relative to the goal
2. Any norm reset only if needed — paired with forward motion
3. At least one specific question or concrete next step toward resolving or deciding

Write only the facilitator's words to the group. No JSON. No preamble.`

type SessionWithPeople = TalkItOutSession & {
  participants: (TalkItOutParticipant & { user: Pick<User, 'id' | 'name' | 'strengths' | 'passions'> })[]
}

type MessageRow = TalkItOutMessage & { authorUser: Pick<User, 'name'> | null }

function participantContext(
  participants: SessionWithPeople['participants']
): string {
  return participants
    .filter((p) => p.status === 'JOINED' || p.role === 'CREATOR')
    .map((p) => {
      const skills = [...(p.user.strengths || []), ...(p.user.passions || [])].slice(0, 4).join(', ')
      return `- ${p.user.name}${skills ? ` (${skills})` : ''}`
    })
    .join('\n')
}

function topicBriefSection(session: SessionWithPeople): string {
  const block = getSessionTopicBriefBlock(session.topicBriefJson, session.topicBriefSummary)
  if (!block) return ''
  return `Background brief (use to guide toward the goal; do not read verbatim):\n${block}\n\n`
}

function formatTranscript(messages: MessageRow[]): string {
  if (messages.length === 0) return '(no messages yet)'
  return messages
    .map((m) => {
      const who =
        m.authorType === 'FACILITATOR'
          ? 'Facilitator'
          : m.authorUser?.name || 'Participant'
      return `${who}: ${m.content}`
    })
    .join('\n\n')
}

/** Bypass the LLM gate when recent messages show clear disrespect or deadlock. */
export function detectUrgentInterventionSignals(messages: MessageRow[]): boolean {
  const recentUser = messages.filter((m) => m.authorType === 'USER').slice(-4)
  if (recentUser.length === 0) return false

  const combined = recentUser.map((m) => m.content).join('\n')
  const lower = combined.toLowerCase()

  const hostilityPatterns = [
    /\b(shut\s+up|stupid|idiot|moron|dumbass|loser|pathetic|worthless|disgusting)\b/i,
    /\b(hate\s+you|go\s+to\s+hell|f+\s*u+\s*c+\s*k\s*(you|off)?)\b/i,
    /\b(asshole|bitch|bastard)\b/i,
    /\byou('re|\s+are)\s+(so\s+)?(wrong|garbage|trash|an?\s+idiot)\b/i,
    /\bno\s+one\s+cares\s+what\s+you\b/i,
  ]
  if (hostilityPatterns.some((p) => p.test(combined))) return true

  const facilitatorCount = messages.filter((m) => m.authorType === 'FACILITATOR').length
  const userCount = messages.filter((m) => m.authorType === 'USER').length
  if (userCount >= 6 && facilitatorCount <= 1) return true

  const blameLoop =
    (lower.match(/\byou\s+always\b/g) || []).length +
      (lower.match(/\byou\s+never\b/g) || []).length >=
    2
  if (blameLoop && recentUser.length >= 3) return true

  return false
}

function buildInterventionPrompt(
  session: SessionWithPeople,
  messages: MessageRow[],
  options: { forced?: boolean } = {}
): string {
  const goalDesc = GOAL_DESCRIPTIONS[session.goal]
  const instruction = options.forced ? FORCED_INTERVENTION_INSTRUCTION : INTERVENTION_INSTRUCTION

  return `Topic: ${session.topic}
Goal for this session: ${goalDesc}

${topicBriefSection(session)}Participants:
${participantContext(session.participants)}

${instruction}

Conversation history:
---
${formatTranscript(messages)}
---`
}

export async function generateOpeningMessage(
  session: SessionWithPeople,
  context: { sessionId: string; userId: string; bandId?: string | null }
): Promise<string> {
  const goalDesc = GOAL_DESCRIPTIONS[session.goal]
  const names = session.participants
    .filter((p) => p.status === 'JOINED' || p.role === 'CREATOR')
    .map((p) => p.user.name)
    .join(', ')

  const prompt = `Topic: ${session.topic}
Goal: ${goalDesc}
Participants: ${names}

${topicBriefSection(session)}Write the facilitator OPENING message for this Talk It Out session. Include:
1. Frame the topic and goal in 1-2 sentences
2. Name the participants briefly
3. Set brief norms: respect, take turns, disagree on ideas not people — and note you will step in to keep progress toward the goal (including if tone derails)
4. Invite the first participant by name to share their initial perspective

Write only the message text the facilitator says to the group. No JSON. No preamble.`

  const res = await callGemini(prompt, {
    operation: 'talk_it_out_opening',
    sessionId: context.sessionId,
    userId: context.userId,
    bandId: context.bandId,
  }, {
    model: getGeminiFacilitatorModel(),
    maxOutputTokens: 800,
    system: FACILITATOR_SYSTEM,
  })

  return res.content.trim()
}

export async function shouldFacilitatorIntervene(
  session: SessionWithPeople,
  messages: MessageRow[],
  context: { sessionId: string; userId?: string; bandId?: string | null },
  force: boolean
): Promise<boolean> {
  if (force) return true
  if (detectUrgentInterventionSignals(messages)) return true

  const recentUserMessages = messages.filter((m) => m.authorType === 'USER').slice(-8)
  if (recentUserMessages.length === 0) return false

  const lastFacilitator = [...messages].reverse().find((m) => m.authorType === 'FACILITATOR')
  const lastUser = recentUserMessages[recentUserMessages.length - 1]
  if (
    lastFacilitator &&
    lastUser &&
    lastFacilitator.createdAt > lastUser.createdAt
  ) {
    return false
  }

  const gatePrompt = `Topic: ${session.topic}
Goal: ${GOAL_DESCRIPTIONS[session.goal]}

${topicBriefSection(session)}Recent conversation (last messages only):
---
${formatTranscript(messages.slice(-12))}
---

Should the facilitator intervene right now?
Reply with exactly YES or NO.

Reply YES when ANY of these apply:
- Insults, contempt, mockery, threats, profanity aimed at a person, or language that shuts someone down
- Personal attacks or "you always/never" blame loops instead of the issue
- People talking past each other, circling, or no progress toward the session goal for several exchanges
- Someone was ignored, interrupted repeatedly, or one voice dominates
- Clarification, reframing, or a summary moment would unlock the next step
- Tension or disagreement is present but not yet named constructively

Reply NO only when: the last facilitator message already fully addressed the latest exchange AND participants are productively building on each other toward the goal.`

  const res = await callGemini(gatePrompt, {
    operation: 'talk_it_out_gate',
    sessionId: context.sessionId,
    userId: context.userId,
    bandId: context.bandId,
  }, {
    model: getGeminiGateModel(),
    maxOutputTokens: 16,
    temperature: 0.1,
  })

  const answer = res.content.trim().toUpperCase()
  return answer.startsWith('YES')
}

export async function generateFacilitatorIntervention(
  session: SessionWithPeople,
  messages: MessageRow[],
  context: { sessionId: string; userId?: string; bandId?: string | null },
  options: { forced?: boolean } = {}
): Promise<string | null> {
  const prompt = buildInterventionPrompt(session, messages, { forced: options.forced })
  const res = await callGemini(prompt, {
    operation: 'talk_it_out_intervention',
    sessionId: context.sessionId,
    userId: context.userId,
    bandId: context.bandId,
  }, {
    model: getGeminiFacilitatorModel(),
    maxOutputTokens: options.forced ? 1000 : 900,
    temperature: 0.65,
    system: FACILITATOR_SYSTEM,
  })

  const text = res.content.trim()
  if (!text) return null
  if (
    !options.forced &&
    (text === 'NO_INTERVENTION' || text.toUpperCase().includes('NO_INTERVENTION'))
  ) {
    return null
  }
  return text
}

export async function generateClosingSummary(
  session: SessionWithPeople,
  messages: MessageRow[],
  context: { sessionId: string; userId: string; bandId?: string | null }
): Promise<string> {
  const prompt = `Topic: ${session.topic}
Goal: ${GOAL_DESCRIPTIONS[session.goal]}

${topicBriefSection(session)}Full conversation:
---
${formatTranscript(messages)}
---

Write a structured closing summary with these sections (use markdown headings):
## What was discussed
## Where consensus emerged (if any)
## Where disagreement remains (if any)
## Decisions made (if any)
## Open questions (if any)
## Next steps (if any)

Be concise and factual. Do not invent decisions that were not discussed.`

  const res = await callGemini(prompt, {
    operation: 'talk_it_out_closing',
    sessionId: context.sessionId,
    userId: context.userId,
    bandId: context.bandId,
  }, {
    model: getGeminiFacilitatorModel(),
    maxOutputTokens: 1500,
    system: FACILITATOR_SYSTEM,
  })

  return res.content.trim()
}

export function mapFacilitatorMessageType(
  kind: 'opening' | 'intervention' | 'closing'
): TalkItOutMessageType {
  switch (kind) {
    case 'opening':
      return 'FACILITATOR_OPENING'
    case 'closing':
      return 'CLOSING_SUMMARY'
    default:
      return 'FACILITATOR_INTERVENTION'
  }
}
