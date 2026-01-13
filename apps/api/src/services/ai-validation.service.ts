import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export interface ValidationIssue {
  type: 'DATE' | 'BUDGET' | 'ALIGNMENT' | 'COMPLETENESS' | 'LEGAL'
  severity: 'INFO' | 'WARNING' | 'CONCERN'
  message: string
  suggestion: string
}

export interface ValidationResult {
  status: 'PASS' | 'WARNING' | 'CONCERN'
  checkedAt: string
  issues: ValidationIssue[]
}

async function callAIValidation(prompt: string, systemPrompt: string): Promise<ValidationResult> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response')
    }

    // Parse JSON response - handle various formats
    let jsonText = textContent.text.trim()
    
    // Remove markdown code blocks if present
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }
    
    console.log('AI Validation raw response:', textContent.text)
    console.log('AI Validation parsed JSON text:', jsonText)
    
    const result = JSON.parse(jsonText)
    
    // Validate and normalize the response
    const normalizedIssues: ValidationIssue[] = (result.issues || []).map((issue: any) => ({
      type: issue.type || 'COMPLETENESS',
      severity: issue.severity || 'INFO',
      message: issue.message || 'No message provided',
      suggestion: issue.suggestion || 'No suggestion provided',
    }))
    
    // Determine overall status based on issues
    let status: 'PASS' | 'WARNING' | 'CONCERN' = result.status || 'PASS'
    if (!result.status && normalizedIssues.length > 0) {
      const hasConcern = normalizedIssues.some(i => i.severity === 'CONCERN')
      const hasWarning = normalizedIssues.some(i => i.severity === 'WARNING')
      status = hasConcern ? 'CONCERN' : hasWarning ? 'WARNING' : 'PASS'
    }
    
    return {
      status,
      checkedAt: new Date().toISOString(),
      issues: normalizedIssues
    }
  } catch (error) {
    console.error('AI validation error:', error)
    return {
      status: 'PASS',
      checkedAt: new Date().toISOString(),
      issues: [{
        type: 'COMPLETENESS',
        severity: 'INFO',
        message: 'Could not complete AI validation',
        suggestion: 'Please review manually'
      }]
    }
  }
}

interface ValidateProjectInput {
  name: string
  description?: string | null
  startDate?: Date | null
  targetDate?: Date | null
  estimatedBudget?: number | null
  estimatedHours?: number | null
  deliverables?: string | null
  successCriteria?: string | null
  bandValues: string[]
  bandMission: string
  proposalBudget?: number | null
}

export async function validateProject(input: ValidateProjectInput): Promise<ValidationResult> {
  const systemPrompt = `You are a project reviewer for a community organization. Analyze projects for potential issues.

Review for these categories:
1. DATE - target before start, unrealistic timeline, dates in past
2. BUDGET - project budget exceeds proposal budget, seems unrealistic for scope
3. ALIGNMENT - project doesn't align with band values
4. COMPLETENESS - missing deliverables, success criteria, or key information
5. LEGAL - potential legal or liability concerns

You MUST respond with ONLY valid JSON in this exact format (no other text):
{
  "status": "PASS",
  "issues": [
    {
      "type": "COMPLETENESS",
      "severity": "WARNING",
      "message": "Brief description of issue",
      "suggestion": "How to fix it"
    }
  ]
}

Rules:
- status must be exactly one of: "PASS", "WARNING", "CONCERN"
- type must be exactly one of: "DATE", "BUDGET", "ALIGNMENT", "COMPLETENESS", "LEGAL"
- severity must be exactly one of: "INFO", "WARNING", "CONCERN"
- If no issues found, return {"status": "PASS", "issues": []}
- Be helpful but not overly critical. Only flag real issues.
- RESPOND ONLY WITH JSON, NO OTHER TEXT.`

  const prompt = `Review this project:

NAME: ${input.name}
DESCRIPTION: ${input.description || 'Not provided'}
START DATE: ${input.startDate ? input.startDate.toLocaleDateString() : 'Not set'}
TARGET DATE: ${input.targetDate ? input.targetDate.toLocaleDateString() : 'Not set'}
ESTIMATED BUDGET: ${input.estimatedBudget ? '$' + input.estimatedBudget : 'Not set'}
ESTIMATED HOURS: ${input.estimatedHours || 'Not set'}
DELIVERABLES: ${input.deliverables || 'Not specified'}
SUCCESS CRITERIA: ${input.successCriteria || 'Not specified'}
PARENT PROPOSAL BUDGET: ${input.proposalBudget ? '$' + input.proposalBudget : 'Not set'}

BAND VALUES: ${input.bandValues.length > 0 ? input.bandValues.join(', ') : 'Not specified'}
BAND MISSION: ${input.bandMission || 'Not specified'}

Today's date: ${new Date().toLocaleDateString()}`

  return callAIValidation(prompt, systemPrompt)
}

