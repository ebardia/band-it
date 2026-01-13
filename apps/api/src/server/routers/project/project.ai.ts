import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// Roles that can use AI suggestions
const CAN_USE_AI = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

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

    // Build context for AI
    const proposalContext = `
PROPOSAL TITLE: ${proposal.title}

DESCRIPTION:
${proposal.description}

${proposal.problemStatement ? `PROBLEM STATEMENT:\n${proposal.problemStatement}\n` : ''}
${proposal.expectedOutcome ? `EXPECTED OUTCOME:\n${proposal.expectedOutcome}\n` : ''}
${proposal.milestones ? `MILESTONES:\n${proposal.milestones}\n` : ''}
${proposal.budgetRequested ? `BUDGET: $${proposal.budgetRequested}\n` : ''}
${proposal.proposedStartDate ? `START DATE: ${new Date(proposal.proposedStartDate).toLocaleDateString()}\n` : ''}
${proposal.proposedEndDate ? `END DATE: ${new Date(proposal.proposedEndDate).toLocaleDateString()}\n` : ''}
    `.trim()

    const systemPrompt = `You are a project management expert helping a community band break down an approved proposal into actionable projects.

A "project" is a logical grouping of work that delivers a specific outcome. Projects will later be broken down into individual tasks.

Your job is to suggest 2-5 projects that together would accomplish the proposal's goals.

RULES:
1. Each project should be distinct and have a clear deliverable
2. Projects should be ordered logically (dependencies first)
3. Project names should be concise (under 100 characters)
4. Project descriptions should be 2-3 sentences explaining scope and deliverable
5. Consider the timeline and budget when sizing projects

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
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Please analyze this approved proposal and suggest how to break it down into projects:\n\n${proposalContext}`
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