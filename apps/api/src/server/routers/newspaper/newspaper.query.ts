import { z } from 'zod'
import { formatDistanceToNow } from 'date-fns'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { MemberRole } from '@prisma/client'

const VERIFY_ROLES: MemberRole[] = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

function compactAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return 'NOW'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}M AGO`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}H AGO`
  const d = Math.floor(h / 24)
  if (d < 14) return `${d}D AGO`
  return `${Math.floor(d / 7)}W AGO`
}

function editionName(fullName: string | null, email: string | null): string {
  const raw = (fullName || email || 'Member').trim()
  const first = raw.split(/\s+/)[0] || 'Member'
  return `${first.toUpperCase()}'S EDITION`
}

export const getHomeFeed = publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true, email: true },
    })

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
    }

    const memberships = await prisma.member.findMany({
      where: {
        userId: input.userId,
        status: 'ACTIVE',
        role: { in: VERIFY_ROLES },
      },
      select: { bandId: true },
    })
    const bandIds = [...new Set(memberships.map((m) => m.bandId))]

    const reviewTask =
      bandIds.length === 0
        ? null
        : await prisma.task.findFirst({
            where: {
              status: 'IN_REVIEW',
              verificationStatus: 'PENDING',
              bandId: { in: bandIds },
            },
            orderBy: { updatedAt: 'desc' },
            include: {
              assignee: { select: { id: true, name: true } },
              project: { select: { id: true, name: true } },
              band: { select: { id: true, slug: true, name: true } },
              deliverable: { select: { summary: true } },
            },
          })

    const [replyComment, mentionComment] = await Promise.all([
      prisma.comment.findFirst({
        where: {
          deletedAt: null,
          parentId: { not: null },
          authorId: { not: input.userId },
          parent: { authorId: input.userId, deletedAt: null },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true } },
          parent: { select: { id: true, content: true, proposalId: true } },
          proposal: { select: { id: true, title: true } },
          project: { select: { id: true, name: true } },
          task: { select: { id: true, name: true } },
          band: { select: { id: true, slug: true, name: true } },
        },
      }),
      prisma.comment.findFirst({
        where: {
          deletedAt: null,
          mentions: { some: { userId: input.userId } },
          authorId: { not: input.userId },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true } },
          proposal: { select: { id: true, title: true } },
          project: { select: { id: true, name: true } },
          task: { select: { id: true, name: true } },
          band: { select: { id: true, slug: true, name: true } },
        },
      }),
    ])

    const pickRoundtable = () => {
      if (!replyComment && !mentionComment) return null
      if (!replyComment) return { kind: 'mention' as const, comment: mentionComment! }
      if (!mentionComment) return { kind: 'reply' as const, comment: replyComment }
      return replyComment.createdAt >= mentionComment.createdAt
        ? { kind: 'reply' as const, comment: replyComment }
        : { kind: 'mention' as const, comment: mentionComment }
    }

    const rt = pickRoundtable()

    let roundtable: {
      href: string
      kicker: string
      headline: string
      excerpt: string
      byline: string
    } | null = null

    if (rt) {
      const c = rt.comment
      const authorName = c.author.name || c.author.id
      const authorUpper = authorName.toUpperCase()
      const bandName = (c.band?.name || 'BAND').toUpperCase()
      const when = compactAgo(c.createdAt)
      const excerptRaw = c.content.replace(/\s+/g, ' ').trim()
      const excerpt =
        excerptRaw.length > 160 ? `"${excerptRaw.slice(0, 157)}…"` : `"${excerptRaw}"`

      let headline: string
      if (rt.kind === 'mention') {
        headline = `${authorName} mentioned you in ${c.proposal?.title || c.project?.name || c.task?.name || c.band?.name || 'a discussion'}`
      } else if (c.proposalId && c.proposal) {
        headline = `${authorName} replied to your comment on ${c.proposal.title}`
      } else if (c.projectId && c.project) {
        headline = `${authorName} replied in ${c.project.name}`
      } else if (c.taskId && c.task) {
        headline = `${authorName} replied on task ${c.task.name}`
      } else {
        headline = `${authorName} replied to your comment`
      }

      let href = '/user-dashboard'
      if (c.band?.slug) {
        if (c.proposalId) href = `/bands/${c.band.slug}/proposals/${c.proposalId}`
        else if (c.taskId) href = `/bands/${c.band.slug}/tasks/${c.taskId}`
        else if (c.projectId) href = `/bands/${c.band.slug}/projects/${c.projectId}`
        else href = `/bands/${c.band.slug}`
      }

      roundtable = {
        href,
        kicker: rt.kind === 'mention' ? 'YOU WERE MENTIONED' : 'REPLY NEEDED',
        headline,
        excerpt,
        byline: `${authorUpper} • ${when} • ${bandName}`,
      }
    }

    let lead: {
      href: string
      kicker: string
      headline: string
      dek: string
      byline: string
    } | null = null

    if (reviewTask) {
      const assigneeName = reviewTask.assignee?.name || 'A contributor'
      const summaryBit = reviewTask.deliverable?.summary
      const headline = summaryBit
        ? `${assigneeName}'s research summary on ${reviewTask.name} is ready for your review`
        : `${assigneeName}'s work on "${reviewTask.name}" is ready for your review`
      const submitted = reviewTask.completedAt || reviewTask.updatedAt
      const ago = formatDistanceToNow(submitted, { addSuffix: true })
      const dek = `${assigneeName} submitted it ${ago}. Quick check before it goes to the funder?`
      const href = `/bands/${reviewTask.band.slug}/projects/${reviewTask.projectId}?task=${reviewTask.id}`
      const byline = `FROM YOUR ${reviewTask.project.name.toUpperCase()} PROJECT • ${compactAgo(submitted)}`

      lead = {
        href,
        kicker: 'PEER REVIEW NEEDED',
        headline,
        dek,
        byline,
      }
    }

    return {
      editionLine: editionName(user.name, user.email),
      review: lead,
      roundtable,
    }
  })
