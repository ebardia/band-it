import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'

export const auditRouter = router({
  list: publicProcedure
    .input(z.object({
      bandId: z.string(),
      entityType: z.string().optional(),
      actorId: z.string().optional(),
      action: z.string().optional(),
      daysBack: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(25),
    }))
    .query(async ({ input }) => {
      const { bandId, entityType, actorId, action, daysBack, page, pageSize } = input

      // Build where clause
      const where: any = { bandId }

      if (entityType) {
        where.entityType = entityType
      }

      if (actorId) {
        if (actorId === 'system') {
          where.actorId = null
        } else {
          where.actorId = actorId
        }
      }

      if (action) {
        where.action = action.toLowerCase()
      }

      if (daysBack) {
        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate() - daysBack)
        where.createdAt = { gte: dateFrom }
      }

      // Get total count
      const total = await prisma.auditLog.count({ where })

      // Get paginated items with actor name
      const items = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      })

      // Get actor names for non-null actorIds
      const actorIds = [...new Set(items.filter(i => i.actorId).map(i => i.actorId!))]
      const actors = actorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true },
          })
        : []

      const actorMap = new Map(actors.map(a => [a.id, a.name]))

      // Map items with actor names
      const itemsWithActorNames = items.map(item => ({
        id: item.id,
        createdAt: item.createdAt,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        entityName: item.entityName,
        actorId: item.actorId,
        actorName: item.actorId ? actorMap.get(item.actorId) || 'Unknown' : null,
        changes: item.changes as Record<string, { from: any; to: any }> | null,
        // Integrity Guard flags
        flagged: item.flagged,
        flagReasons: item.flagReasons,
      }))

      return {
        items: itemsWithActorNames,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }
    }),

  // Get members for filter dropdown
  getBandMembers: publicProcedure
    .input(z.object({
      bandId: z.string(),
    }))
    .query(async ({ input }) => {
      const members = await prisma.member.findMany({
        where: {
          bandId: input.bandId,
          status: 'ACTIVE',
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      })

      return {
        members: members.map(m => ({
          userId: m.user.id,
          name: m.user.name,
        })),
      }
    }),
})
