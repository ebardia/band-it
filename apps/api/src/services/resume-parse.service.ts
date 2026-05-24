import { callAI, parseAIJson } from '../lib/ai-client'
import { prisma } from '../lib/prisma'

export type WorkExperienceEntry = {
  title: string
  org: string
  startDate?: string
  endDate?: string
  description?: string
}

export type EducationEntry = {
  degree: string
  institution: string
  startDate?: string
  endDate?: string
}

export type CertificationEntry = {
  name: string
  issuer?: string
  date?: string
}

export type ParsedResumeResult = {
  workExperience: WorkExperienceEntry[]
  education: EducationEntry[]
  certifications: CertificationEntry[]
  suggestedSkillItemIds: string[]
}

type AiResumeParse = {
  workExperience?: WorkExperienceEntry[]
  education?: EducationEntry[]
  certifications?: CertificationEntry[]
  suggestedSkills?: string[]
}

async function mapSuggestedSkillsToIds(labels: string[]): Promise<string[]> {
  if (labels.length === 0) return []

  const items = await prisma.profileTaxonomyItem.findMany({
    where: {
      category: { kind: 'SKILL' },
    },
    select: { id: true, label: true, slug: true },
  })

  const ids = new Set<string>()
  for (const label of labels) {
    const normalized = label.trim().toLowerCase()
    if (!normalized) continue
    const match = items.find(
      (item) =>
        item.label.toLowerCase() === normalized ||
        item.slug.replace(/-/g, ' ') === normalized ||
        item.label.toLowerCase().includes(normalized) ||
        normalized.includes(item.label.toLowerCase())
    )
    if (match) ids.add(match.id)
  }
  return [...ids]
}

export async function parseResumeWithAI(
  resumeText: string,
  userId: string
): Promise<ParsedResumeResult> {
  const trimmed = resumeText.trim()
  if (trimmed.length < 40) {
    throw new Error('Resume text is too short to parse. Paste or upload a fuller resume.')
  }

  const systemPrompt = `You extract structured resume data for a job-matching profile.
Return ONLY valid JSON with this shape:
{
  "workExperience": [{ "title": "", "org": "", "startDate": "", "endDate": "", "description": "" }],
  "education": [{ "degree": "", "institution": "", "startDate": "", "endDate": "" }],
  "certifications": [{ "name": "", "issuer": "", "date": "" }],
  "suggestedSkills": ["copywriting", "project management"]
}
Use empty arrays when a section is missing. suggestedSkills should use short skill labels that might match a standard skills taxonomy. Dates as free text (e.g. "2019", "Jan 2020 – Present").`

  const response = await callAI(
    `Parse this resume into structured JSON:\n\n${trimmed.slice(0, 12000)}`,
    {
      operation: 'resume_parse',
      entityType: 'profile',
      userId,
    },
    { system: systemPrompt, maxTokens: 4000 }
  )

  const parsed = parseAIJson<AiResumeParse>(response.content)
  if (!parsed) {
    throw new Error('Could not parse resume. Try again or edit fields manually.')
  }

  const suggestedSkillItemIds = await mapSuggestedSkillsToIds(parsed.suggestedSkills ?? [])

  return {
    workExperience: (parsed.workExperience ?? []).filter((e) => e.title?.trim() || e.org?.trim()),
    education: (parsed.education ?? []).filter((e) => e.degree?.trim() || e.institution?.trim()),
    certifications: (parsed.certifications ?? []).filter((e) => e.name?.trim()),
    suggestedSkillItemIds,
  }
}
