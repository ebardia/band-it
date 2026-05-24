/** Build read-only summary copy — personal newspaper voice, rule-based. */

import type { EndUserProfileForm, ProfileTaxonomyCategory } from './endUserProfile'

export type ProfileSummaryInput = {
  name: string
  locationLabel: string
  form: EndUserProfileForm
  skillCategories: ProfileTaxonomyCategory[]
  causeCategories: ProfileTaxonomyCategory[]
  playCategories: ProfileTaxonomyCategory[]
}

function labelsFor(
  form: EndUserProfileForm,
  kind: 'skills' | 'causes' | 'playInterests',
  categories: ProfileTaxonomyCategory[],
  max = 5
): string[] {
  const sel = form[kind]
  const labels: string[] = []
  for (const cat of categories) {
    if (sel.categoryIds.includes(cat.id)) labels.push(cat.label)
    for (const item of cat.items) {
      if (sel.itemIds.includes(item.id)) labels.push(item.label)
    }
  }
  return labels.slice(0, max)
}

function joinReadable(items: string[], max = 4): string {
  const t = items.filter(Boolean)
  if (t.length === 0) return ''
  const shown = t.slice(0, max)
  const tail = t.length > max ? ` and ${t.length - max} more` : ''
  if (shown.length === 1) return shown[0] + tail
  if (shown.length === 2) return `${shown[0]} and ${shown[1]}${tail}`
  return `${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]}${tail}`
}

export function buildProfileSummaryText(input: ProfileSummaryInput): string {
  const { name, locationLabel, form, skillCategories, causeCategories, playCategories } = input
  const firstName = name.split(/\s+/)[0] || 'You'
  const skills = labelsFor(form, 'skills', skillCategories, 5)
  const causes = labelsFor(form, 'causes', causeCategories, 4)
  const play = labelsFor(form, 'playInterests', playCategories, 4)
  const parts: string[] = []

  if (form.workExperience.length > 0) {
    const latest = form.workExperience[0]
    const role = [latest.title, latest.org].filter(Boolean).join(' at ')
    if (role) {
      parts.push(`${firstName}'s latest chapter runs through ${role}.`)
    }
  }

  if (skills.length > 0) {
    parts.push(`On the clock, ${firstName} brings ${joinReadable(skills, 5)}.`)
  } else if (form.workExperience.length === 0 && (form.resumeText.trim() || form.resumeFileName)) {
    parts.push(`${firstName} has a résumé on file—we're still reading between the lines for skills.`)
  }

  if (causes.length > 0) {
    parts.push(`Off the clock but not off duty: energy for ${joinReadable(causes, 4)}.`)
  }

  if (play.length > 0) {
    parts.push(`For fun—and we mean it—${joinReadable(play, 4)}.`)
  }

  if (locationLabel) {
    parts.push(`The edition anchors near ${locationLabel}.`)
  }

  if (parts.length === 0) {
    return 'Your Daily is still the generic morning edition. Drop your place and résumé below—we’ll start writing you into the story: gigs, causes, and the occasional perfect Saturday.'
  }

  return parts.join(' ')
}

export function taxonomyChipLabels(
  form: EndUserProfileForm,
  kind: 'skills' | 'causes' | 'playInterests',
  categories: ProfileTaxonomyCategory[]
): string[] {
  return labelsFor(form, kind, categories, 24)
}
