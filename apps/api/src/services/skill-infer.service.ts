import { prisma } from '../lib/prisma'
import type { EducationEntry, WorkExperienceEntry } from './resume-parse.service'

type SkillMatch = {
  categorySlugs: string[]
  itemSlugs: string[]
}

/** Rule-based job-title / résumé keyword → taxonomy slugs */
const INFER_RULES: { pattern: RegExp; categorySlugs?: string[]; itemSlugs?: string[] }[] = [
  {
    pattern: /software\s*(developer|engineer|dev)|software development|programmer|full[\s-]?stack/i,
    categorySlugs: ['technology'],
    itemSlugs: ['software-dev'],
  },
  {
    pattern: /web\s*(developer|dev|development)|frontend|front-end|backend|back-end/i,
    categorySlugs: ['technology'],
    itemSlugs: ['web-dev'],
  },
  {
    pattern: /data\s*(scientist|science|analyst|analysis)|machine learning|ai\/ml|\bml engineer/i,
    categorySlugs: ['technology', 'research-analysis'],
    itemSlugs: ['data-analysis', 'data-science', 'ai-ml'],
  },
  {
    pattern: /ux|ui designer|user experience|product design/i,
    categorySlugs: ['design-creative'],
    itemSlugs: ['ux-ui'],
  },
  {
    pattern: /graphic design|illustrator|visual design/i,
    categorySlugs: ['design-creative'],
    itemSlugs: ['graphic-design'],
  },
  {
    pattern: /copywriter|copywriting|content writer/i,
    categorySlugs: ['writing-content'],
    itemSlugs: ['copywriting'],
  },
  {
    pattern: /technical writer|documentation/i,
    categorySlugs: ['writing-content'],
    itemSlugs: ['technical-writing'],
  },
  {
    pattern: /project manager|program manager|scrum master/i,
    categorySlugs: ['business-ops'],
    itemSlugs: ['project-management'],
  },
  {
    pattern: /teacher|professor|instructor|tutor|teaching|educator|faculty/i,
    categorySlugs: ['education-training'],
    itemSlugs: ['teaching'],
  },
  {
    pattern: /curriculum|instructional design|training specialist/i,
    categorySlugs: ['education-training'],
    itemSlugs: ['curriculum-design', 'facilitation'],
  },
  {
    pattern: /coach|coaching|mentor(ing)?/i,
    categorySlugs: ['education-training'],
    itemSlugs: ['coaching'],
  },
  {
    pattern: /social media|community manager/i,
    categorySlugs: ['marketing', 'communications'],
    itemSlugs: ['social-media', 'community-management'],
  },
  {
    pattern: /qa engineer|quality assurance|test engineer/i,
    categorySlugs: ['technology'],
    itemSlugs: ['qa'],
  },
  {
    pattern: /it support|help desk|systems admin/i,
    categorySlugs: ['technology'],
    itemSlugs: ['it-support'],
  },
  {
    pattern: /accountant|accounting|bookkeep|finance/i,
    categorySlugs: ['business-ops'],
    itemSlugs: ['finance-accounting'],
  },
  {
    pattern: /hr |human resources|recruiter/i,
    categorySlugs: ['business-ops'],
    itemSlugs: ['hr'],
  },
  {
    pattern: /grant writer|grant writing/i,
    categorySlugs: ['writing-content'],
    itemSlugs: ['grant-writing'],
  },
  {
    pattern: /video editor|videographer|film/i,
    categorySlugs: ['design-creative'],
    itemSlugs: ['video'],
  },
  {
    pattern: /photographer|photography/i,
    categorySlugs: ['design-creative'],
    itemSlugs: ['photography'],
  },
]

function collectText(
  workExperience: WorkExperienceEntry[],
  education: EducationEntry[],
  resumeText: string,
  extraLabels: string[] = []
): string {
  const chunks: string[] = [...extraLabels]
  for (const w of workExperience) {
    chunks.push(w.title, w.org, w.description ?? '')
  }
  for (const e of education) {
    chunks.push(e.degree, e.institution)
  }
  chunks.push(resumeText)
  return chunks.filter(Boolean).join('\n')
}

