import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { formatAuditDescription, getAuditCategory, AUDIT_CATEGORIES, AuditCategory } from '../../lib/audit-formatter'

// Map categories to entity types for filtering
const CATEGORY_TO_ENTITY_TYPES: Record<AuditCategory, string[]> = {
  membership: ['Member'],
  voting: ['Vote'],
  proposals: ['Proposal'],
  projects: ['Project'],
  tasks: ['Task', 'ChecklistItem'],
  events: ['Event', 'EventRSVP', 'EventAttendance'],
  settings: ['Band'], // Will also filter by changes containing settings fields
  other: ['Band', 'Comment', 'File', 'Channel', 'Message'],
}

export const auditRouter = router({
  list: publicProcedure
    .input(z.object({
      bandId: z.string(),
      category: z.enum(['membership', 'voting', 'proposals', 'projects', 'tasks', 'events', 'settings', 'other']).optional(),
      entityType: z.string().optional(),
      actorId: z.string().optional(),
      action: z.string().optional(),
      daysBack: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(25),
    }))
    .query(async ({ input }) => {
      const { bandId, category, entityType, actorId, action, daysBack, page, pageSize } = input

      // Build where clause
      const where: any = { bandId }

      // Category filter takes precedence over entityType
      if (category) {
        const entityTypes = CATEGORY_TO_ENTITY_TYPES[category]
        if (entityTypes && entityTypes.length > 0) {
          where.entityType = { in: entityTypes }
        }
      } else if (entityType) {
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

      // Map items with actor names and formatted descriptions
      const itemsWithDescriptions = items.map(item => {
        const actorName = item.actorId ? actorMap.get(item.actorId) || 'Unknown' : null
        const changes = item.changes as Record<string, { from: any; to: any }> | null

        const formatted = formatAuditDescription({
          action: item.action,
          entityType: item.entityType,
          entityId: item.entityId,
          entityName: item.entityName,
          actorName,
          changes,
        })

        return {
          id: item.id,
          createdAt: item.createdAt,
          description: formatted.description,
          category: formatted.category,
          // Keep raw data for advanced filtering/debugging
          action: item.action,
          entityType: item.entityType,
          entityId: item.entityId,
          entityName: item.entityName,
          actorId: item.actorId,
          actorName,
          changes,
          // Integrity Guard flags
          flagged: item.flagged,
          flagReasons: item.flagReasons,
        }
      })

      // For category filter, do post-filtering to ensure we only return items of that category
      // (This handles cases like 'settings' where we need to check the changes object)
      const filteredItems = category
        ? itemsWithDescriptions.filter(item => item.category === category)
        : itemsWithDescriptions

      return {
        items: filteredItems,
        total: category ? filteredItems.length : total,
        page,
        pageSize,
        totalPages: Math.ceil((category ? filteredItems.length : total) / pageSize),
      }
    }),

  // Get available categories
  getCategories: publicProcedure
    .query(() => {
      return { categories: AUDIT_CATEGORIES }
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
