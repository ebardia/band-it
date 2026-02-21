import { callAI, parseAIJson, AIOperationType } from '../lib/ai-client'
import { prisma } from '../lib/prisma'

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
  userId?: string
  entityId?: string
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

// Map EntityType to AIEntityType
function mapEntityType(entityType: EntityType): 'proposal' | 'project' | 'task' | 'checklist' {
  switch (entityType) {
    case 'Proposal': return 'proposal'
    case 'Project': return 'project'
    case 'Task': return 'task'
    case 'ChecklistItem': return 'checklist'
  }
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

// Context for tracking
interface CheckContext {
  bandId: string
  userId?: string
  entityId?: string
  entityType: EntityType
}

// Legality Check - BLOCK if unlawful
async function checkLegality(
  entityType: EntityType,
  data: Record<string, any>,
  context: CheckContext
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
    const response = await callAI(prompt, {
      operation: 'content_legality_check',
      entityType: mapEntityType(entityType),
      entityId: context.entityId,
      bandId: context.bandId,
      userId: context.userId,
    }, {
      maxTokens: 500,
    })

    console.log('[Validation] Legality check for:', contentName || description?.substring(0, 50))
    console.log('[Validation] AI response:', response.content)

    const result = parseAIJson<LegalityCheckResult>(response.content)
    if (!result) {
      console.log('[Validation] Failed to parse legality response')
      return { isLawful: true, concerns: [] }
    }

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
  band: { values: string[]; mission: string | null },
  context: CheckContext
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
    const response = await callAI(prompt, {
      operation: 'content_values_check',
      entityType: mapEntityType(entityType),
      entityId: context.entityId,
      bandId: context.bandId,
      userId: context.userId,
    }, {
      maxTokens: 500,
    })

    const result = parseAIJson<AlignmentCheckResult>(response.content)
    if (!result) {
      return { isAligned: true, concerns: [] }
    }
    return result
  } catch (error) {
    console.error('Values alignment check error:', error)
    return { isAligned: true, concerns: [] }
  }
}

// Scope Alignment Check - BLOCK if out of scope
async function checkScopeAlignment(
  entityType: EntityType,
  data: Record<string, any>,
  parent: Record<string, any>,
  context: CheckContext
): Promise<AlignmentCheckResult> {
  const contentName = getContentName(entityType, data)
  const description = data.description || ''
  const parentType = getParentTypeName(entityType)

  // Build parent context string
  let parentContext = `Name/Title: ${parent.title || parent.name || 'Untitled'}\n`
  parentContext += `Description: ${parent.description || 'No description'}\n`

  if (parent.problemStatement) {
    parentContext += `Problem Statement: ${parent.problemStatement}\n`
  }
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

Does this ${entityType.toLowerCase()} directly implement, support, or contribute to the parent ${parentType.toLowerCase()}'s stated goals?

A ${entityType.toLowerCase()} is ALIGNED if it:
- Directly implements part or all of the parent's objectives
- Is a necessary phase, step, or sub-deliverable of the parent
- Addresses the same problem or goal described by the parent

A ${entityType.toLowerCase()} is NOT ALIGNED if it:
- Covers a different topic or domain than the parent
- Has no logical connection to the parent's purpose, problem, or expected outcome
- Would make more sense as a standalone initiative unrelated to this parent

Respond with JSON only:
{
  "isAligned": boolean,
  "concerns": string[]
}

If aligned, concerns should be an empty array. If not aligned, explain specifically why it does not fit the parent's scope.`

  try {
    const response = await callAI(prompt, {
      operation: 'content_scope_check',
      entityType: mapEntityType(entityType),
      entityId: context.entityId,
      bandId: context.bandId,
      userId: context.userId,
    }, {
      maxTokens: 500,
    })

    const result = parseAIJson<AlignmentCheckResult>(response.content)
    if (!result) {
      return { isAligned: true, concerns: [] }
    }
    return result
  } catch (error) {
    console.error('Scope alignment check error:', error)
    return { isAligned: true, concerns: [] }
  }
}

