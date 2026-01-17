import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'
import { setAuditFlags, clearAuditFlags } from '../../lib/auditContext'

const anthropic = new Anthropic()

// Roles that can use AI suggestions
const CAN_USE_AI = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const checklistRouter = router({
  // Get a single checklist item by ID
  getById: publicProcedure
    .input(z.object({
      itemId: z.string(),
    }))
    .query(async ({ input }) => {
      const { itemId } = input

      const item = await prisma.checklistItem.findUnique({
        where: { id: itemId },
        include: {
          completedBy: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, name: true }
          },
          files: {
            include: {
              uploadedBy: {
                select: { id: true, name: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          task: {
            include: {
              project: {
                select: { id: true, name: true }
              },
              band: {
                include: {
                  members: {
                    where: { status: 'ACTIVE' },
                    include: {
                      user: {
                        select: { id: true, name: true, email: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
      }

      return { item }
    }),

  // Get checklist items for a task
  getByTask: publicProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .query(async ({ input }) => {
      const { taskId } = input

      const items = await prisma.checklistItem.findMany({
        where: { taskId },
        include: {
          completedBy: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, name: true }
          },
          files: {
            select: { id: true }
          }
        },
        orderBy: { orderIndex: 'asc' }
      })

      return { items }
    }),

  // Create a checklist item
  create: publicProcedure
    .input(z.object({
      taskId: z.string(),
      description: z.string().min(1, 'Description is required'),
      notes: z.string().optional(),
      assigneeId: z.string().optional(),
      dueDate: z.coerce.date().optional(),
      userId: z.string(),
      // Integrity Guard flags
      proceedWithFlags: z.boolean().optional(),
      flagReasons: z.array(z.string()).optional(),
      flagDetails: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const { taskId, description, notes, assigneeId, dueDate, userId, proceedWithFlags, flagReasons, flagDetails } = input

      // Set integrity flags in audit context if user proceeded with warnings
      if (proceedWithFlags && flagReasons && flagReasons.length > 0) {
        setAuditFlags({
          flagged: true,
          flagReasons,
          flagDetails,
        })
      }

      // Verify task exists
      const task = await prisma.task.findUnique({ where: { id: taskId } })
      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      }

      // Get max order index
      const maxOrder = await prisma.checklistItem.findFirst({
        where: { taskId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true }
      })

      const item = await prisma.checklistItem.create({
        data: {
          taskId,
          description,
          notes,
          assigneeId,
          dueDate,
          orderIndex: (maxOrder?.orderIndex ?? -1) + 1,
        },
        include: {
          completedBy: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, name: true }
          }
        }
      })

      // Clear flags to prevent leaking to other operations
      clearAuditFlags()

      return { item }
    }),

  // Bulk create checklist items (for AI suggestions)
  createMany: publicProcedure
    .input(z.object({
      taskId: z.string(),
      descriptions: z.array(z.string().min(1)),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { taskId, descriptions, userId } = input

      // Verify task exists
      const task = await prisma.task.findUnique({ where: { id: taskId } })
      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      }

      // Get max order index
      const maxOrder = await prisma.checklistItem.findFirst({
        where: { taskId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true }
      })

      let startIndex = (maxOrder?.orderIndex ?? -1) + 1

      // Create all items
      const createdItems = await Promise.all(
        descriptions.map((description, index) =>
          prisma.checklistItem.create({
            data: {
              taskId,
              description,
              orderIndex: startIndex + index,
            },
            include: {
              completedBy: {
                select: { id: true, name: true }
              },
              assignee: {
                select: { id: true, name: true }
              }
            }
          })
        )
      )

      return { items: createdItems }
    }),

  // Update a checklist item
  update: publicProcedure
    .input(z.object({
      itemId: z.string(),
      description: z.string().min(1).optional(),
      notes: z.string().nullable().optional(),
      assigneeId: z.string().nullable().optional(),
      dueDate: z.coerce.date().nullable().optional(),
      userId: z.string(),
      // Integrity Guard flags
      proceedWithFlags: z.boolean().optional(),
      flagReasons: z.array(z.string()).optional(),
      flagDetails: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const { itemId, description, notes, assigneeId, dueDate, userId, proceedWithFlags, flagReasons, flagDetails } = input

      // Set integrity flags in audit context if user proceeded with warnings
      if (proceedWithFlags && flagReasons && flagReasons.length > 0) {
        setAuditFlags({
          flagged: true,
          flagReasons,
          flagDetails,
        })
      }

      const item = await prisma.checklistItem.findUnique({ where: { id: itemId } })
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
      }

      const updateData: any = {}
      if (description !== undefined) updateData.description = description
      if (notes !== undefined) updateData.notes = notes
      if (assigneeId !== undefined) updateData.assigneeId = assigneeId
      if (dueDate !== undefined) updateData.dueDate = dueDate

      const updatedItem = await prisma.checklistItem.update({
        where: { id: itemId },
        data: updateData,
        include: {
          completedBy: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, name: true }
          },
          files: {
            include: {
              uploadedBy: {
                select: { id: true, name: true }
              }
            }
          }
        }
      })

      // Clear flags to prevent leaking to other operations
      clearAuditFlags()

      return { item: updatedItem }
    }),

  // Toggle completion
  toggle: publicProcedure
    .input(z.object({
      itemId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { itemId, userId } = input

      const item = await prisma.checklistItem.findUnique({ where: { id: itemId } })
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
      }

      const updatedItem = await prisma.checklistItem.update({
        where: { id: itemId },
        data: {
          isCompleted: !item.isCompleted,
          completedById: !item.isCompleted ? userId : null,
          completedAt: !item.isCompleted ? new Date() : null,
        },
        include: {
          completedBy: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, name: true }
          }
        }
      })

      return { item: updatedItem }
    }),

  // Delete a checklist item
  delete: publicProcedure
    .input(z.object({
      itemId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { itemId } = input

      const item = await prisma.checklistItem.findUnique({ where: { id: itemId } })
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
      }

      await prisma.checklistItem.delete({ where: { id: itemId } })

      return { success: true }
    }),

  // Reorder checklist items
  reorder: publicProcedure
    .input(z.object({
      taskId: z.string(),
      itemIds: z.array(z.string()),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { taskId, itemIds } = input

      // Update order for each item
      await Promise.all(
        itemIds.map((id, index) =>
          prisma.checklistItem.update({
            where: { id },
            data: { orderIndex: index }
          })
        )
      )

      const items = await prisma.checklistItem.findMany({
        where: { taskId },
        include: {
          completedBy: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, name: true }
          }
        },
        orderBy: { orderIndex: 'asc' }
      })

      return { items }
    }),

  // AI: Suggest checklist items for a task
  suggestItems: publicProcedure
    .input(z.object({
      taskId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { taskId, userId } = input

      // Get task with full context
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
            }
          },
          band: {
            include: {
              members: {
                where: { status: 'ACTIVE' },
                include: { user: true }
              }
            }
          },
          checklistItems: {
            select: { description: true }
          }
        }
      })

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found'
        })
      }

      // Check user has permission
      const member = task.band.members.find(m => m.userId === userId)
      if (!member || !CAN_USE_AI.includes(member.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to use AI features'
        })
      }

      // Build context for AI
      const existingItems = task.checklistItems.map(i => `- ${i.description}`).join('\n')

      const taskContext = `
TASK NAME: ${task.name}

TASK DESCRIPTION:
${task.description || 'No description provided'}

PROJECT: ${task.project.name}
${task.project.description ? `PROJECT DESCRIPTION: ${task.project.description}` : ''}

PRIORITY: ${task.priority}
${task.dueDate ? `DUE DATE: ${new Date(task.dueDate).toLocaleDateString()}` : ''}
${task.estimatedHours ? `ESTIMATED HOURS: ${task.estimatedHours}` : ''}

${existingItems ? `EXISTING CHECKLIST ITEMS:\n${existingItems}` : 'NO EXISTING CHECKLIST ITEMS'}
      `.trim()

      const systemPrompt = `You are a task management expert helping someone break down a task into simple, actionable checklist items.

A "checklist item" is a small, specific step that can be checked off. Think of it like a to-do within a to-do.

Your job is to suggest 3-8 checklist items that would help complete this task. Consider any existing items and don't duplicate them.

RULES:
1. Each item should be a single, specific action (not a complex sub-task)
2. Items should be ordered logically (what to do first, second, etc.)
3. Keep item descriptions short and actionable (under 100 characters ideally)
4. Start with verbs: "Call...", "Send...", "Review...", "Draft...", "Schedule...", etc.
5. Don't suggest items that duplicate existing ones
6. Be practical and specific to the task at hand

Respond with a JSON array of strings, where each string is a checklist item description.

Example response:
[
  "Review existing documentation",
  "Draft initial outline",
  "Schedule meeting with stakeholders",
  "Send outline for feedback",
  "Incorporate feedback and finalize"
]

Respond ONLY with the JSON array, no other text.`

      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `Please suggest checklist items for this task:\n\n${taskContext}`
            }
          ],
          system: systemPrompt,
        })

        // Extract text from response
        const textContent = response.content.find(c => c.type === 'text')
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text response from AI')
        }

        // Parse JSON response
        let suggestions: string[]
        try {
          // Clean up response (remove markdown code blocks if present)
          let jsonText = textContent.text.trim()
          if (jsonText.startsWith('```json')) {
            jsonText = jsonText.slice(7)
          }
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.slice(3)
          }
          if (jsonText.endsWith('```')) {
            jsonText = jsonText.slice(0, -3)
          }
          suggestions = JSON.parse(jsonText.trim())
        } catch (parseError) {
          console.error('Failed to parse AI response:', textContent.text)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to parse AI response'
          })
        }

        // Validate suggestions structure
        if (!Array.isArray(suggestions) || !suggestions.every(s => typeof s === 'string')) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Invalid AI response format'
          })
        }

        // Filter out empty strings and trim
        const validatedSuggestions = suggestions
          .map(s => s.trim())
          .filter(s => s.length > 0)

        return {
          suggestions: validatedSuggestions,
          taskName: task.name
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error

        console.error('AI checklist suggestion error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate checklist suggestions'
        })
      }
    }),
})