function matchRules(text: string): SkillMatch {
  const categorySlugs = new Set<string>()
  const itemSlugs = new Set<string>()

  for (const rule of INFER_RULES) {
    if (rule.pattern.test(text)) {
      rule.categorySlugs?.forEach((s) => categorySlugs.add(s))
      rule.itemSlugs?.forEach((s) => itemSlugs.add(s))
    }
  }

  return {
    categorySlugs: [...categorySlugs],
    itemSlugs: [...itemSlugs],
  }
}

async function slugsToIds(match: SkillMatch): Promise<{
  categoryIds: string[]
  itemIds: string[]
}> {
  const categoryIds: string[] = []
  const itemIds: string[] = []

  if (match.categorySlugs.length > 0) {
    const cats = await prisma.profileTaxonomyCategory.findMany({
      where: { kind: 'SKILL', slug: { in: match.categorySlugs } },
      select: { id: true },
    })
    categoryIds.push(...cats.map((c) => c.id))
  }

  if (match.itemSlugs.length > 0) {
    const items = await prisma.profileTaxonomyItem.findMany({
      where: {
        slug: { in: match.itemSlugs },
        category: { kind: 'SKILL' },
      },
      select: { id: true },
    })
    itemIds.push(...items.map((i) => i.id))
  }

  return { categoryIds, itemIds }
}

async function labelsToItemIds(labels: string[]): Promise<string[]> {
  if (labels.length === 0) return []

  const items = await prisma.profileTaxonomyItem.findMany({
    where: { category: { kind: 'SKILL' } },
    select: { id: true, label: true, slug: true },
  })

  const ids = new Set<string>()
  for (const label of labels) {
    const normalized = label.trim().toLowerCase()
    if (!normalized) continue

    const bySlug = items.find((item) => item.slug.replace(/-/g, ' ') === normalized.replace(/\s+/g, ' '))
    if (bySlug) {
      ids.add(bySlug.id)
      continue
    }

    const exact = items.find((item) => item.label.toLowerCase() === normalized)
    if (exact) {
      ids.add(exact.id)
      continue
    }

    const partial = items.find(
      (item) =>
        item.label.toLowerCase().includes(normalized) ||
        normalized.includes(item.label.toLowerCase()) ||
        normalized.includes(item.slug.replace(/-/g, ' '))
    )
    if (partial) ids.add(partial.id)
  }

  return [...ids]
}

export async function inferSkillsFromProfile(input: {
  workExperience?: WorkExperienceEntry[]
  education?: EducationEntry[]
  resumeText?: string
  suggestedLabels?: string[]
  suggestedCategorySlugs?: string[]
  suggestedItemSlugs?: string[]
}): Promise<{ categoryIds: string[]; itemIds: string[] }> {
  const workExperience = input.workExperience ?? []
  const education = input.education ?? []
  const resumeText = input.resumeText ?? ''

  const text = collectText(workExperience, education, resumeText, input.suggestedLabels ?? [])
  const ruleMatch = matchRules(text)

  const slugMatch: SkillMatch = {
    categorySlugs: [
      ...new Set([...ruleMatch.categorySlugs, ...(input.suggestedCategorySlugs ?? [])]),
    ],
    itemSlugs: [...new Set([...ruleMatch.itemSlugs, ...(input.suggestedItemSlugs ?? [])])],
  }

  const fromSlugs = await slugsToIds(slugMatch)
  const fromLabels = await labelsToItemIds(input.suggestedLabels ?? [])

  const categoryIds = [...new Set(fromSlugs.categoryIds)]
  const itemIds = [...new Set([...fromSlugs.itemIds, ...fromLabels])]

  return { categoryIds, itemIds }
}
