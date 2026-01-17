import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../lib/prisma'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Types
export type EntityType = 'Proposal' | 'Project' | 'Task' | 'ChecklistItem'
export type IssueType = 'legality' | 'values' | 'scope'
export type IssueSeverity = 'block' | 'flag'

export interface ValidationIssue {
  type: IssueType
  severity: IssueSeverity
  message: string
}

export interface ValidationResult {
  canProceed: boolean
  issues: ValidationIssue[]
}

export interface ValidateContentParams {
  entityType: EntityType
  action: 'create' | 'update'
  bandId: string
  data: {
    title?: string
    name?: string
    description?: string
    [key: string]: any
  }
  parentId?: string
}

interface LegalityCheckResult {
  isLawful: boolean
  concerns: string[]
}

interface AlignmentCheckResult {
  isAligned: boolean
  concerns: string[]
}

// Helper to get content title/name based on entity type
function getContentName(entityType: EntityType, data: Record<string, any>): string {
  if (entityType === 'Proposal') return data.title || ''
  return data.name || data.description?.substring(0, 50) || ''
}

// Helper to fetch parent entity for scope checks
async function fetchParent(entityType: EntityType, parentId: string): Promise<any> {
  switch (entityType) {
    case 'Project':
      // Parent is Proposal
      return prisma.proposal.findUnique({
        where: { id: parentId },
        select: {
          title: true,
          description: true,
          expectedOutcome: true,
          problemStatement: true,
        },
      })
    case 'Task':
      // Parent is Project
      return prisma.project.findUnique({
        where: { id: parentId },
        select: {
          name: true,
          description: true,
          deliverables: true,
          successCriteria: true,
        },
      })
    case 'ChecklistItem':
      // Parent is Task
      return prisma.task.findUnique({
        where: { id: parentId },
        select: {
          name: true,
          description: true,
        },
      })
    default:
      return null
  }
}

// Get parent entity type name for prompts
function getParentTypeName(entityType: EntityType): string {
  switch (entityType) {
    case 'Project': return 'Proposal'
    case 'Task': return 'Project'
    case 'ChecklistItem': return 'Task'
    default: return ''
  }
}

// Legality Check - BLOCK if unlawful
async function checkLegality(
  entityType: EntityType,
  data: Record<string, any>
): Promise<LegalityCheckResult> {
  const contentName = getContentName(entityType, data)
  const description = data.description || ''

  const prompt = `You are a content safety reviewer. Analyze the following content for any unlawful or harmful elements.

Content type: ${entityType}
Title/Name: ${contentName}
Description: ${description}

Check for:
- Theft or stealing (including phrases like "steal", "rob", "take without permission", "shoplift")
- Fraud, scams, or deceptive schemes
- Violence or threats
- Drug trafficking or illegal substance distribution
- Harmful instructions that could cause physical harm
- Violations of laws or regulations
- Harassment, discrimination, or hate speech
- Content that exploits minors

IMPORTANT: If the content explicitly mentions stealing, theft, robbery, or taking things without permission, mark it as NOT lawful. This includes casual mentions like "let's steal" or "steal some X".

Be reasonable for normal business activities, creative projects, and community initiatives.
But be STRICT about any content that describes, plans, or promotes illegal activities like theft.

Respond with JSON only:
{
  "isLawful": boolean,
  "concerns": string[]
}

If lawful, concerns should be an empty array. If not lawful, provide specific concerns explaining why.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      // Default to lawful if AI fails
      console.log('[Validation] No text content in legality response')
      return { isLawful: true, concerns: [] }
    }

    console.log('[Validation] Legality check for:', contentName || description?.substring(0, 50))
    console.log('[Validation] AI response:', textContent.text)

    // Strip markdown code blocks if present
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
    jsonText = jsonText.trim()

    const result = JSON.parse(jsonText) as LegalityCheckResult
    console.log('[Validation] Parsed result - isLawful:', result.isLawful, 'concerns:', result.concerns)
    return result
  } catch (error) {
    console.error('Legality check error:', error)
    // Default to lawful if AI fails - don't block users due to API issues
    return { isLawful: true, concerns: [] }
  }
}

// Values Alignment Check - FLAG if misaligned
async function checkValuesAlignment(
  entityType: EntityType,
  data: Record<string, any>,
  band: { values: string[]; mission: string | null }
): Promise<AlignmentCheckResult> {
  // Skip if band has no values or mission defined
  if ((!band.values || band.values.length === 0) && !band.mission) {
    return { isAligned: true, concerns: [] }
  }

  const contentName = getContentName(entityType, data)
  const description = data.description || ''

  const valuesText = band.values?.length > 0
    ? band.values.map((v, i) => `${i + 1}. ${v}`).join('\n')
    : 'No specific values defined'

  const prompt = `You are reviewing content for alignment with an organization's values and mission.

BAND VALUES:
${valuesText}

BAND MISSION:
${band.mission || 'No specific mission defined'}

CONTENT BEING REVIEWED:
Type: ${entityType}
Title/Name: ${contentName}
Description: ${description}

Does this content align with the band's stated values and mission?
Consider both explicit conflicts and subtle misalignments.
Be reasonable - minor tangential content is fine. Only flag clear conflicts or contradictions.

Respond with JSON only:
{
  "isAligned": boolean,
  "concerns": string[]
}

If aligned, concerns should be an empty array. If misaligned, provide specific explanations.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return { isAligned: true, concerns: [] }
    }

    // Strip markdown code blocks if present
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
    jsonText = jsonText.trim()

    return JSON.parse(jsonText) as AlignmentCheckResult
  } catch (error) {
    console.error('Values alignment check error:', error)
    return { isAligned: true, concerns: [] }
  }
}

