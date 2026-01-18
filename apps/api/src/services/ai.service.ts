import { callAI, parseAIJson } from '../lib/ai-client'
import { prisma } from '../lib/prisma'

interface GenerateProposalDraftInput {
  title: string
  type: 'GENERAL' | 'BUDGET' | 'PROJECT' | 'POLICY' | 'MEMBERSHIP'
  context?: string
  bandName?: string
  bandId?: string
  userId?: string
}

interface ProposalDraft {
  description: string
  problemStatement: string
  expectedOutcome: string
  risksAndConcerns: string
  budgetBreakdown: string
  milestones: string
}

export const aiService = {
  async generateProposalDraft(input: GenerateProposalDraftInput): Promise<ProposalDraft> {
    const typeDescriptions: Record<string, string> = {
      GENERAL: 'a general decision or discussion topic',
      BUDGET: 'a budget request or financial expenditure',
      PROJECT: 'a new project or initiative',
      POLICY: 'a policy change or new rule',
      MEMBERSHIP: 'a membership change (promotion, role change, etc.)',
    }

    // Fetch band details if bandId is provided
    let bandContext = ''
    if (input.bandId) {
      const band = await prisma.band.findUnique({
        where: { id: input.bandId },
        select: { name: true, mission: true, description: true, values: true }
      })
      if (band) {
        bandContext = `
=== BAND CONTEXT ===
BAND NAME: ${band.name}
${band.mission ? `BAND MISSION: ${band.mission}` : ''}
${band.values ? `BAND VALUES: ${band.values}` : ''}
${band.description ? `BAND DESCRIPTION: ${band.description}` : ''}

IMPORTANT: Your proposal MUST align with this band's mission and purpose. Do not suggest anything unrelated to what this band is about.
`
      }
    }

    const prompt = `You are helping a member of a collaborative band/team write a proposal.
${bandContext}
The proposal is titled: "${input.title}"
Type: ${typeDescriptions[input.type]}
${input.context ? `Additional context: ${input.context}` : ''}

Generate a well-structured proposal draft with the following sections. Be specific, professional, and actionable. Use placeholder brackets [like this] only where the user needs to fill in specific details you don't know.

Respond in JSON format with these exact fields:
{
  "description": "A comprehensive 2-3 paragraph description of the proposal",
  "problemStatement": "What problem or opportunity this addresses (1-2 paragraphs)",
  "expectedOutcome": "What success looks like, with measurable outcomes where possible",
  "risksAndConcerns": "Potential downsides and how to mitigate them",
  "budgetBreakdown": "If applicable, a line-item budget breakdown. Leave empty string if not a budget proposal.",
  "milestones": "Key milestones and timeline if applicable"
}

Only respond with the JSON object, no other text.`

    try {
      const response = await callAI(prompt, {
        operation: 'proposal_draft',
        entityType: 'proposal',
        bandId: input.bandId,
        userId: input.userId,
      }, {
        maxTokens: 1500,
      })

      // Parse JSON response
      const draft = parseAIJson<ProposalDraft>(response.content)

      if (!draft) {
        throw new Error('Failed to parse AI response as JSON')
      }

      return draft
    } catch (error) {
      console.error('AI generation error:', error)

      // Return fallback template if AI fails
      return {
        description: `This proposal addresses: ${input.title}\n\n[Provide a detailed description of what you are proposing and why it matters to the band.]`,
        problemStatement: '[What problem or opportunity does this proposal address? Why is this important now?]',
        expectedOutcome: '[What will be achieved if this proposal is approved? What does success look like?]',
        risksAndConcerns: '[What are the potential downsides or risks? How can they be mitigated?]',
        budgetBreakdown: input.type === 'BUDGET' ? '• Item 1: $[amount]\n• Item 2: $[amount]\n• Total: $[amount]' : '',
        milestones: input.type === 'PROJECT' ? '• Phase 1: [description] - [timeframe]\n• Phase 2: [description] - [timeframe]' : '',
      }
    }
  },
}
