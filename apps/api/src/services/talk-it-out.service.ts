import {
  TalkItOutParticipantRole,
  TalkItOutParticipantStatus,
  TalkItOutSessionStatus,
} from '@prisma/client'
import { prisma } from '../lib/prisma'
import { notificationService } from './notification.service'
import {
  generateClosingSummary,
  generateFacilitatorIntervention,
  generateOpeningMessage,
  shouldFacilitatorIntervene,
} from './talk-it-out-facilitator.service'

const sessionInclude = {
  creator: { select: { id: true, name: true, email: true } },
  band: { select: { id: true, name: true, slug: true } },
  participants: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          strengths: true,
          passions: true,
        },
      },
    },
  },
  messages: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      authorUser: { select: { id: true, name: true } },
    },
  },
}

export async function assertSessionAccess(sessionId: string, userId: string) {
  const participant = await prisma.talkItOutParticipant.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  })
  if (!participant) {
    throw new Error('You do not have access to this session')
  }
  return participant
}

export async function getSessionForUser(sessionId: string, userId: string) {
  await assertSessionAccess(sessionId, userId)
  return prisma.talkItOutSession.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  })
}

export async function listSessionsForUser(userId: string) {
  const participations = await prisma.talkItOutParticipant.findMany({
    where: { userId, status: { not: 'LEFT' } },
    include: {
      session: {
        include: {
          creator: { select: { id: true, name: true } },
          band: { select: { id: true, name: true } },
          participants: {
            where: { status: 'JOINED' },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { session: { updatedAt: 'desc' } },
  })

  return participations.map((p) => ({
    ...p.session,
    myStatus: p.status,
    myRole: p.role,
    joinedCount: p.session.participants.length,
  }))
}

export async function searchUsersToInvite(
  userId: string,
  query: string,
  bandId?: string | null,
  limit = 12
) {
  const q = query.trim()
  if (q.length < 2) return []

  const baseWhere = {
    id: { not: userId },
    deletedAt: null,
    bannedAt: null,
    OR: [
      { name: { contains: q, mode: 'insensitive' as const } },
      { email: { contains: q, mode: 'insensitive' as const } },
    ],
  }

  if (bandId) {
    const members = await prisma.member.findMany({
      where: {
        bandId,
        status: 'ACTIVE',
        user: baseWhere,
      },
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    return members.map((m) => m.user)
  }

  return prisma.user.findMany({
    where: baseWhere,
    take: limit,
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })
}

export async function createSession(input: {
  userId: string
  topic: string
  goal: import('@prisma/client').TalkItOutGoal
  maxParticipants?: number
  bandId?: string | null
  inviteeUserIds: string[]
}) {
  const maxParticipants = Math.min(Math.max(input.maxParticipants ?? 8, 2), 15)
  const inviteeIds = [...new Set(input.inviteeUserIds.filter((id) => id !== input.userId))]

  if (inviteeIds.length < 1) {
    throw new Error('Invite at least one other participant')
  }
  if (inviteeIds.length + 1 > maxParticipants) {
    throw new Error(`Too many invitees for max participants (${maxParticipants})`)
  }

  if (input.bandId) {
    const membership = await prisma.member.findFirst({
      where: { bandId: input.bandId, userId: input.userId, status: 'ACTIVE' },
    })
    if (!membership) {
      throw new Error('You must be an active member of the selected band')
    }
  }

  const session = await prisma.talkItOutSession.create({
    data: {
      createdByUserId: input.userId,
      bandId: input.bandId || null,
      topic: input.topic.trim(),
      goal: input.goal,
      maxParticipants,
      status: 'SETUP',
      participants: {
        create: [
          {
            userId: input.userId,
            role: 'CREATOR',
            status: 'JOINED',
            joinedAt: new Date(),
          },
          ...inviteeIds.map((userId) => ({
            userId,
            role: 'PARTICIPANT' as TalkItOutParticipantRole,
            status: 'INVITED' as TalkItOutParticipantStatus,
          })),
        ],
      },
    },
    include: sessionInclude,
  })

  const actionUrl = `/talk-it-out/${session.id}`
  for (const inviteeId of inviteeIds) {
    await notificationService.create({
      userId: inviteeId,
      type: 'TALK_IT_OUT_INVITED',
      title: 'Talk It Out invitation',
      message: `${session.creator.name} invited you: "${session.topic}"`,
      actionUrl,
      relatedId: session.id,
      relatedType: 'talk_it_out',
      metadata: { topic: session.topic, creatorName: session.creator.name },
    })
  }

  return session
}

export async function joinSession(sessionId: string, userId: string) {
  const participant = await prisma.talkItOutParticipant.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
    include: { session: true },
  })
  if (!participant) {
    throw new Error('You are not invited to this session')
  }
  if (participant.session.status === 'CLOSED') {
    throw new Error('This session is closed')
  }

  await prisma.talkItOutParticipant.update({
    where: { id: participant.id },
    data: {
      status: 'JOINED',
      joinedAt: participant.joinedAt ?? new Date(),
      leftAt: null,
    },
  })

  return getSessionForUser(sessionId, userId)
}

export async function startSession(sessionId: string, userId: string) {
  const session = await prisma.talkItOutSession.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  })
  if (!session) throw new Error('Session not found')
  if (session.createdByUserId !== userId) {
    throw new Error('Only the creator can start this session')
  }
  if (session.status !== 'SETUP') {
    throw new Error('Session has already started or closed')
  }

  const joinedCount = session.participants.filter((p) => p.status === 'JOINED').length
  if (joinedCount < 2) {
    throw new Error('At least two participants must be joined before starting')
  }

  const opening = await generateOpeningMessage(session, {
    sessionId,
    userId,
    bandId: session.bandId,
  })

  await prisma.$transaction([
    prisma.talkItOutSession.update({
      where: { id: sessionId },
      data: { status: 'ACTIVE', startedAt: new Date() },
    }),
    prisma.talkItOutMessage.create({
      data: {
        sessionId,
        authorType: 'FACILITATOR',
        content: opening,
        messageType: 'FACILITATOR_OPENING',
      },
    }),
  ])

  const actionUrl = `/talk-it-out/${sessionId}`
  for (const p of session.participants) {
    if (p.userId === userId) continue
    if (p.status === 'JOINED' || p.status === 'INVITED') {
      await notificationService.create({
        userId: p.userId,
        type: 'TALK_IT_OUT_STARTED',
        title: 'Talk It Out started',
        message: `"${session.topic}" is now live`,
        actionUrl,
        relatedId: sessionId,
        relatedType: 'talk_it_out',
      })
    }
  }

  return getSessionForUser(sessionId, userId)
}

export async function sendUserMessage(
  sessionId: string,
  userId: string,
  content: string
) {
  const trimmed = content.trim()
  if (!trimmed) throw new Error('Message cannot be empty')

  const session = await prisma.talkItOutSession.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  })
  if (!session) throw new Error('Session not found')
  if (session.status !== 'ACTIVE') {
    throw new Error('Session is not active')
  }

  const participant = session.participants.find((p) => p.userId === userId)
  if (!participant || participant.status !== 'JOINED') {
    throw new Error('You must join the session before posting')
  }

  const forceFacilitator =
    /@facilitator\b/i.test(trimmed) || /\bfacilitator\b/i.test(trimmed)

  const userMessage = await prisma.talkItOutMessage.create({
    data: {
      sessionId,
      authorType: 'USER',
      authorUserId: userId,
      content: trimmed.replace(/@facilitator\b/gi, '').trim() || trimmed,
      messageType: 'USER_MESSAGE',
    },
    include: { authorUser: { select: { id: true, name: true } } },
  })

  const allMessages = [...session.messages, userMessage]
  const shouldIntervene = await shouldFacilitatorIntervene(
    session,
    allMessages,
    { sessionId, userId, bandId: session.bandId },
    forceFacilitator
  )

  let facilitatorMessage = null
  if (shouldIntervene) {
    const intervention = await generateFacilitatorIntervention(session, allMessages, {
      sessionId,
      userId,
      bandId: session.bandId,
    })
    if (intervention) {
      const proposesClose =
        /should i summarize|ready to (close|wrap)|reach(ed)? a conclusion/i.test(intervention)
      facilitatorMessage = await prisma.talkItOutMessage.create({
        data: {
          sessionId,
          authorType: 'FACILITATOR',
          content: intervention,
          messageType: proposesClose
            ? 'FACILITATOR_SUMMARY'
            : 'FACILITATOR_INTERVENTION',
        },
      })

      if (proposesClose) {
        for (const p of session.participants) {
          if (p.status !== 'JOINED') continue
          await notificationService.create({
            userId: p.userId,
            type: 'TALK_IT_OUT_FACILITATOR_PROMPT',
            title: 'Facilitator check-in',
            message: `The facilitator is ready to summarize "${session.topic}"`,
            actionUrl: `/talk-it-out/${sessionId}`,
            relatedId: sessionId,
            relatedType: 'talk_it_out',
          })
        }
      }
    }
  }

  return { userMessage, facilitatorMessage }
}