// Scope Alignment Check - FLAG if out of scope
async function checkScopeAlignment(
  entityType: EntityType,
  data: Record<string, any>,
  parent: Record<string, any>
): Promise<AlignmentCheckResult> {
  const contentName = getContentName(entityType, data)
  const description = data.description || ''
  const parentType = getParentTypeName(entityType)

  // Build parent context string
  let parentContext = `Name/Title: ${parent.title || parent.name || 'Untitled'}\n`
  parentContext += `Description: ${parent.description || 'No description'}\n`

  if (parent.expectedOutcome) {
    parentContext += `Expected Outcome: ${parent.expectedOutcome}\n`
  }
  if (parent.deliverables) {
    parentContext += `Deliverables: ${parent.deliverables}\n`
  }
  if (parent.successCriteria) {
    parentContext += `Success Criteria: ${parent.successCriteria}\n`
  }

  const prompt = `You are reviewing whether a ${entityType} fits within its parent ${parentType}'s scope.

PARENT ${parentType.toUpperCase()}:
${parentContext}

CHILD ${entityType.toUpperCase()} BEING CREATED:
Name/Title: ${contentName}
Description: ${description}

Does this ${entityType.toLowerCase()} clearly and directly contribute to the parent's goals?
Be reasonable - supporting tasks and related work items are fine.
Only flag content that seems completely unrelated or contradictory to the parent's objectives.

Respond with JSON only:
{
  "isAligned": boolean,
  "concerns": string[]
}

If aligned, concerns should be an empty array. If misaligned, explain how it doesn't fit the parent's scope.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return { isAligned: true, concerns: [] }
    }

    // Strip markdown code blocks if present
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
    jsonText = jsonText.trim()

    return JSON.parse(jsonText) as AlignmentCheckResult
  } catch (error) {
    console.error('Scope alignment check error:', error)
    return { isAligned: true, concerns: [] }
  }
}

// Main validation function
export async function validateContent(params: ValidateContentParams): Promise<ValidationResult> {
  const issues: ValidationIssue[] = []

  // 1. Fetch band for values/mission
  const band = await prisma.band.findUnique({
    where: { id: params.bandId },
    select: { values: true, mission: true },
  })

  if (!band) {
    throw new Error('Band not found')
  }

  // 2. Fetch parent for scope check (if applicable)
  let parent: any = null
  if (params.parentId && params.entityType !== 'Proposal') {
    parent = await fetchParent(params.entityType, params.parentId)
  }

  // 3. Run all checks in parallel for performance
  const [legalityResult, valuesResult, scopeResult] = await Promise.all([
    checkLegality(params.entityType, params.data),
    checkValuesAlignment(params.entityType, params.data, band),
    parent ? checkScopeAlignment(params.entityType, params.data, parent) : Promise.resolve(null),
  ])

  // 4. Process legality result - BLOCK
  if (!legalityResult.isLawful) {
    issues.push({
      type: 'legality',
      severity: 'block',
      message: legalityResult.concerns.length > 0
        ? legalityResult.concerns.join(' ')
        : 'This content appears to involve unlawful activity and cannot be created.',
    })
  }

  // 5. Process values result - FLAG
  if (!valuesResult.isAligned) {
    issues.push({
      type: 'values',
      severity: 'flag',
      message: valuesResult.concerns.length > 0
        ? valuesResult.concerns.join(' ')
        : 'This content may not align with the band\'s values or mission.',
    })
  }

  // 6. Process scope result - FLAG
  if (scopeResult && !scopeResult.isAligned) {
    issues.push({
      type: 'scope',
      severity: 'flag',
      message: scopeResult.concerns.length > 0
        ? scopeResult.concerns.join(' ')
        : `This ${params.entityType.toLowerCase()} may not fit within the parent's scope.`,
    })
  }

  return {
    canProceed: !issues.some((i) => i.severity === 'block'),
    issues,
  }
}

export const validationService = {
  validateContent,
}
