import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { callAI, parseAIJson } from '../../../lib/ai-client'

// Roles that can use AI suggestions
const CAN_USE_AI = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

interface TaskSuggestion {
  name: string
  description: string
  estimatedHours: number | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  order: number
  requiresVerification: boolean
}

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

    // Build context for AI - include full hierarchy
    const existingTasks = project.tasks.map(t =>
      `- ${t.name} (${t.status})${t.description ? `\n  Description: ${t.description}` : ''}`
    ).join('\n')
    const band = project.band
    const proposal = project.proposal

    const projectContext = `
=== BAND CONTEXT ===
BAND NAME: ${band.name}
${band.mission ? `BAND MISSION: ${band.mission}` : ''}
${band.values ? `BAND VALUES: ${band.values}` : ''}
${band.description ? `BAND DESCRIPTION: ${band.description}` : ''}

=== PROPOSAL CONTEXT ===
PROPOSAL TITLE: ${proposal.title}
PROPOSAL TYPE: ${proposal.type}
PROPOSAL DESCRIPTION: ${proposal.description || 'No description'}
${proposal.problemStatement ? `PROBLEM STATEMENT: ${proposal.problemStatement}` : ''}
${proposal.expectedOutcome ? `EXPECTED OUTCOME: ${proposal.expectedOutcome}` : ''}

=== PROJECT CONTEXT ===
PROJECT NAME: ${project.name}
PROJECT DESCRIPTION: ${project.description || 'No description provided'}
${project.deliverables ? `DELIVERABLES: ${project.deliverables}` : ''}
${project.successCriteria ? `SUCCESS CRITERIA: ${project.successCriteria}` : ''}
${project.estimatedBudget ? `BUDGET: $${project.estimatedBudget}` : ''}
${project.estimatedHours ? `ESTIMATED HOURS: ${project.estimatedHours}` : ''}
${project.startDate ? `START DATE: ${new Date(project.startDate).toLocaleDateString()}` : ''}
${project.targetDate ? `TARGET DATE: ${new Date(project.targetDate).toLocaleDateString()}` : ''}

${existingTasks ? `EXISTING TASKS:\n${existingTasks}` : 'NO EXISTING TASKS YET'}
    `.trim()

    const systemPrompt = `You are a project management expert helping a community band break down a project into actionable tasks.

A "task" is a specific, actionable item that one person can complete. Tasks should be concrete and verifiable.

IMPORTANT: You are given the FULL CONTEXT of the organization hierarchy:
- BAND: The organization/group with its mission and purpose
- PROPOSAL: The approved initiative this work stems from
- PROJECT: The specific project needing tasks

You MUST understand and respect this context. Your suggestions should align with:
- The band's mission and purpose (if it's a test band, suggest test-related tasks)
- The proposal's goals and expected outcomes
- The project's specific objectives and deliverables

Your job is to suggest 3-7 tasks that would help accomplish this project's goals. IMPORTANT: Carefully review any existing tasks listed below - do NOT suggest tasks that cover the same work, even if the name is different.

RULES:
1. Each task should be specific and actionable (something one person can do)
2. Tasks should be ordered logically (dependencies/prerequisites first)
3. Task names should be concise action items (under 100 characters)
4. Task descriptions should be 1-2 sentences explaining what needs to be done
5. Consider the project timeline and budget when estimating effort
6. CRITICAL: Do NOT suggest tasks that duplicate existing ones - check both names AND descriptions for overlap. If an existing task already covers certain work (like "research", "planning", "setup", etc.), do not suggest another task covering the same scope even with a different name.
7. Include a mix of planning, execution, and verification tasks as appropriate
8. If all necessary tasks already exist, return an empty array []
9. NEVER suggest generic tasks that don't match the band's actual mission (e.g., don't suggest "recruit musicians" for a test band)

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
      const response = await callAI(
        `Please analyze this project and suggest tasks to help complete it:\n\n${projectContext}`,
        {
          operation: 'task_suggestions',
          entityType: 'project',
          entityId: projectId,
          bandId: project.band.id,
          userId,
        },
        {
          system: systemPrompt,
          maxTokens: 2000,
        }
      )

      // Parse JSON response
      const suggestions = parseAIJson<any[]>(response.content)

      if (!suggestions || !Array.isArray(suggestions)) {
        console.error('Failed to parse AI response:', response.content)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to parse AI response'
        })
      }

      // Ensure each suggestion has required fields
      const validatedSuggestions: TaskSuggestion[] = suggestions.map((s: any, index: number) => ({
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
