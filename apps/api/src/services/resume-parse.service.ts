import { callAI, parseAIJson } from '../lib/ai-client'
import { inferSkillsFromProfile } from './skill-infer.service'

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
  suggestedSkillCategoryIds: string[]
  suggestedSkillItemIds: string[]
}

type AiResumeParse = {
  workExperience?: WorkExperienceEntry[]
  education?: EducationEntry[]
  certifications?: CertificationEntry[]
  suggestedSkills?: string[]
  suggestedSkillSlugs?: string[]
  suggestedCategorySlugs?: string[]
}

export async function parseResumeWithAI(
  resumeText: string,
  userId: string
): Promise<ParsedResumeResult> {
  const trimmed = resumeText.trim()
  if (trimmed.length < 8) {
    throw new Error('Résumé text is too short to parse. Add a bit more detail or fill in work experience manually.')
  }

  const systemPrompt = `You extract structured resume data for a job-matching profile.
Return ONLY valid JSON with this shape:
{
  "workExperience": [{ "title": "", "org": "", "startDate": "", "endDate": "", "description": "" }],
  "education": [{ "degree": "", "institution": "", "startDate": "", "endDate": "" }],
  "certifications": [{ "name": "", "issuer": "", "date": "" }],
  "suggestedSkills": ["Software developer"],
  "suggestedSkillSlugs": ["software-dev"],
  "suggestedCategorySlugs": ["technology"]
}
Use empty arrays when a section is missing.
For suggestedSkillSlugs use ONLY these item slugs when applicable:
software-dev, web-dev, data-analysis, ai-ml, it-support, qa, copywriting, technical-writing, teaching, curriculum-design, coaching, project-management, ux-ui, graphic-design, social-media, etc.
For suggestedCategorySlugs use ONLY: writing-content, design-creative, marketing, technology, business-ops, research-analysis, communications, education-training, trades-hands-on.
Map job titles to slugs (e.g. "Software developer" -> software-dev + technology).
Dates as free text (e.g. "2019", "Jan 2020 – Present").`

  let parsed: AiResumeParse | null = null

  if (trimmed.length >= 40) {
    try {
      const response = await callAI(
        `Parse this resume into structured JSON:\n\n${trimmed.slice(0, 12000)}`,
        {
          operation: 'resume_parse',
          entityType: 'profile',
          userId,
        },
        { system: systemPrompt, maxTokens: 4000 }
      )
      parsed = parseAIJson<AiResumeParse>(response.content)
    } catch {
      // AI call or JSON parse failed — fall back to keyword inference below.
      parsed = null
    }
  }

  const workExperience = (parsed?.workExperience ?? []).filter((e) => e.title?.trim() || e.org?.trim())
  const education = (parsed?.education ?? []).filter((e) => e.degree?.trim() || e.institution?.trim())
  const certifications = (parsed?.certifications ?? []).filter((e) => e.name?.trim())

  // Short paste or failed AI: still infer a single role line from raw text
  if (workExperience.length === 0 && trimmed.length < 200 && !trimmed.includes('\n')) {
    workExperience.push({ title: trimmed, org: '', description: '' })
  }

  const skillMatch = await inferSkillsFromProfile({
    workExperience,
    education,
    resumeText: trimmed,
    suggestedLabels: parsed?.suggestedSkills ?? [],
    suggestedCategorySlugs: parsed?.suggestedCategorySlugs ?? [],
    suggestedItemSlugs: parsed?.suggestedSkillSlugs ?? [],
  })

  if (!parsed && workExperience.length === 0 && skillMatch.itemIds.length === 0) {
    throw new Error('Could not parse résumé. Try again or edit fields manually.')
  }

  return {
    workExperience,
    education,
    certifications,
    suggestedSkillCategoryIds: skillMatch.categoryIds,
    suggestedSkillItemIds: skillMatch.itemIds,
  }
}

export { inferSkillsFromProfile } from './skill-infer.service'
