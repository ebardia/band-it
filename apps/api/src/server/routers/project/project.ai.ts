import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { callAI, parseAIJson } from '../../../lib/ai-client'

// Roles that can use AI suggestions
const CAN_USE_AI = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

interface ProjectSuggestion {
  name: string
  description: string
  estimatedWeeks: number | null
  order: number
}

export const suggestProjects = publicProcedure
  .input(z.object({
    proposalId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { proposalId, userId } = input

    // Get proposal with full details
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' }
            }
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            description: true,
          }
        }
      }
    })

    if (!proposal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Proposal not found'
      })
    }

    // Must be approved
    if (proposal.status !== 'APPROVED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Can only generate projects for approved proposals'
      })
    }

    // Check user has permission
    const member = proposal.band.members.find(m => m.userId === userId)
    if (!member || !CAN_USE_AI.includes(member.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to use AI features'
      })
    }

    // Build context for AI - include full hierarchy
    const existingProjects = proposal.projects.map(p =>
      `- ${p.name} (${p.status})${p.description ? `\n  Description: ${p.description}` : ''}`
    ).join('\n')
    const band = proposal.band

    const proposalContext = `
=== BAND CONTEXT ===
BAND NAME: ${band.name}
${band.mission ? `BAND MISSION: ${band.mission}` : ''}
${band.values ? `BAND VALUES: ${band.values}` : ''}
${band.description ? `BAND DESCRIPTION: ${band.description}` : ''}

=== PROPOSAL CONTEXT ===
PROPOSAL TITLE: ${proposal.title}
PROPOSAL TYPE: ${proposal.type}
PROPOSAL DESCRIPTION: ${proposal.description}
${proposal.problemStatement ? `PROBLEM STATEMENT: ${proposal.problemStatement}` : ''}
${proposal.expectedOutcome ? `EXPECTED OUTCOME: ${proposal.expectedOutcome}` : ''}
${proposal.milestones ? `MILESTONES: ${proposal.milestones}` : ''}
${proposal.budgetRequested ? `BUDGET: $${proposal.budgetRequested}` : ''}
${proposal.proposedStartDate ? `START DATE: ${new Date(proposal.proposedStartDate).toLocaleDateString()}` : ''}
${proposal.proposedEndDate ? `END DATE: ${new Date(proposal.proposedEndDate).toLocaleDateString()}` : ''}

${existingProjects ? `EXISTING PROJECTS:\n${existingProjects}` : 'NO EXISTING PROJECTS YET'}
    `.trim()

    const systemPrompt = `You are a project management expert helping a community band break down an approved proposal into actionable projects.

A "project" is a logical grouping of work that delivers a specific outcome. Projects will later be broken down into individual tasks.

IMPORTANT: You are given the FULL CONTEXT of the organization hierarchy:
- BAND: The organization/group with its mission and purpose
- PROPOSAL: The approved initiative needing projects

You MUST understand and respect this context. Your suggestions should align with:
- The band's mission and purpose (if it's a test band, suggest test-related projects)
- The proposal's specific goals and expected outcomes

Your job is to suggest 2-5 projects that together would accomplish the proposal's goals. IMPORTANT: Carefully review any existing projects listed below - do NOT suggest projects that cover the same work, even if the name is different.

RULES:
1. Each project should be distinct and have a clear deliverable
2. Projects should be ordered logically (dependencies first)
3. Project names should be concise (under 100 characters)
4. Project descriptions should be 2-3 sentences explaining scope and deliverable
5. Consider the timeline and budget when sizing projects
6. CRITICAL: Do NOT suggest projects that duplicate existing ones - check both names AND descriptions for overlap. If an existing project already covers certain work (like "planning", "research", "procurement", etc.), do not suggest another project covering the same scope even with a different name.
7. If all necessary projects already exist, return an empty array []
8. NEVER suggest generic projects that don't match the band's actual mission (e.g., don't suggest "recruit musicians" for a test band)

Respond with a JSON array of project suggestions. Each object should have:
- name: string (project name)
- description: string (2-3 sentences)
- estimatedWeeks: number (rough estimate)
- order: number (execution order, 1 = first)

Example response:
[
  {
    "name": "Site Assessment and Planning",
    "description": "Survey the proposed location, identify requirements, and create detailed plans. This includes soil testing, permit research, and stakeholder consultations.",
    "estimatedWeeks": 2,
    "order": 1
  },
  {
    "name": "Material Procurement",
    "description": "Source and purchase all required materials based on the approved plans. Coordinate delivery schedules with the construction timeline.",
    "estimatedWeeks": 1,
    "order": 2
  }
]

Respond ONLY with the JSON array, no other text.`

    try {
      const response = await callAI(
        `Please analyze this approved proposal and suggest how to break it down into projects:\n\n${proposalContext}`,
        {
          operation: 'project_suggestions',
          entityType: 'proposal',
          entityId: proposalId,
          bandId: proposal.band.id,
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
      const validatedSuggestions: ProjectSuggestion[] = suggestions.map((s: any, index: number) => ({
        name: s.name || `Project ${index + 1}`,
        description: s.description || '',
        estimatedWeeks: s.estimatedWeeks || null,
        order: s.order || index + 1,
      }))

      return {
        suggestions: validatedSuggestions,
        proposalTitle: proposal.title
      }

    } catch (error) {
      if (error instanceof TRPCError) throw error

      console.error('AI suggestion error:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate project suggestions'
      })
    }
  })
