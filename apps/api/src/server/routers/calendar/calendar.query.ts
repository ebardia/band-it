import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { RRule } from 'rrule'

// Calendar item types
export type CalendarItemType =
  | 'EVENT'
  | 'PROPOSAL_DEADLINE'
  | 'PROJECT_TARGET'
  | 'TASK_DUE'
  | 'CHECKLIST_DUE'

// Color scheme for each type
export const CALENDAR_COLORS: Record<CalendarItemType, string> = {
  EVENT: '#3B82F6',           // Blue
  PROPOSAL_DEADLINE: '#8B5CF6', // Purple
  PROJECT_TARGET: '#10B981',   // Green
  TASK_DUE: '#F59E0B',        // Orange/Amber
  CHECKLIST_DUE: '#6B7280',   // Gray
}

export interface CalendarItem {
  id: string
  type: CalendarItemType
  title: string
  subtitle?: string
  date: Date
  endDate?: Date
  allDay: boolean
  bandId: string
  bandName: string
  bandSlug: string
  sourceUrl: string
  color: string
  metadata: {
    eventType?: string
    status?: string
    priority?: string
    isOverdue?: boolean
    isRecurring?: boolean
    recurrenceDescription?: string
    hasNotes?: boolean
    hasRecordings?: boolean
  }
}

/**
 * Expand recurring events into individual occurrences
 * Capped at 6 months from today
 */
function expandRecurringEvent(
  event: {
    id: string
    title: string
    startTime: Date
    endTime: Date
    recurrenceRule: string | null
    recurrenceEndDate: Date | null
    meetingNotes: string | null
    recordingLinks: any
    bandId: string
    band: { name: string; slug: string }
    eventType: string
  },
  rangeStart: Date,
  rangeEnd: Date
): CalendarItem[] {
  const hasNotes = !!event.meetingNotes
  const hasRecordings = Array.isArray(event.recordingLinks) && event.recordingLinks.length > 0
  const items: CalendarItem[] = []
  const eventDuration = event.endTime.getTime() - event.startTime.getTime()

  // Cap at 6 months from today
  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + 6)
  const effectiveEnd = new Date(Math.min(rangeEnd.getTime(), maxDate.getTime()))

  if (event.recurrenceEndDate) {
    const recurrenceEnd = new Date(event.recurrenceEndDate)
    if (recurrenceEnd < effectiveEnd) {
      // Use recurrence end date if it's before our cap
    }
  }

  if (!event.recurrenceRule) {
    // Non-recurring event
    if (event.startTime >= rangeStart && event.startTime <= effectiveEnd) {
      items.push({
        id: event.id,
        type: 'EVENT',
        title: event.title,
        subtitle: event.band.name,
        date: event.startTime,
        endDate: event.endTime,
        allDay: false,
        bandId: event.bandId,
        bandName: event.band.name,
        bandSlug: event.band.slug,
        sourceUrl: `/bands/${event.band.slug}/calendar/${event.id}`,
        color: CALENDAR_COLORS.EVENT,
        metadata: {
          eventType: event.eventType,
          hasNotes,
          hasRecordings,
        },
      })
    }
    return items
  }

  // Parse and expand recurring event
  try {
    const rule = RRule.fromString(event.recurrenceRule)

    // Set the dtstart if not already set
    const options = {
      ...rule.options,
      dtstart: event.startTime,
    }

    const rrule = new RRule(options)

    // Get occurrences within range (with recurrence end date if set)
    const until = event.recurrenceEndDate
      ? new Date(Math.min(effectiveEnd.getTime(), event.recurrenceEndDate.getTime()))
      : effectiveEnd

    const occurrences = rrule.between(rangeStart, until, true)

    for (const occurrence of occurrences) {
      const occurrenceEnd = new Date(occurrence.getTime() + eventDuration)

      items.push({
        id: `${event.id}_${occurrence.toISOString()}`,
        type: 'EVENT',
        title: event.title,
        subtitle: event.band.name,
        date: occurrence,
        endDate: occurrenceEnd,
        allDay: false,
        bandId: event.bandId,
        bandName: event.band.name,
        bandSlug: event.band.slug,
        sourceUrl: `/bands/${event.band.slug}/calendar/${event.id}`,
        color: CALENDAR_COLORS.EVENT,
        metadata: {
          eventType: event.eventType,
          isRecurring: true,
          recurrenceDescription: rule.toText(),
          hasNotes,
          hasRecordings,
        },
      })
    }
  } catch (e) {
    console.error(`Failed to parse recurrence rule for event ${event.id}:`, e)
    // Fall back to single occurrence
    if (event.startTime >= rangeStart && event.startTime <= effectiveEnd) {
      items.push({
        id: event.id,
        type: 'EVENT',
        title: event.title,
        subtitle: event.band.name,
        date: event.startTime,
        endDate: event.endTime,
        allDay: false,
        bandId: event.bandId,
        bandName: event.band.name,
        bandSlug: event.band.slug,
        sourceUrl: `/bands/${event.band.slug}/calendar/${event.id}`,
        color: CALENDAR_COLORS.EVENT,
        metadata: {
          eventType: event.eventType,
          hasNotes,
          hasRecordings,
        },
      })
    }
  }

  return items
}

