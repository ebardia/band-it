/** Build read-only summary copy from resume-style profile fields. */

import type { EndUserProfileForm, ProfileTaxonomyCategory } from './endUserProfile'

export type ProfileSummaryInput = {
  name: string
  locationLabel: string
  form: EndUserProfileForm
  skillCategories: ProfileTaxonomyCategory[]
}

function selectedSkillLabels(form: EndUserProfileForm, categories: ProfileTaxonomyCategory[]): string[] {
  const labels: string[] = []
  for (const cat of categories) {
    if (form.skills.categoryIds.includes(cat.id)) labels.push(cat.label)
    for (const item of cat.items) {
      if (form.skills.itemIds.includes(item.id)) labels.push(item.label)
    }
  }
  return labels.slice(0, 6)
}

export function buildProfileSummaryText(input: ProfileSummaryInput): string {
  const { name, locationLabel, form, skillCategories } = input
  const skills = selectedSkillLabels(form, skillCategories)
  const parts: string[] = []

  if (form.workExperience.length > 0) {
    const latest = form.workExperience[0]
    const role = [latest.title, latest.org].filter(Boolean).join(' at ')
    if (role) parts.push(`${name} most recently worked as ${role}.`)
  }

  if (skills.length > 0) {
    const list =
      skills.length === 1
        ? skills[0]
        : skills.length === 2
          ? `${skills[0]} and ${skills[1]}`
          : `${skills.slice(0, -1).join(', ')}, and ${skills[skills.length - 1]}`
    parts.push(`Skills in the mix include ${list}.`)
  }

  if (locationLabel) {
    parts.push(`Based in ${locationLabel}.`)
  }

  if (parts.length === 0) {
    return 'Add your place and resume below so we can shape paid gigs, volunteer roles, and play around what fits you.'
  }

  return parts.join(' ')
}

export function taxonomyChipLabels(
  form: EndUserProfileForm,
  kind: 'skills' | 'causes' | 'playInterests',
  categories: ProfileTaxonomyCategory[]
): string[] {
  const sel = form[kind]
  const labels: string[] = []
  for (const cat of categories) {
    if (sel.categoryIds.includes(cat.id)) labels.push(cat.label)
    for (const item of cat.items) {
      if (sel.itemIds.includes(item.id)) labels.push(item.label)
    }
  }
  return labels
}
