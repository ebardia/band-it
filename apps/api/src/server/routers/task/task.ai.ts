import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// Roles that can use AI suggestions
const CAN_USE_AI = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const suggestTasks = publicProcedure
  .input(z.object({
    projectId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { projectId, userId } = input

    // Get project with full details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              include: { user: true }
            }
          }
        },
        proposal: true,
        tasks: {
          select: {
            id: true,
            name: true,
            status: true,
            description: true,
          }
        }
      }
    })

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found'
      })
    }

    // Check user has permission
    const member = project.band.members.find(m => m.userId === userId)
    if (!member || !CAN_USE_AI.includes(member.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to use AI features'
      })
    }

    // Build context for AI
    const existingTasks = project.tasks.map(t => `- ${t.name} (${t.status})`).join('\n')
    
    const projectContext = `
PROJECT NAME: ${project.name}

PROJECT DESCRIPTION:
${project.description || 'No description provided'}

${project.deliverables ? `DELIVERABLES:\n${project.deliverables}\n` : ''}
${project.successCriteria ? `SUCCESS CRITERIA:\n${project.successCriteria}\n` : ''}
${project.estimatedBudget ? `BUDGET: $${project.estimatedBudget}\n` : ''}
${project.estimatedHours ? `ESTIMATED HOURS: ${project.estimatedHours}\n` : ''}
${project.startDate ? `START DATE: ${new Date(project.startDate).toLocaleDateString()}\n` : ''}
${project.targetDate ? `TARGET DATE: ${new Date(project.targetDate).toLocaleDateString()}\n` : ''}

ORIGINAL PROPOSAL:
${project.proposal.title}
${project.proposal.description}

${existingTasks ? `EXISTING TASKS:\n${existingTasks}` : 'NO EXISTING TASKS YET'}
    `.trim()

    const systemPrompt = `You are a project management expert helping a community band break down a project into actionable tasks.

A "task" is a specific, actionable item that one person can complete. Tasks should be concrete and verifiable.

Your job is to suggest 3-7 tasks that would help accomplish this project's goals. Consider any existing tasks and don't duplicate them.

RULES:
1. Each task should be specific and actionable (something one person can do)
2. Tasks should be ordered logically (dependencies/prerequisites first)
3. Task names should be concise action items (under 100 characters)
4. Task descriptions should be 1-2 sentences explaining what needs to be done
5. Consider the project timeline and budget when estimating effort
6. Don't suggest tasks that duplicate existing ones
7. Include a mix of planning, execution, and verification tasks as appropriate

Respond with a JSON array of task suggestions. Each object should have:
- name: string (task name, action-oriented)
- description: string (1-2 sentences)
- estimatedHours: number (rough estimate, can be null)
- priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
- order: number (execution order, 1 = first)
- requiresVerification: boolean (does this need proof/sign-off?)

Example response:
[
  {
    "name": "Research local suppliers for materials",
    "description": "Identify and compare at least 3 local suppliers. Document pricing, availability, and delivery options.",
    "estimatedHours": 4,
    "priority": "HIGH",
    "order": 1,
    "requiresVerification": true
  },
  {
    "name": "Create project timeline and milestones",
    "description": "Break down the project into weekly milestones with specific deliverables for each phase.",
    "estimatedHours": 2,
    "priority": "MEDIUM",
    "order": 2,
    "requiresVerification": false
  }
]

Respond ONLY with the JSON array, no other text.`

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Please analyze this project and suggest tasks to help complete it:\n\n${projectContext}`
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
      let suggestions
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
      if (!Array.isArray(suggestions)) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Invalid AI response format'
        })
      }

      // Ensure each suggestion has required fields
      const validatedSuggestions = suggestions.map((s: any, index: number) => ({
        name: s.name || `Task ${index + 1}`,
        description: s.description || '',
        estimatedHours: typeof s.estimatedHours === 'number' ? s.estimatedHours : null,
        priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(s.priority) ? s.priority : 'MEDIUM',
        order: s.order || index + 1,
        requiresVerification: typeof s.requiresVerification === 'boolean' ? s.requiresVerification : true,
      }))

      return { 
        suggestions: validatedSuggestions,
        projectName: project.name 
      }

    } catch (error) {
      if (error instanceof TRPCError) throw error
      
      console.error('AI task suggestion error:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate task suggestions'
      })
    }
  })