/**
 * Get all calendar items for a user within a date range
 */
export const getCalendarItems = publicProcedure
  .input(z.object({
    userId: z.string(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    // Filters
    includeEvents: z.boolean().default(true),
    includeProposals: z.boolean().default(true),
    includeProjects: z.boolean().default(true),
    includeTasks: z.boolean().default(true),
    includeChecklists: z.boolean().default(true),
    // Optional band filter
    bandId: z.string().optional(),
  }))
  .query(async ({ input }) => {
    const {
      userId,
      startDate,
      endDate,
      includeEvents,
      includeProposals,
      includeProjects,
      includeTasks,
      includeChecklists,
      bandId,
    } = input

    const rangeStart = new Date(startDate)
    const rangeEnd = new Date(endDate)
    const now = new Date()

    // Get user's active band memberships
    const memberships = await prisma.member.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        ...(bandId && { bandId }),
      },
      select: { bandId: true },
    })

    const bandIds = memberships.map(m => m.bandId)

    if (bandIds.length === 0) {
      return { items: [] }
    }

    const items: CalendarItem[] = []

    // Fetch all data sources in parallel
    const [events, proposals, projects, tasks, checklistItems] = await Promise.all([
      // Events
      includeEvents
        ? prisma.event.findMany({
            where: {
              bandId: { in: bandIds },
              isCancelled: false,
              parentEventId: null, // Only main events
              OR: [
                // Non-recurring events in range
                {
                  recurrenceRule: null,
                  startTime: { gte: rangeStart, lte: rangeEnd },
                },
                // Recurring events that might have occurrences in range
                {
                  recurrenceRule: { not: null },
                  startTime: { lte: rangeEnd },
                  OR: [
                    { recurrenceEndDate: null },
                    { recurrenceEndDate: { gte: rangeStart } },
                  ],
                },
              ],
            },
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              eventType: true,
              recurrenceRule: true,
              recurrenceEndDate: true,
              meetingNotes: true,
              recordingLinks: true,
              bandId: true,
              band: {
                select: { name: true, slug: true },
              },
            },
          })
        : [],

      // Proposals with voting deadlines
      includeProposals
        ? prisma.proposal.findMany({
            where: {
              bandId: { in: bandIds },
              status: 'OPEN',
              votingEndsAt: {
                gte: rangeStart,
                lte: rangeEnd,
              },
            },
            select: {
              id: true,
              title: true,
              votingEndsAt: true,
              status: true,
              bandId: true,
              band: {
                select: { name: true, slug: true },
              },
            },
          })
        : [],

      // Projects with target dates
      includeProjects
        ? prisma.project.findMany({
            where: {
              bandId: { in: bandIds },
              status: { notIn: ['COMPLETED', 'CANCELLED'] },
              targetDate: {
                gte: rangeStart,
                lte: rangeEnd,
              },
            },
            select: {
              id: true,
              name: true,
              targetDate: true,
              status: true,
              priority: true,
              bandId: true,
              band: {
                select: { name: true, slug: true },
              },
            },
          })
        : [],

      // Tasks with due dates (assigned to user or unassigned in their bands)
      includeTasks
        ? prisma.task.findMany({
            where: {
              bandId: { in: bandIds },
              status: { notIn: ['COMPLETED', 'BLOCKED'] },
              dueDate: {
                gte: rangeStart,
                lte: rangeEnd,
              },
              OR: [
                { assigneeId: userId },
                { assigneeId: null }, // Unassigned tasks visible to all
              ],
            },
            select: {
              id: true,
              name: true,
              dueDate: true,
              status: true,
              priority: true,
              projectId: true,
              bandId: true,
              band: {
                select: { name: true, slug: true },
              },
              project: {
                select: { name: true },
              },
            },
          })
        : [],

      // Checklist items with due dates (assigned to user or unassigned)
      includeChecklists
        ? prisma.checklistItem.findMany({
            where: {
              task: {
                bandId: { in: bandIds },
              },
              isCompleted: false,
              dueDate: {
                gte: rangeStart,
                lte: rangeEnd,
              },
              OR: [
                { assigneeId: userId },
                { assigneeId: null },
              ],
            },
            select: {
              id: true,
              description: true,
              dueDate: true,
              priority: true,
              taskId: true,
              task: {
                select: {
                  name: true,
                  projectId: true,
                  bandId: true,
                  band: {
                    select: { name: true, slug: true },
                  },
                },
              },
            },
          })
        : [],
    ])

    // Transform events (with recurrence expansion)
    for (const event of events) {
      const expandedEvents = expandRecurringEvent(event, rangeStart, rangeEnd)
      items.push(...expandedEvents)
    }

    // Transform proposals
    for (const proposal of proposals) {
      if (proposal.votingEndsAt) {
        items.push({
          id: proposal.id,
          type: 'PROPOSAL_DEADLINE',
          title: `Vote: ${proposal.title}`,
          subtitle: proposal.band.name,
          date: proposal.votingEndsAt,
          allDay: true,
          bandId: proposal.bandId,
          bandName: proposal.band.name,
          bandSlug: proposal.band.slug,
          sourceUrl: `/bands/${proposal.band.slug}/proposals/${proposal.id}`,
          color: CALENDAR_COLORS.PROPOSAL_DEADLINE,
          metadata: {
            status: proposal.status,
            isOverdue: proposal.votingEndsAt < now,
          },
        })
      }
    }

    // Transform projects
    for (const project of projects) {
      if (project.targetDate) {
        items.push({
          id: project.id,
          type: 'PROJECT_TARGET',
          title: project.name,
          subtitle: project.band.name,
          date: project.targetDate,
          allDay: true,
          bandId: project.bandId,
          bandName: project.band.name,
          bandSlug: project.band.slug,
          sourceUrl: `/bands/${project.band.slug}/projects/${project.id}`,
          color: CALENDAR_COLORS.PROJECT_TARGET,
          metadata: {
            status: project.status,
            priority: project.priority,
            isOverdue: project.targetDate < now,
          },
        })
      }
    }

    // Transform tasks
    for (const task of tasks) {
      if (task.dueDate) {
        items.push({
          id: task.id,
          type: 'TASK_DUE',
          title: task.name,
          subtitle: `${task.band.name} - ${task.project.name}`,
          date: task.dueDate,
          allDay: true,
          bandId: task.bandId,
          bandName: task.band.name,
          bandSlug: task.band.slug,
          sourceUrl: `/bands/${task.band.slug}/projects/${task.projectId}?task=${task.id}`,
          color: CALENDAR_COLORS.TASK_DUE,
          metadata: {
            status: task.status,
            priority: task.priority,
            isOverdue: task.dueDate < now,
          },
        })
      }
    }

    // Transform checklist items
    for (const item of checklistItems) {
      if (item.dueDate) {
        items.push({
          id: item.id,
          type: 'CHECKLIST_DUE',
          title: item.description,
          subtitle: `${item.task.band.name} - ${item.task.name}`,
          date: item.dueDate,
          allDay: true,
          bandId: item.task.bandId,
          bandName: item.task.band.name,
          bandSlug: item.task.band.slug,
          sourceUrl: `/bands/${item.task.band.slug}/projects/${item.task.projectId}?task=${item.taskId}`,
          color: CALENDAR_COLORS.CHECKLIST_DUE,
          metadata: {
            priority: item.priority,
            isOverdue: item.dueDate < now,
          },
        })
      }
    }

    // Sort by date
    items.sort((a, b) => a.date.getTime() - b.date.getTime())

    return { items }
  })

