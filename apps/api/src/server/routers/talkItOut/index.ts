import { z } from 'zod'
import { TalkItOutGoal } from '@prisma/client'
import { router, publicProcedure } from '../../trpc'
import * as talkItOutService from '../../../services/talk-it-out.service'

const goalSchema = z.nativeEnum(TalkItOutGoal)

export const talkItOutRouter = router({
  listMySessions: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => talkItOutService.listSessionsForUser(input.userId)),

  getSession: publicProcedure
    .input(z.object({ sessionId: z.string(), userId: z.string() }))
    .query(async ({ input }) => talkItOutService.getSessionForUser(input.sessionId, input.userId)),

  searchInviteUsers: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        query: z.string(),
        bandId: z.string().nullable().optional(),
      })
    )
    .query(async ({ input }) =>
      talkItOutService.searchUsersToInvite(
        input.userId,
        input.query,
        input.bandId ?? null
      )
    ),

  previewTopicBrief: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        topic: z.string().min(8).max(500),
        goal: goalSchema,
        bandId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) =>
      talkItOutService.previewTopicBrief({
        userId: input.userId,
        topic: input.topic,
        goal: input.goal,
        bandId: input.bandId ?? null,
      })
    ),

  refreshTopicBrief: publicProcedure
    .input(z.object({ sessionId: z.string(), userId: z.string() }))
    .mutation(async ({ input }) =>
      talkItOutService.refreshSessionTopicBrief(input.sessionId, input.userId)
    ),

  createSession: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        topic: z.string().min(3).max(500),
        goal: goalSchema,
        maxParticipants: z.number().min(2).max(15).optional(),
        bandId: z.string().nullable().optional(),
        inviteeUserIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ input }) =>
      talkItOutService.createSession({
        userId: input.userId,
        topic: input.topic,
        goal: input.goal,
        maxParticipants: input.maxParticipants,
        bandId: input.bandId ?? null,
        inviteeUserIds: input.inviteeUserIds,
      })
    ),

  joinSession: publicProcedure
    .input(z.object({ sessionId: z.string(), userId: z.string() }))
    .mutation(async ({ input }) =>
      talkItOutService.joinSession(input.sessionId, input.userId)
    ),

  startSession: publicProcedure
    .input(z.object({ sessionId: z.string(), userId: z.string() }))
    .mutation(async ({ input }) =>
      talkItOutService.startSession(input.sessionId, input.userId)
    ),

  sendMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
        content: z.string().min(1).max(8000),
      })
    )
    .mutation(async ({ input }) =>
      talkItOutService.sendUserMessage(input.sessionId, input.userId, input.content)
    ),

  closeSession: publicProcedure
    .input(z.object({ sessionId: z.string(), userId: z.string() }))
    .mutation(async ({ input }) =>
      talkItOutService.closeSession(input.sessionId, input.userId)
    ),

  updateSummaryDraft: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
        summaryDraft: z.string().min(1).max(50000),
      })
    )
    .mutation(async ({ input }) =>
      talkItOutService.updateSummaryDraft(
        input.sessionId,
        input.userId,
        input.summaryDraft
      )
    ),

  finalizeSummary: publicProcedure
    .input(z.object({ sessionId: z.string(), userId: z.string() }))
    .mutation(async ({ input }) =>
      talkItOutService.finalizeSummary(input.sessionId, input.userId)
    ),
})
