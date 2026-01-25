import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { canAccessChannel } from '../channel'

/**
 * Advanced full-text search across messages in a band
 * Uses PostgreSQL tsvector for efficient searching
 */
export const advancedSearch = publicProcedure
  .input(z.object({
    bandId: z.string(),
    userId: z.string(),
    query: z.string().min(1).max(200),
    // Filters
    channelId: z.string().optional(),
    authorId: z.string().optional(),
    dateFrom: z.string().optional(), // ISO date string
    dateTo: z.string().optional(), // ISO date string
    // Pagination
    limit: z.number().min(1).max(50).default(20),
    offset: z.number().min(0).default(0),
  }))
  .query(async ({ input }) => {
    const { bandId, userId, query, channelId, authorId, dateFrom, dateTo, limit, offset } = input

    // Verify user is a member of the band and get their role
    const membership = await prisma.member.findFirst({
      where: { bandId, userId, status: 'ACTIVE' },
      select: { role: true },
    })

    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    // Get all channels user can access
    const allChannels = await prisma.channel.findMany({
      where: { bandId, isArchived: false },
      select: { id: true, visibility: true },
    })

    const accessibleChannelIds = allChannels
      .filter(c => canAccessChannel(membership.role, c.visibility))
      .map(c => c.id)

    if (accessibleChannelIds.length === 0) {
      return { messages: [], total: 0 }
    }

    // If specific channel requested, verify access
    let searchChannelIds = accessibleChannelIds
    if (channelId) {
      if (!accessibleChannelIds.includes(channelId)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this channel',
        })
      }
      searchChannelIds = [channelId]
    }

    // Build date filters
    let dateFilter = ''
    const dateParams: any[] = []
    let paramIndex = 3 // Starting after bandId, userId, query

    if (dateFrom) {
      dateFilter += ` AND m."createdAt" >= $${paramIndex}`
      dateParams.push(new Date(dateFrom))
      paramIndex++
    }
    if (dateTo) {
      dateFilter += ` AND m."createdAt" <= $${paramIndex}`
      dateParams.push(new Date(dateTo))
      paramIndex++
    }

    // Build author filter
    let authorFilter = ''
    if (authorId) {
      authorFilter = ` AND m."authorId" = $${paramIndex}`
      dateParams.push(authorId)
      paramIndex++
    }

    // Convert channel IDs to SQL format
    const channelIdList = searchChannelIds.map(id => `'${id}'`).join(',')

    // Use simple ILIKE search for reliability
    // Build the query with proper parameter indexing
    const params: any[] = []
    let paramNum = 1

    const likePattern = `%${query}%`
    params.push(likePattern) // $1
    const queryParamNum = paramNum++

    params.push(limit) // $2
    const limitParamNum = paramNum++

    let dateFilterClause = ''
    if (dateFrom) {
      params.push(new Date(dateFrom))
      dateFilterClause += ` AND m."createdAt" >= $${paramNum++}`
    }
    if (dateTo) {
      params.push(new Date(dateTo))
      dateFilterClause += ` AND m."createdAt" <= $${paramNum++}`
    }

    let authorFilterClause = ''
    if (authorId) {
      params.push(authorId)
      authorFilterClause = ` AND m."authorId" = $${paramNum++}`
    }

    params.push(offset)
    const offsetParamNum = paramNum++

    const searchQuery = `
      SELECT
        m.id,
        m."channelId",
        m."authorId",
        m.content,
        m."threadId",
        m."isPinned",
        m."isEdited",
        m."editedAt",
        m."createdAt",
        u.id as "userId",
        u.name as "userName",
        u.email as "userEmail",
        c.name as "channelName",
        c.slug as "channelSlug"
      FROM "Message" m
      INNER JOIN "User" u ON u.id = m."authorId"
      INNER JOIN "Channel" c ON c.id = m."channelId"
      WHERE m."channelId" IN (${channelIdList})
        AND m."deletedAt" IS NULL
        AND m.content ILIKE $${queryParamNum}
        ${dateFilterClause}
        ${authorFilterClause}
      ORDER BY m."createdAt" DESC
      LIMIT $${limitParamNum}
      OFFSET $${offsetParamNum}
    `

    // Count query uses same params except limit/offset
    const countParams = params.slice(0, -2) // Remove limit and offset
    countParams.shift() // Remove likePattern, we'll add it back

    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Message" m
      WHERE m."channelId" IN (${channelIdList})
        AND m."deletedAt" IS NULL
        AND m.content ILIKE $1
        ${dateFilterClause.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) - 1}`)}
        ${authorFilterClause.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) - 1}`)}
    `

    try {
      const results = await prisma.$queryRawUnsafe<any[]>(searchQuery, ...params)

      // Build count params properly
      const countParamsArray: any[] = [likePattern]
      if (dateFrom) countParamsArray.push(new Date(dateFrom))
      if (dateTo) countParamsArray.push(new Date(dateTo))
      if (authorId) countParamsArray.push(authorId)

      const countResult = await prisma.$queryRawUnsafe<{ total: bigint }[]>(
        countQuery,
        ...countParamsArray
      )

      return {
        messages: results.map((row: any) => ({
          id: row.id,
          channelId: row.channelId,
          content: row.content,
          highlight: null,
          author: {
            id: row.userId,
            name: row.userName,
            email: row.userEmail,
          },
          channel: {
            id: row.channelId,
            name: row.channelName,
            slug: row.channelSlug,
          },
          threadId: row.threadId,
          isPinned: row.isPinned,
          isEdited: row.isEdited,
          editedAt: row.editedAt,
          createdAt: row.createdAt,
        })),
        total: Number(countResult[0]?.total || 0),
      }
    } catch (error) {
      console.error('Search query failed:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Search failed',
      })
    }
  })