interface ValidateProposalInput {
  title: string
  description: string
  problemStatement?: string | null
  expectedOutcome?: string | null
  budgetRequested?: number | null
  proposedStartDate?: Date | null
  proposedEndDate?: Date | null
  bandValues: string[]
  bandMission: string
}

export async function validateProposal(input: ValidateProposalInput): Promise<ValidationResult> {
  const systemPrompt = `You are a proposal reviewer for a community organization. Analyze proposals for potential issues.

Review for these categories:
1. DATE - unrealistic timelines, missing dates, dates in past
2. BUDGET - budget seems too low/high for scope, missing budget for work that needs it
3. ALIGNMENT - proposal doesn't align with band values or mission
4. COMPLETENESS - missing important information
5. LEGAL - potential legal, liability, or compliance concerns

You MUST respond with ONLY valid JSON in this exact format (no other text):
{
  "status": "PASS",
  "issues": [
    {
      "type": "COMPLETENESS",
      "severity": "WARNING",
      "message": "Brief description of issue",
      "suggestion": "How to fix it"
    }
  ]
}

Rules:
- status must be exactly one of: "PASS", "WARNING", "CONCERN"
- type must be exactly one of: "DATE", "BUDGET", "ALIGNMENT", "COMPLETENESS", "LEGAL"
- severity must be exactly one of: "INFO", "WARNING", "CONCERN"
- If no issues found, return {"status": "PASS", "issues": []}
- RESPOND ONLY WITH JSON, NO OTHER TEXT.`

  const prompt = `Review this proposal:

TITLE: ${input.title}
DESCRIPTION: ${input.description}
PROBLEM STATEMENT: ${input.problemStatement || 'Not provided'}
EXPECTED OUTCOME: ${input.expectedOutcome || 'Not provided'}
BUDGET REQUESTED: ${input.budgetRequested ? '$' + input.budgetRequested : 'Not specified'}
START DATE: ${input.proposedStartDate ? input.proposedStartDate.toLocaleDateString() : 'Not set'}
END DATE: ${input.proposedEndDate ? input.proposedEndDate.toLocaleDateString() : 'Not set'}

BAND VALUES: ${input.bandValues.length > 0 ? input.bandValues.join(', ') : 'Not specified'}
BAND MISSION: ${input.bandMission || 'Not specified'}

Today's date: ${new Date().toLocaleDateString()}`

  return callAIValidation(prompt, systemPrompt)
}

interface ValidateTaskInput {
  name: string
  description?: string | null
  dueDate?: Date | null
  estimatedHours?: number | null
  estimatedCost?: number | null
  projectTargetDate?: Date | null
  projectBudget?: number | null
}

export async function validateTask(input: ValidateTaskInput): Promise<ValidationResult> {
  const systemPrompt = `You are a task reviewer. Analyze tasks for potential issues.

Review for these categories:
1. DATE - due date after project target, due date in past, unrealistic timeline
2. BUDGET - task cost seems high relative to project budget
3. COMPLETENESS - vague description, missing important details

You MUST respond with ONLY valid JSON in this exact format (no other text):
{
  "status": "PASS",
  "issues": [
    {
      "type": "COMPLETENESS",
      "severity": "WARNING",
      "message": "Brief description of issue",
      "suggestion": "How to fix it"
    }
  ]
}

Rules:
- status must be exactly one of: "PASS", "WARNING", "CONCERN"
- type must be exactly one of: "DATE", "BUDGET", "COMPLETENESS"
- severity must be exactly one of: "INFO", "WARNING", "CONCERN"
- If no issues found, return {"status": "PASS", "issues": []}
- Be brief and only flag real issues.
- RESPOND ONLY WITH JSON, NO OTHER TEXT.`

  const prompt = `Review this task:

NAME: ${input.name}
DESCRIPTION: ${input.description || 'Not provided'}
DUE DATE: ${input.dueDate ? input.dueDate.toLocaleDateString() : 'Not set'}
ESTIMATED HOURS: ${input.estimatedHours || 'Not set'}
ESTIMATED COST: ${input.estimatedCost ? '$' + input.estimatedCost : 'Not set'}
PROJECT TARGET DATE: ${input.projectTargetDate ? input.projectTargetDate.toLocaleDateString() : 'Not set'}
PROJECT BUDGET: ${input.projectBudget ? '$' + input.projectBudget : 'Not set'}

Today's date: ${new Date().toLocaleDateString()}`

  return callAIValidation(prompt, systemPrompt)
}

export const aiValidationService = {
  validateProposal,
  validateProject,
  validateTask,
}