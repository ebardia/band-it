import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'

const CAN_MANAGE_EVENTS = ['FOUNDER', 'GOVERNOR']

function parseActionItemsFromNotes(notes: string | null | undefined): string[] {
  if (!notes) return []

  const lines = notes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const items: string[] = []
  for (const line of lines) {
    const checkboxMatch = line.match(/^[-*]\s+\[[ xX]\]\s+(.+)$/)
    if (checkboxMatch?.[1]) {
      items.push(checkboxMatch[1].trim())
      continue
    }

    const actionMatch = line.match(/^action\s*:\s*(.+)$/i)
    if (actionMatch?.[1]) {
      items.push(actionMatch[1].trim())
    }
  }

  return Array.from(new Set(items)).filter((item) => item.length > 0)
}

export const createProposalFromMeetingActionItems = publicProcedure
  .input(
    z.object({
      eventId: z.string(),
      userId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { eventId, userId } = input

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              select: { userId: true, role: true },
            },
          },
        },
        createdBy: {
          select: { name: true },
        },
      },
    })

    if (!event) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' })
    }

    const member = event.band.members.find((m) => m.userId === userId)
    if (!member) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be a band member' })
    }

    const isCreator = event.createdById === userId
    const canManage = CAN_MANAGE_EVENTS.includes(member.role)
    if (!isCreator && !canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the event creator, founder, or governor can create a meeting-output proposal',
      })
    }

    const actionItems = parseActionItemsFromNotes(event.meetingNotes)
    if (actionItems.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'No action items found. Add action items to meeting notes using "- [ ] item" or "Action: item".',
      })
    }

    const executionSubtype = `MEETING_OUTPUT:${event.id}`
    const existing = await prisma.proposal.findFirst({
      where: {
        bandId: event.bandId,
        executionSubtype,
      },
      select: { id: true, status: true },
    })

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `A meeting-output proposal already exists for this event (${existing.status}).`,
      })
    }

    let status: 'PENDING_REVIEW' | 'OPEN' = 'OPEN'
    let votingEndsAt: Date | null = null
    let votingStartedAt: Date | null = null
    const now = new Date()

    if (event.band.requireProposalReview) {
      status = 'PENDING_REVIEW'
    } else {
      status = 'OPEN'
      votingStartedAt = now
      votingEndsAt = new Date(now)
      if (event.band.votingPeriodHours) {
        votingEndsAt.setTime(votingEndsAt.getTime() + event.band.votingPeriodHours * 60 * 60 * 1000)
      } else {
        votingEndsAt.setDate(votingEndsAt.getDate() + event.band.votingPeriodDays)
      }
    }

    const actionItemsMarkdown = actionItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n')
    const description = [
      `Meeting: ${event.title}`,
      `Event ID: ${event.id}`,
      '',
      'This proposal requests approval for the following meeting action items.',
      '',
      'Action Items:',
      actionItemsMarkdown,
      '',
      'Execution rule:',
      '- No project/task/checklist execution happens until this proposal is approved.',
      '- After approval, members can create projects and then tasks/checklist items from the approved action items.',
    ].join('\n')

    const proposal = await prisma.proposal.create({
      data: {
        bandId: event.bandId,
        createdById: userId,
        title: `Meeting Output: ${event.title}`,
        description,
        type: 'PROJECT',
        priority: 'MEDIUM',
        executionType: 'PROJECT',
        executionSubtype,
        status,
        votingStartedAt,
        votingEndsAt,
        submittedAt: now,
        submissionCount: 1,
        allowEarlyClose: false,
      },
      include: {
        band: { select: { slug: true } },
      },
    })

    return {
      proposal: {
        id: proposal.id,
        status: proposal.status,
        actionUrl: `/bands/${proposal.band.slug}/proposals/${proposal.id}`,
      },
      actionItemsCount: actionItems.length,
    }
  })

