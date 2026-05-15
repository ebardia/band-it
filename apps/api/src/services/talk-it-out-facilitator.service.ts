import {
  TalkItOutGoal,
  TalkItOutMessage,
  TalkItOutMessageType,
  TalkItOutParticipant,
  TalkItOutSession,
  User,
} from '@prisma/client'
import { callGemini, getGeminiFacilitatorModel, getGeminiGateModel } from '../lib/gemini-client'

const GOAL_DESCRIPTIONS: Record<TalkItOutGoal, string> = {
  DECISION: 'reach a clear decision the group can commit to',
  EXPLORE: 'explore options and tradeoffs without forcing an immediate decision',
  RESOLVE: 'resolve a conflict or tension between perspectives',
  IDEATE: 'generate ideas and creative possibilities',
  ALIGN: 'align on direction and shared priorities',
  UNDERSTAND: 'build shared understanding of the topic',
}

const FACILITATOR_SYSTEM = `You are a skilled human facilitator for "Talk It Out" on Band It.
Your tone: confident but not heavy-handed, curious, attentive. Brevity is a virtue.
You do NOT take positions on the topic. You do NOT respond to every message.
When no intervention is needed, respond with exactly: NO_INTERVENTION`

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

function buildFacilitatorPrompt(
  session: SessionWithPeople,
  messages: MessageRow[],
  extraInstruction?: string
): string {
  const goalDesc = GOAL_DESCRIPTIONS[session.goal]
  return `Topic: ${session.topic}
Goal: ${goalDesc}

Participants:
${participantContext(session.participants)}

${extraInstruction || 'Given the conversation below, decide if you should intervene. If yes, say what the facilitator should say to the group. If no intervention is warranted, respond with only: NO_INTERVENTION'}

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

Write the facilitator OPENING message for this Talk It Out session. Include:
1. Frame the topic and goal in 1-2 sentences
2. Name the participants briefly
3. Set brief norms (respect, take turns, evidence over assertion)
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

Recent conversation (last messages only):
---
${formatTranscript(messages.slice(-12))}
---

Should the facilitator intervene right now?
Reply with exactly YES or NO.

Intervene (YES) when: someone hasn't spoken, someone was ignored, clarification needed, summary moment, tension to surface, or the group needs direction toward the goal.
Do NOT intervene (NO) when: the last facilitator message already addressed the latest point, or participants are mid-thought with nothing new to add.`

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
  context: { sessionId: string; userId?: string; bandId?: string | null }
): Promise<string | null> {
  const prompt = buildFacilitatorPrompt(session, messages)
  const res = await callGemini(prompt, {
    operation: 'talk_it_out_intervention',
    sessionId: context.sessionId,
    userId: context.userId,
    bandId: context.bandId,
  }, {
    model: getGeminiFacilitatorModel(),
    maxOutputTokens: 900,
    system: FACILITATOR_SYSTEM,
  })

  const text = res.content.trim()
  if (!text || text === 'NO_INTERVENTION' || text.toUpperCase().includes('NO_INTERVENTION')) {
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

Full conversation:
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
