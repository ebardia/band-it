/** Build read-only summary copy — superhero voice, rule-based, deduped per section. */

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
  return name.split(/\s+/)[0] || 'This hero'
}

function resumeLead(form: EndUserProfileForm): string {
  const firstRole = form.workExperience.find((entry) => entry.title.trim())
  if (firstRole) {
    return [firstRole.title, firstRole.org].filter(Boolean).join(' at ')
  }

  const lead = form.resumeText
    .trim()
    .split(/[.!?\n]/)
    .map((line) => line.trim())
    .find(Boolean)

  return lead ?? ''
}

function resumeConcepts(form: EndUserProfileForm): string[] {
  const concepts: string[] = []

  for (const role of form.workExperience) {
    if (role.title.trim()) concepts.push(role.title.trim())
    const line = [role.title, role.org].filter(Boolean).join(' at ')
    if (line) concepts.push(line)
  }

  for (const school of form.education) {
    const line = [school.degree, school.institution].filter(Boolean).join(' from ')
    if (line) concepts.push(line)
  }

  for (const cert of form.certifications) {
    if (cert.name.trim()) concepts.push(cert.name.trim())
  }

  const lead = resumeLead(form)
  if (lead) concepts.push(lead)

  return dedupeConcepts(concepts)
}

function educationLine(form: EndUserProfileForm): string {
  const school = form.education.find((entry) => entry.degree.trim() || entry.institution.trim())
  if (!school) return ''
  return [school.degree, school.institution].filter(Boolean).join(' from ')
}

function certificationLine(form: EndUserProfileForm): string {
  const names = dedupeConcepts(form.certifications.map((cert) => cert.name.trim()).filter(Boolean))
  if (names.length === 0) return ''
  return joinReadable(names, 3)
}

export function buildWorkSectionSummary(
  name: string,
  form: EndUserProfileForm,
  skillCategories: ProfileTaxonomyCategory[]
): string {
  const hero = firstNameFrom(name)
  const role = resumeLead(form)
  const resumeFacts = resumeConcepts(form)
  const toolkit = filterNotSimilarTo(labelsForSelection(form.skills, skillCategories), resumeFacts)
  const education = educationLine(form)
  const certifications = certificationLine(form)

  const hasResume =
    Boolean(role) ||
    Boolean(form.resumeText.trim()) ||
    form.workExperience.length > 0 ||
    form.education.length > 0 ||
    form.certifications.length > 0

  if (!hasResume && toolkit.length === 0) {
    return `${hero}'s professional origin story is still classified—file a résumé and pick your toolkit when you edit.`
  }

  const sentences: string[] = []

  if (role) {
    sentences.push(`By day, ${hero} answers to the call sign ${role}.`)
  } else if (form.resumeText.trim()) {
    sentences.push(`By day, ${hero} operates on the strength of a résumé that opens with real field experience.`)
  }

  if (toolkit.length > 0) {
    sentences.push(`The utility belt runs on ${joinReadable(toolkit, 6)}—no duplicate gear, just the powers that count.`)
  }

  const trainingBits = filterNotSimilarTo(
    dedupeConcepts([education, certifications].filter(Boolean)),
    [...resumeFacts, ...toolkit]
  )

  if (trainingBits.length > 0) {
    sentences.push(`Training logs cite ${joinReadable(trainingBits, 3)}.`)
  }

  if (sentences.length === 0) {
    return `${hero} has professional intel on file—the desk is still translating it into hero copy.`
  }

  return sentences.join(' ')
}

export function buildVolunteerSectionSummary(
  name: string,
  form: EndUserProfileForm,
  causeCategories: ProfileTaxonomyCategory[]
): string {
  const hero = firstNameFrom(name)
  const causes = labelsForSelection(form.causes, causeCategories)

  if (causes.length === 0) {
    return `${hero} hasn't declared a community mission yet—pick the causes you'd suit up for when you edit.`
  }

  return `When the city needs backup without a paycheck, ${hero} deploys for ${joinReadable(causes, 6)}—good trouble, zero secret identity required.`
}

export function buildPlaySectionSummary(
  name: string,
  form: EndUserProfileForm,
  playCategories: ProfileTaxonomyCategory[]
): string {
  const hero = firstNameFrom(name)
  const play = labelsForSelection(form.playInterests, playCategories)

  if (play.length === 0) {
    return `${hero}'s off-duty lair is still a mystery—add what you do for fun when you edit.`
  }

  return `Off the clock, ${hero} recharges through ${joinReadable(play, 6)}—because every hero needs a hobby, a hideout, and something that isn't a deadline.`
}

/** Edition-level summary — basics only; work / volunteer / play live in their sections. */
export function buildProfileSummaryText(input: ProfileSummaryInput): string {
  const { name, locationLabel, form } = input
  const hero = firstNameFrom(name)
  const hasWork =
    Boolean(resumeLead(form)) ||
    Boolean(form.resumeText.trim()) ||
    form.skills.categoryIds.length > 0 ||
    form.skills.itemIds.length > 0
  const hasVolunteer = form.causes.categoryIds.length > 0 || form.causes.itemIds.length > 0
  const hasPlay = form.playInterests.categoryIds.length > 0 || form.playInterests.itemIds.length > 0

  if (locationLabel) {
    const desks: string[] = []
    if (hasWork) desks.push('work')
    if (hasVolunteer) desks.push('volunteer')
    if (hasPlay) desks.push('play')
    const deskLine =
      desks.length > 0
        ? `The ${desks.join(', ')} desks below spell out the rest in one voice each.`
        : 'Fill in the desks below and this edition gets sharper fast.'
    return `${hero}'s edition files from ${locationLabel}. ${deskLine}`
  }

  if (hasWork || hasVolunteer || hasPlay) {
    return `${hero} is on the roster. Anchor your place below, then read each desk's hero summary for work, community, and downtime.`
  }

  return 'Your Daily is still the generic morning edition. Drop your place and résumé below—we’ll start writing you into the story: gigs, causes, and the occasional perfect Saturday.'
}

export function taxonomyChipLabels(
  form: EndUserProfileForm,
  kind: 'skills' | 'causes' | 'playInterests',
  categories: ProfileTaxonomyCategory[]
): string[] {
  return labelsForSelection(form[kind], categories)
}