export async function closeSession(sessionId: string, userId: string) {
  const session = await prisma.talkItOutSession.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  })
  if (!session) throw new Error('Session not found')
  if (session.createdByUserId !== userId) {
    throw new Error('Only the creator can close this session')
  }
  if (session.status === 'CLOSED') {
    return session
  }

  const summary = await generateClosingSummary(session, session.messages, {
    sessionId,
    userId,
    bandId: session.bandId,
  })

  await prisma.$transaction([
    prisma.talkItOutSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        summaryDraft: summary,
        summary,
      },
    }),
    prisma.talkItOutMessage.create({
      data: {
        sessionId,
        authorType: 'FACILITATOR',
        content: summary,
        messageType: 'CLOSING_SUMMARY',
      },
    }),
  ])

  for (const p of session.participants) {
    if (p.status === 'LEFT') continue
    await notificationService.create({
      userId: p.userId,
      type: 'TALK_IT_OUT_CLOSED',
      title: 'Talk It Out closed',
      message: `"${session.topic}" — review the summary`,
      actionUrl: `/talk-it-out/${sessionId}`,
      relatedId: sessionId,
      relatedType: 'talk_it_out',
    })
  }

  return getSessionForUser(sessionId, userId)
}

export async function updateSummaryDraft(
  sessionId: string,
  userId: string,
  summaryDraft: string
) {
  await assertSessionAccess(sessionId, userId)
  const session = await prisma.talkItOutSession.findUnique({ where: { id: sessionId } })
  if (!session) throw new Error('Session not found')
  if (session.status !== 'CLOSED') {
    throw new Error('Summary can only be edited after the session is closed')
  }

  return prisma.talkItOutSession.update({
    where: { id: sessionId },
    data: { summaryDraft: summaryDraft.trim() },
    include: sessionInclude,
  })
}

export async function finalizeSummary(sessionId: string, userId: string) {
  await assertSessionAccess(sessionId, userId)
  const session = await prisma.talkItOutSession.findUnique({ where: { id: sessionId } })
  if (!session) throw new Error('Session not found')
  if (session.status !== 'CLOSED') {
    throw new Error('Session must be closed first')
  }

  return prisma.talkItOutSession.update({
    where: { id: sessionId },
    data: { summary: session.summaryDraft || session.summary },
    include: sessionInclude,
  })
}
