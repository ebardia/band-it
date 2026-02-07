import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { setAuditFlags, clearAuditFlags } from '../../lib/auditContext'
import { callAI, parseAIJson } from '../../lib/ai-client'
import { validateContent } from '../../services/validation.service'
import {
  claimChecklistItem,
  unclaimChecklistItem,
  submitChecklistForVerification,
  verifyChecklistItem,
  retryChecklistItem,
  updateChecklistContext,
  getClaimableChecklistItems,
} from './checklist.claim'
import {
  updateChecklistDeliverable,
  getChecklistDeliverable,
  attachFileToChecklistDeliverable,
  removeFileFromChecklistDeliverable,
} from './checklist.deliverable'
import { MIN_MEMBERS_TO_ACTIVATE } from '@band-it/shared'

// Roles that can use AI suggestions
const CAN_USE_AI = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const checklistRouter = router({
  // Micro-action procedures
  claim: claimChecklistItem,
  unclaim: unclaimChecklistItem,
  submit: submitChecklistForVerification,
  verify: verifyChecklistItem,
  retry: retryChecklistItem,
  updateContext: updateChecklistContext,
  getClaimable: getClaimableChecklistItems,

  // Deliverable procedures
  updateDeliverable: updateChecklistDeliverable,
  getDeliverable: getChecklistDeliverable,
  attachFileToDeliverable: attachFileToChecklistDeliverable,
  removeFileFromDeliverable: removeFileFromChecklistDeliverable,

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
          verifiedBy: {
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
      requiresDeliverable: z.boolean().optional(),
      userId: z.string(),
      // Integrity Guard flags
      proceedWithFlags: z.boolean().optional(),
      flagReasons: z.array(z.string()).optional(),
      flagDetails: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const { taskId, description, notes, assigneeId, dueDate, requiresDeliverable, userId, proceedWithFlags, flagReasons, flagDetails } = input

      // Set integrity flags in audit context if user proceeded with warnings
      if (proceedWithFlags && flagReasons && flagReasons.length > 0) {
        setAuditFlags({
          flagged: true,
          flagReasons,
          flagDetails,
        })
      }

      // Verify task exists and get band status
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { band: { select: { status: true } } }
      })
      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      }

      // Check if band is active (has minimum members)
      if (task.band.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Band must be active (${MIN_MEMBERS_TO_ACTIVATE}+ members) before creating checklist items`
        })
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
          requiresDeliverable: requiresDeliverable ?? false,
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
      skipValidation: z.boolean().optional(), // Allow skipping if already validated
    }))
    .mutation(async ({ input }) => {
      const { taskId, descriptions, userId, skipValidation } = input

      // Verify task exists and get band status
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { band: { select: { id: true, status: true } } }
      })
      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      }

      // Check if band is active (has minimum members)
      if (task.band.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Band must be active (${MIN_MEMBERS_TO_ACTIVATE}+ members) before creating checklist items`
        })
      }

      // Validate each description unless skipped (already validated at suggestion time)
      let validDescriptions = descriptions
      const blockedItems: string[] = []
      const flaggedItems: string[] = []

      if (!skipValidation) {
        const validationResults = await Promise.all(
          descriptions.map(async (description) => {
            try {
              const result = await validateContent({
                entityType: 'ChecklistItem',
                action: 'create',
                bandId: task.band.id,
                userId,
                data: { description },
                parentId: taskId,
              })
              return { description, result }
            } catch (error) {
              console.error('Validation error for:', description, error)
              return { description, result: { canProceed: true, issues: [] } }
            }
          })
        )

        // Filter out blocked items, track flagged ones
        validDescriptions = []
        for (const { description, result } of validationResults) {
          if (!result.canProceed) {
            blockedItems.push(description)
          } else {
            validDescriptions.push(description)
            if (result.issues.length > 0) {
              flaggedItems.push(description)
            }
          }
        }
      }

      if (validDescriptions.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'All items were blocked by validation. They may not align with the task scope.',
        })
      }

      // Get max order index
      const maxOrder = await prisma.checklistItem.findFirst({
        where: { taskId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true }
      })

      let startIndex = (maxOrder?.orderIndex ?? -1) + 1

      // Create valid items
      const createdItems = await Promise.all(
        validDescriptions.map((description, index) =>
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

      return {
        items: createdItems,
        blockedCount: blockedItems.length,
        flaggedCount: flaggedItems.length,
      }
    }),

  // Update a checklist item
  update: publicProcedure
    .input(z.object({
      itemId: z.string(),
      description: z.string().min(1).optional(),
      notes: z.string().nullable().optional(),
      assigneeId: z.string().nullable().optional(),
      dueDate: z.coerce.date().nullable().optional(),
      requiresDeliverable: z.boolean().optional(),
      userId: z.string(),
      // Integrity Guard flags
      proceedWithFlags: z.boolean().optional(),
      flagReasons: z.array(z.string()).optional(),
      flagDetails: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const { itemId, description, notes, assigneeId, dueDate, requiresDeliverable, userId, proceedWithFlags, flagReasons, flagDetails } = input

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
      if (requiresDeliverable !== undefined) updateData.requiresDeliverable = requiresDeliverable

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
      // Optional deliverable data to save when marking complete
      deliverable: z.object({
        summary: z.string().min(1),
        links: z.array(z.object({
          url: z.string().url(),
          title: z.string().min(1),
        })).optional(),
        nextSteps: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const { itemId, userId, deliverable } = input

      const item = await prisma.checklistItem.findUnique({
        where: { id: itemId },
        include: { deliverable: true },
      })
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })
      }

      const isMarkingComplete = !item.isCompleted

      // If marking complete and deliverable is required, validate it
      if (isMarkingComplete && item.requiresDeliverable) {
        const hasExistingDeliverable = item.deliverable && item.deliverable.summary.length >= 30
        const hasNewDeliverable = deliverable && deliverable.summary.length >= 30

        if (!hasExistingDeliverable && !hasNewDeliverable) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This item requires a deliverable summary (min 30 characters) before completing',
          })
        }
      }

      // If marking complete and deliverable provided, save it
      if (isMarkingComplete && deliverable) {
        await prisma.checklistItemDeliverable.upsert({
          where: { checklistItemId: itemId },
          create: {
            checklistItemId: itemId,
            createdById: userId,
            summary: deliverable.summary,
            links: deliverable.links || [],
            nextSteps: deliverable.nextSteps || null,
          },
          update: {
            summary: deliverable.summary,
            links: deliverable.links || [],
            nextSteps: deliverable.nextSteps || null,
          },
        })
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

      // Get task with full context including band mission and proposal
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          project: {
            include: {
              proposal: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  type: true,
                  problemStatement: true,
                  expectedOutcome: true,
                }
              }
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

      // Build context for AI - include full hierarchy
      const existingItems = task.checklistItems.map(i => `- ${i.description}`).join('\n')
      const band = task.band
      const project = task.project
      const proposal = project.proposal

      const taskContext = `
=== BAND CONTEXT ===
BAND NAME: ${band.name}
${band.mission ? `BAND MISSION: ${band.mission}` : ''}
${band.values ? `BAND VALUES: ${band.values}` : ''}
${band.description ? `BAND DESCRIPTION: ${band.description}` : ''}

=== PROPOSAL CONTEXT ===
${proposal ? `PROPOSAL TITLE: ${proposal.title}
PROPOSAL TYPE: ${proposal.type}
PROPOSAL DESCRIPTION: ${proposal.description || 'No description'}
${proposal.problemStatement ? `PROBLEM STATEMENT: ${proposal.problemStatement}` : ''}
${proposal.expectedOutcome ? `EXPECTED OUTCOME: ${proposal.expectedOutcome}` : ''}` : 'NO LINKED PROPOSAL'}

=== PROJECT CONTEXT ===
PROJECT NAME: ${project.name}
${project.description ? `PROJECT DESCRIPTION: ${project.description}` : ''}

=== TASK CONTEXT ===
TASK NAME: ${task.name}
TASK DESCRIPTION: ${task.description || 'No description provided'}
PRIORITY: ${task.priority}
${task.dueDate ? `DUE DATE: ${new Date(task.dueDate).toLocaleDateString()}` : ''}
${task.estimatedHours ? `ESTIMATED HOURS: ${task.estimatedHours}` : ''}

${existingItems ? `EXISTING CHECKLIST ITEMS:\n${existingItems}` : 'NO EXISTING CHECKLIST ITEMS'}
      `.trim()

      const systemPrompt = `Break down this task into checklist items that a regular person can pick up and complete without special expertise.

You are given the FULL CONTEXT of the organization hierarchy:
- BAND: The organization/group with its mission and purpose
- PROPOSAL: The approved initiative this work stems from
- PROJECT: The specific project containing this task
- TASK: The actual task needing checklist items

CONTEXT RULE — READ THE CONTEXT CAREFULLY and use it in every item:
- Use the band's actual name, the proposal's actual subject, and the project's actual domain
- Never use generic phrases like "the product", "the app", "target demographics", or "early adopters"
- If the band is called "Green Streets" building a recycling tracker, say "Green Streets" and "recycling tracker"
- Every item should make sense ONLY for this specific band and task — not for any random organization

CRITICAL RULE — every item must tell someone EXACTLY what to do:
- WRONG: "Research competitors" — research how? where? how many?
- RIGHT: "Google 'civic tech governance tools' and list the first 10 results with their URLs"
- WRONG: "Identify target demographics" — how would a volunteer do this?
- RIGHT: "Ask 5 people who run community groups: 'Would you use [band name] to manage decisions?' and write down their answers"
- WRONG: "Analyze competitor strategies"
- RIGHT: "Visit 5 competitor websites, screenshot their homepage, and note their pricing"
- WRONG: "Create user personas"
- RIGHT: "Write a 1-paragraph description of 3 types of people who might use [band name]"

Guidelines:
- Generate 3-10 items based on task complexity (small tasks need fewer items)
- Every item should be completable by someone with no background knowledge
- Include specifics: exact numbers, where to look, what to produce
- Start with concrete verbs: Google, List, Ask, Visit, Write, Call, Email, Post, Screenshot, Find, Count, Read, Download
- AVOID abstract verbs: Research, Identify, Analyze, Develop, Assess, Evaluate, Strategize, Define, Document, Compile, Determine
- Items should be ordered logically (what to do first, second, etc.)
- Keep descriptions short (under 100 characters ideally)
- Do NOT suggest items that duplicate existing ones
- If all necessary checklist items already exist, return an empty array []

Respond with a JSON array of strings. Return only the JSON array, no other text.`

      try {
        const response = await callAI(
          `Please suggest checklist items for this task:\n\n${taskContext}`,
          {
            operation: 'checklist_suggestions',
            entityType: 'task',
            entityId: taskId,
            bandId: task.band.id,
            userId,
          },
          {
            system: systemPrompt,
            maxTokens: 1500,
          }
        )

        // Parse JSON response - try parseAIJson first, then fallback to regex extraction
        let suggestions = parseAIJson<string[]>(response.content)

        if (!suggestions) {
          // Try to extract JSON array from response if wrapped in other text
          const jsonMatch = response.content.match(/\[[\s\S]*?\]/)
          if (jsonMatch) {
            try {
              suggestions = JSON.parse(jsonMatch[0])
            } catch {
              // Fall through to error
            }
          }
        }

        if (!suggestions || !Array.isArray(suggestions)) {
          console.error('Failed to parse AI response:', response.content)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to parse AI response'
          })
        }

        // Filter out empty strings, ensure all items are strings, and trim
        const trimmedSuggestions = suggestions
          .filter(s => typeof s === 'string')
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .slice(0, 10) // Cap at 10 items

        // Validate each suggestion against the task scope
        const validatedSuggestions = await Promise.all(
          trimmedSuggestions.map(async (description) => {
            try {
              const validationResult = await validateContent({
                entityType: 'ChecklistItem',
                action: 'create',
                bandId: task.band.id,
                userId,
                data: { description },
                parentId: taskId,
              })

              return {
                description,
                validation: {
                  canProceed: validationResult.canProceed,
                  issues: validationResult.issues,
                },
              }
            } catch (error) {
              // If validation fails, allow but mark as unknown
              console.error('Validation error for suggestion:', description, error)
              return {
                description,
                validation: {
                  canProceed: true,
                  issues: [],
                },
              }
            }
          })
        )

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