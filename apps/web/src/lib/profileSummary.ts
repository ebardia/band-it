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

/** Strip first-person intros so "I am a software developer" → "software developer". */
function cleanJobTitle(value: string): string {
  let title = formatPhrase(value.trim())
  title = title.replace(/^I am (a|an|the) /i, '')
  title = title.replace(/^I'm (a|an|the) /i, '')
  title = title.replace(/^I work as (a|an|the)? ?/i, '')
  return title.trim()
}

function jobLine(entry: { title: string; org: string }): string {
  const title = cleanJobTitle(entry.title)
  const org = formatPhrase(entry.org)
  if (title && org) return `${title} at ${org}`
  return title || org
}

function jobsFromForm(form: EndUserProfileForm): string[] {
  const fromStructured = form.workExperience
    .map((entry) => jobLine(entry))
    .filter(Boolean)

  if (fromStructured.length > 0) return dedupeConcepts(fromStructured)

  const lead = form.resumeText
    .trim()
    .split(/[.!?\n]/)
    .map((line) => line.trim())
    .find(Boolean)

  return lead ? [cleanJobTitle(lead)] : []
}

function resumeConcepts(form: EndUserProfileForm): string[] {
  const concepts: string[] = []

  for (const role of form.workExperience) {
    const line = jobLine(role)
    if (line) concepts.push(line)
    if (role.title.trim()) concepts.push(cleanJobTitle(role.title.trim()))
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

  concepts.push(...jobsFromForm(form))

  return dedupeConcepts(concepts)
}

function educationLine(form: EndUserProfileForm): string {
  const school = form.education.find((entry) => entry.degree.trim() || entry.institution.trim())
  if (!school) return ''
  return [formatPhrase(school.degree), formatPhrase(school.institution)].filter(Boolean).join(' from ')
}

function certificationLine(form: EndUserProfileForm): string {
  const names = dedupeConcepts(form.certifications.map((cert) => cert.name.trim()).filter(Boolean))
  if (names.length === 0) return ''
  return joinReadable(names, 3)
}

function withArticle(role: string): string {
  const lower = role.toLowerCase()
  if (/^(a|an|the)\s/.test(lower)) return role
  if (/^[aeiou]/i.test(role)) return `an ${role}`
  return `a ${role}`
}

function formatPrimaryRole(role: string): string {
  const cleaned = cleanJobTitle(role)
  if (!cleaned) return ''
  const wordCount = cleaned.split(/\s+/).length
  if (wordCount <= 8 && !/[.!?]/.test(cleaned)) {
    return withArticle(cleaned)
  }
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1)
}

function summaryLocation(form: EndUserProfileForm, locationLabel: string): string {
  if (form.locationCity.trim() && form.locationState.trim()) {
    return `${form.locationCity.trim()}, ${form.locationState.trim().toUpperCase()}`
  }
  return locationLabel.replace(/\s+\d{5}(-\d{4})?$/, '').trim()
}

/** One paragraph: place, work, volunteer, play — first person, relaxed, no repeats. */
export function buildProfileSummaryText(input: ProfileSummaryInput): string {
  const { locationLabel, form, skillCategories, causeCategories, playCategories } = input
  const place = summaryLocation(form, locationLabel)
  const jobs = jobsFromForm(form)
  const primaryRole = jobs[0] ?? ''
  const otherRoles = filterNotSimilarTo(jobs.slice(1), primaryRole ? [primaryRole] : [])
  const resumeFacts = resumeConcepts(form)
  const skills = filterNotSimilarTo(labelsForSelection(form.skills, skillCategories), resumeFacts)
  const causes = labelsForSelection(form.causes, causeCategories)
  const play = labelsForSelection(form.playInterests, playCategories)
  const education = educationLine(form)
  const certifications = certificationLine(form)
  const training = filterNotSimilarTo(dedupeConcepts([education, certifications].filter(Boolean)), [
    ...resumeFacts,
    ...skills,
    ...jobs,
  ])

  const hasAnyContent =
    Boolean(place) ||
    jobs.length > 0 ||
    Boolean(form.resumeText.trim()) ||
    skills.length > 0 ||
    causes.length > 0 ||
    play.length > 0 ||
    training.length > 0

  if (!hasAnyContent) {
    return 'Tell us where you are, what you do for work, and what you care about—we’ll turn it into a short summary here.'
  }

  const sentences: string[] = []

  if (place && primaryRole) {
    sentences.push(`I'm based in ${place} and work as ${formatPrimaryRole(primaryRole)}.`)
  } else if (place) {
    sentences.push(`I'm based in ${place}.`)
  } else if (primaryRole) {
    sentences.push(`I work as ${formatPrimaryRole(primaryRole)}.`)
  } else if (form.resumeText.trim()) {
    sentences.push(`I have a résumé on file with more detail than we’ve pulled into this line yet.`)
  }

  if (otherRoles.length > 0) {
    sentences.push(`My background also includes ${joinReadable(otherRoles, 3)}.`)
  }

  const workExtras = filterNotSimilarTo([...skills, ...training], [...jobs, primaryRole].filter(Boolean))
  if (workExtras.length > 0) {
    sentences.push(`Day-to-day, that also means ${joinReadable(workExtras, 5)}.`)
  }

  if (causes.length > 0) {
    sentences.push(`Outside of work, I care about ${joinReadable(causes, 5)}.`)
  }

  if (play.length > 0) {
    sentences.push(`For fun, I'm usually into ${joinReadable(play, 5)}.`)
  }

  if (sentences.length === 0) {
    return `I'm on the map—add a little more detail when you edit and this summary will fill in.`
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
