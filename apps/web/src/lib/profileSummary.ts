/** Build read-only summary — one relaxed paragraph, deduped facts. */

import type { EndUserProfileForm, ProfileTaxonomyCategory } from './endUserProfile'

export type ProfileSummaryInput = {
  name: string
  locationLabel: string
  form: EndUserProfileForm
  skillCategories: ProfileTaxonomyCategory[]
  causeCategories: ProfileTaxonomyCategory[]
  playCategories: ProfileTaxonomyCategory[]
}

const STOP_WORDS = new Set(['and', 'the', 'for', 'at', 'in', 'of', 'a', 'an', 'to'])

function normalizeConcept(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenSet(value: string): Set<string> {
  return new Set(
    normalizeConcept(value)
      .split(' ')
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  )
}

function conceptSimilar(a: string, b: string): boolean {
  const left = normalizeConcept(a)
  const right = normalizeConcept(b)
  if (!left || !right) return false
  if (left === right) return true
  if (left.includes(right) || right.includes(left)) return true

  const leftTokens = tokenSet(a)
  const rightTokens = tokenSet(b)
  if (leftTokens.size === 0 || rightTokens.size === 0) return false

  let overlap = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap++
  }

  return overlap / Math.min(leftTokens.size, rightTokens.size) >= 0.55
}

function dedupeConcepts(items: string[]): string[] {
  const out: string[] = []
  for (const item of items.filter(Boolean)) {
    if (out.some((existing) => conceptSimilar(existing, item))) continue
    out.push(item)
  }
  return out
}

function filterNotSimilarTo(candidates: string[], against: string[]): string[] {
  return candidates.filter((candidate) => !against.some((item) => conceptSimilar(candidate, item)))
}

function labelsForSelection(
  selection: EndUserProfileForm['skills'],
  categories: ProfileTaxonomyCategory[]
): string[] {
  const labels: string[] = []

  for (const category of categories) {
    const selectedItems = category.items.filter((item) => selection.itemIds.includes(item.id))
    if (selectedItems.length > 0) {
      labels.push(...selectedItems.map((item) => item.label))
    } else if (selection.categoryIds.includes(category.id)) {
      labels.push(category.label)
    }
  }

  return dedupeConcepts(labels)
}

function joinReadable(items: string[], max = 4): string {
  const trimmed = items.filter(Boolean)
  if (trimmed.length === 0) return ''
  const shown = trimmed.slice(0, max)
  const tail = trimmed.length > max ? ` and ${trimmed.length - max} more` : ''
  if (shown.length === 1) return shown[0] + tail
  if (shown.length === 2) return `${shown[0]} and ${shown[1]}${tail}`
  return `${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]}${tail}`
}

function firstNameFrom(name: string): string {
  return name.split(/\s+/)[0] || 'You'
}

/** Turn SHOUTY résumé paste into normal phrasing. */
function formatPhrase(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return trimmed
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  return trimmed
}

function resumeLead(form: EndUserProfileForm): string {
  const firstRole = form.workExperience.find((entry) => entry.title.trim())
  if (firstRole) {
    const title = formatPhrase(firstRole.title)
    const org = formatPhrase(firstRole.org)
    return [title, org].filter(Boolean).join(' at ')
  }

  const lead = form.resumeText
    .trim()
    .split(/[.!?\n]/)
    .map((line) => line.trim())
    .find(Boolean)

  return lead ? formatPhrase(lead) : ''
}

function resumeConcepts(form: EndUserProfileForm): string[] {
  const concepts: string[] = []

  for (const role of form.workExperience) {
    if (role.title.trim()) concepts.push(formatPhrase(role.title.trim()))
    const line = [formatPhrase(role.title), formatPhrase(role.org)].filter(Boolean).join(' at ')
    if (line) concepts.push(line)
  }

  for (const school of form.education) {
    const line = [formatPhrase(school.degree), formatPhrase(school.institution)]
      .filter(Boolean)
      .join(' from ')
    if (line) concepts.push(line)
  }

  for (const cert of form.certifications) {
    if (cert.name.trim()) concepts.push(formatPhrase(cert.name.trim()))
  }

  const lead = resumeLead(form)
  if (lead) concepts.push(lead)

  return dedupeConcepts(concepts)
}

function educationLine(form: EndUserProfileForm): string {
  const school = form.education.find((entry) => entry.degree.trim() || entry.institution.trim())
  if (!school) return ''
  return [formatPhrase(school.degree), formatPhrase(school.institution)].filter(Boolean).join(' from ')
}

function withArticle(role: string): string {
  const lower = role.toLowerCase()
  if (/^(a|an|the)\s/.test(lower)) return role
  if (/^[aeiou]/i.test(role)) return `an ${role}`
  return `a ${role}`
}

/** One paragraph: place, work, volunteer, play — relaxed voice, no repeats. */
export function buildProfileSummaryText(input: ProfileSummaryInput): string {
  const { name, locationLabel, form, skillCategories, causeCategories, playCategories } = input
  const firstName = firstNameFrom(name)
  const role = resumeLead(form)
  const resumeFacts = resumeConcepts(form)
  const skills = filterNotSimilarTo(labelsForSelection(form.skills, skillCategories), resumeFacts)
  const causes = labelsForSelection(form.causes, causeCategories)
  const play = labelsForSelection(form.playInterests, playCategories)
  const education = educationLine(form)
  const training = filterNotSimilarTo(dedupeConcepts([education].filter(Boolean)), [
    ...resumeFacts,
    ...skills,
  ])

  const hasAnyContent =
    Boolean(locationLabel) ||
    Boolean(role) ||
    Boolean(form.resumeText.trim()) ||
    skills.length > 0 ||
    causes.length > 0 ||
    play.length > 0 ||
    training.length > 0

  if (!hasAnyContent) {
    return 'Tell us where you are, what you do for work, and what you care about—we’ll turn it into a short summary here.'
  }

  const sentences: string[] = []

  if (locationLabel && role) {
    sentences.push(`${firstName} is based in ${locationLabel} and works as ${withArticle(role)}.`)
  } else if (locationLabel) {
    sentences.push(`${firstName} is based in ${locationLabel}.`)
  } else if (role) {
    sentences.push(`${firstName} works as ${withArticle(role)}.`)
  } else if (form.resumeText.trim()) {
    sentences.push(`${firstName} has work experience on file—we’re still lining up the headline.`)
  }

  const workExtras = filterNotSimilarTo([...skills, ...training], role ? [role] : [])
  if (workExtras.length > 0) {
    sentences.push(`Day-to-day, that also means ${joinReadable(workExtras, 5)}.`)
  }

  if (causes.length > 0) {
    sentences.push(`Outside of work, ${firstName} cares about ${joinReadable(causes, 5)}.`)
  }

  if (play.length > 0) {
    sentences.push(`For fun, you'll usually find ${firstName} into ${joinReadable(play, 5)}.`)
  }

  if (sentences.length === 0) {
    return `${firstName} is on the map—add a little more detail when you edit and this summary will fill in.`
  }

  return sentences.join(' ')
}

export function taxonomyChipLabels(
  form: EndUserProfileForm,
  kind: 'skills' | 'causes' | 'playInterests',
  categories: ProfileTaxonomyCategory[]
): string[] {
  return labelsForSelection(form[kind], categories)
}