/**
 * Get upcoming deadlines for dashboard widget
 */
export const getUpcomingDeadlines = publicProcedure
  .input(z.object({
    userId: z.string(),
    limit: z.number().min(1).max(20).default(5),
    bandId: z.string().optional(),
  }))
  .query(async ({ input }) => {
    const { userId, limit, bandId } = input
    const now = new Date()

    // Get 30 days ahead for deadlines
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 30)

    // Use getCalendarItems logic but exclude events and limit results
    const memberships = await prisma.member.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        ...(bandId && { bandId }),
      },
      select: { bandId: true },
    })

    const bandIds = memberships.map(m => m.bandId)

    if (bandIds.length === 0) {
      return { deadlines: [] }
    }

    const items: CalendarItem[] = []

    // Fetch deadline sources in parallel
    const [proposals, projects, tasks, checklistItems] = await Promise.all([
      // Proposals
      prisma.proposal.findMany({
        where: {
          bandId: { in: bandIds },
          status: 'OPEN',
          votingEndsAt: {
            gte: now,
            lte: endDate,
          },
        },
        select: {
          id: true,
          title: true,
          votingEndsAt: true,
          status: true,
          bandId: true,
          band: {
            select: { name: true, slug: true },
          },
        },
        orderBy: { votingEndsAt: 'asc' },
      }),

      // Projects
      prisma.project.findMany({
        where: {
          bandId: { in: bandIds },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          targetDate: {
            gte: now,
            lte: endDate,
          },
        },
        select: {
          id: true,
          name: true,
          targetDate: true,
          status: true,
          priority: true,
          bandId: true,
          band: {
            select: { name: true, slug: true },
          },
        },
        orderBy: { targetDate: 'asc' },
      }),

      // Tasks
      prisma.task.findMany({
        where: {
          bandId: { in: bandIds },
          status: { notIn: ['COMPLETED', 'BLOCKED'] },
          dueDate: {
            gte: now,
            lte: endDate,
          },
          OR: [
            { assigneeId: userId },
            { assigneeId: null },
          ],
        },
        select: {
          id: true,
          name: true,
          dueDate: true,
          status: true,
          priority: true,
          projectId: true,
          bandId: true,
          band: {
            select: { name: true, slug: true },
          },
          project: {
            select: { name: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),

      // Checklist items
      prisma.checklistItem.findMany({
        where: {
          task: {
            bandId: { in: bandIds },
          },
          isCompleted: false,
          dueDate: {
            gte: now,
            lte: endDate,
          },
          OR: [
            { assigneeId: userId },
            { assigneeId: null },
          ],
        },
        select: {
          id: true,
          description: true,
          dueDate: true,
          priority: true,
          taskId: true,
          task: {
            select: {
              name: true,
              projectId: true,
              bandId: true,
              band: {
                select: { name: true, slug: true },
              },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
    ])

    // Transform all items
    for (const proposal of proposals) {
      if (proposal.votingEndsAt) {
        items.push({
          id: proposal.id,
          type: 'PROPOSAL_DEADLINE',
          title: `Vote: ${proposal.title}`,
          subtitle: proposal.band.name,
          date: proposal.votingEndsAt,
          allDay: true,
          bandId: proposal.bandId,
          bandName: proposal.band.name,
          bandSlug: proposal.band.slug,
          sourceUrl: `/bands/${proposal.band.slug}/proposals/${proposal.id}`,
          color: CALENDAR_COLORS.PROPOSAL_DEADLINE,
          metadata: {
            status: proposal.status,
          },
        })
      }
    }

    for (const project of projects) {
      if (project.targetDate) {
        items.push({
          id: project.id,
          type: 'PROJECT_TARGET',
          title: project.name,
          subtitle: project.band.name,
          date: project.targetDate,
          allDay: true,
          bandId: project.bandId,
          bandName: project.band.name,
          bandSlug: project.band.slug,
          sourceUrl: `/bands/${project.band.slug}/projects/${project.id}`,
          color: CALENDAR_COLORS.PROJECT_TARGET,
          metadata: {
            status: project.status,
            priority: project.priority,
          },
        })
      }
    }

    for (const task of tasks) {
      if (task.dueDate) {
        items.push({
          id: task.id,
          type: 'TASK_DUE',
          title: task.name,
          subtitle: `${task.band.name} - ${task.project.name}`,
          date: task.dueDate,
          allDay: true,
          bandId: task.bandId,
          bandName: task.band.name,
          bandSlug: task.band.slug,
          sourceUrl: `/bands/${task.band.slug}/projects/${task.projectId}?task=${task.id}`,
          color: CALENDAR_COLORS.TASK_DUE,
          metadata: {
            status: task.status,
            priority: task.priority,
          },
        })
      }
    }

    for (const item of checklistItems) {
      if (item.dueDate) {
        items.push({
          id: item.id,
          type: 'CHECKLIST_DUE',
          title: item.description,
          subtitle: `${item.task.band.name} - ${item.task.name}`,
          date: item.dueDate,
          allDay: true,
          bandId: item.task.bandId,
          bandName: item.task.band.name,
          bandSlug: item.task.band.slug,
          sourceUrl: `/bands/${item.task.band.slug}/projects/${item.task.projectId}?task=${item.taskId}`,
          color: CALENDAR_COLORS.CHECKLIST_DUE,
          metadata: {
            priority: item.priority,
          },
        })
      }
    }

    // Sort by date and limit
    items.sort((a, b) => a.date.getTime() - b.date.getTime())
    const deadlines = items.slice(0, limit)

    return { deadlines }
  })
