import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// Roles that can use AI suggestions
const CAN_USE_AI = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const suggestChecklistItems = publicProcedure
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
  })