// Sub-band Scope Check for Proposals - BLOCK if proposal is outside sub-band's scope
async function checkSubBandScope(
  entityType: EntityType,
  data: Record<string, any>,
  subBand: { name: string; mission: string | null; values?: string[] },
  parentBand: { name: string; mission: string | null },
  context: CheckContext
): Promise<AlignmentCheckResult> {
  const contentName = getContentName(entityType, data)
  const description = data.description || ''

  const valuesText = subBand.values?.length
    ? subBand.values.map((v, i) => `${i + 1}. ${v}`).join('\n')
    : 'No specific values defined'

  const prompt = `You are reviewing whether a proposal belongs in this specific sub-band/committee.

PARENT ORGANIZATION:
Name: ${parentBand.name}
Mission/Purpose: ${parentBand.mission || 'No specific mission defined'}

SUB-BAND/COMMITTEE (where proposal is being created):
Name: ${subBand.name}
Mission/Purpose: ${subBand.mission || 'No specific mission defined'}
Values:
${valuesText}

PROPOSAL BEING CREATED:
Title: ${contentName}
Description: ${description}

IMPORTANT: This proposal is being created in the SUB-BAND "${subBand.name}", which is a committee/team within "${parentBand.name}".

The key question is: Does this proposal belong in THIS sub-band's scope?

A proposal is ALIGNED with the sub-band if it:
- Is work that THIS sub-band/committee should be doing based on its mission
- Directly relates to the sub-band's specific purpose or focus area
- Is something the members of this committee would work on

A proposal is NOT ALIGNED if it:
- Is work for the PARENT organization "${parentBand.name}" as a whole, not specifically for "${subBand.name}"
- Should be proposed in a different sub-band or at the parent organization level
- Describes work outside this committee's specific focus area
- Would be better suited as a proposal in the parent organization directly

For example, if "${subBand.name}" is a "Human Rights Committee" and the proposal is about general PR/marketing for "${parentBand.name}", that proposal should NOT be in the Human Rights Committee - it should be in a Marketing committee or proposed at the parent level.

Respond with JSON only:
{
  "isAligned": boolean,
  "concerns": string[]
}

If aligned, concerns should be an empty array. If not aligned, explain specifically why this proposal doesn't fit "${subBand.name}"'s scope.`

  try {
    const response = await callAI(prompt, {
      operation: 'content_scope_check',
      entityType: mapEntityType(entityType),
      entityId: context.entityId,
      bandId: context.bandId,
      userId: context.userId,
    }, {
      maxTokens: 500,
    })

    console.log('[Validation] Sub-band scope check for:', contentName || description?.substring(0, 50))
    console.log('[Validation] AI response:', response.content)

    const result = parseAIJson<AlignmentCheckResult>(response.content)
    if (!result) {
      console.log('[Validation] Failed to parse sub-band scope response')
      return { isAligned: true, concerns: [] }
    }

    console.log('[Validation] Parsed result - isAligned:', result.isAligned, 'concerns:', result.concerns)
    return result
  } catch (error) {
    console.error('Sub-band scope check error:', error)
    return { isAligned: true, concerns: [] }
  }
}

// Main validation function
export async function validateContent(params: ValidateContentParams): Promise<ValidationResult> {
  const issues: ValidationIssue[] = []
  const context: CheckContext = {
    bandId: params.bandId,
    userId: params.userId,
    entityId: params.entityId,
    entityType: params.entityType,
  }

  // 1. Fetch band for values/mission (and parent band if sub-band)
  const band = await prisma.band.findUnique({
    where: { id: params.bandId },
    select: {
      name: true,
      values: true,
      mission: true,
      parentBandId: true,
      parentBand: {
        select: {
          id: true,
          name: true,
          mission: true,
          values: true,
        },
      },
    },
  })

  if (!band) {
    throw new Error('Band not found')
  }

  // 2. Fetch parent for scope check (if applicable)
  let parent: any = null
  if (params.parentId && params.entityType !== 'Proposal') {
    parent = await fetchParent(params.entityType, params.parentId)
  }

  // 3. For Proposals in sub-bands, check if proposal fits the sub-band's scope
  let subBandScopeCheck: { subBand: any; parentBand: any } | null = null
  if (params.entityType === 'Proposal' && band.parentBand) {
    subBandScopeCheck = {
      subBand: {
        name: band.name,
        mission: band.mission,
        values: band.values,
      },
      parentBand: {
        name: band.parentBand.name,
        mission: band.parentBand.mission,
      },
    }
  }

  // 4. Run all checks in parallel for performance
  const [legalityResult, valuesResult, scopeResult, subBandScopeResult] = await Promise.all([
    checkLegality(params.entityType, params.data, context),
    checkValuesAlignment(params.entityType, params.data, band, context),
    parent ? checkScopeAlignment(params.entityType, params.data, parent, context) : Promise.resolve(null),
    subBandScopeCheck ? checkSubBandScope(params.entityType, params.data, subBandScopeCheck.subBand, subBandScopeCheck.parentBand, context) : Promise.resolve(null),
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

  // 6. Process scope result - BLOCK
  if (scopeResult && !scopeResult.isAligned) {
    issues.push({
      type: 'scope',
      severity: 'block',
      message: scopeResult.concerns.length > 0
        ? scopeResult.concerns.join(' ')
        : `This ${params.entityType.toLowerCase()} does not appear related to the parent's scope.`,
    })
  }

  // 7. Process sub-band scope result - BLOCK if proposal doesn't fit sub-band's scope
  if (subBandScopeResult && !subBandScopeResult.isAligned) {
    issues.push({
      type: 'scope',
      severity: 'block',
      message: subBandScopeResult.concerns.length > 0
        ? subBandScopeResult.concerns.join(' ')
        : 'This proposal does not appear to fit within this sub-band\'s scope. Consider creating it in the parent organization or a different sub-band.',
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
