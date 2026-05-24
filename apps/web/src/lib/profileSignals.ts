/** Profile signal depth + preview / next moves (rule-based). */

import type { EndUserProfileForm } from './endUserProfile'

export function countProfileSignals(form: EndUserProfileForm): {
  filled: number
  total: number
  percent: number
} {
  const checks = [
    !!form.locationId,
    !!(form.resumeText.trim() || form.resumeFileId || form.resumeFileName),
    form.workExperience.length > 0 || form.skills.itemIds.length > 0 || form.skills.categoryIds.length > 0,
    form.causes.itemIds.length > 0 || form.causes.categoryIds.length > 0,
    form.playInterests.itemIds.length > 0 || form.playInterests.categoryIds.length > 0,
  ]
  const filled = checks.filter(Boolean).length
  return { filled, total: checks.length, percent: Math.round((filled / checks.length) * 100) }
}

export type NextMove = { id: string; title: string; detail: string }

export function buildNextMoves(form: EndUserProfileForm, max = 3): NextMove[] {
  const moves: NextMove[] = []

  if (!form.locationId) {
    moves.push({
      id: 'place',
      title: 'Add your place',
      detail: 'Required for local gigs, volunteer shifts, and regional play.',
    })
  }
  if (!form.resumeText.trim() && !form.resumeFileId && !form.resumeFileName) {
    moves.push({
      id: 'resume',
      title: 'Add your resume',
      detail: 'Paste or upload PDF, DOCX, or TXT — we parse it into editable sections.',
    })
  }
  if (
    form.skills.itemIds.length === 0 &&
    form.skills.categoryIds.length === 0 &&
    moves.length < max
  ) {
    moves.push({
      id: 'skills',
      title: 'Select skills',
      detail: 'No updated resume? Pick from the skills taxonomy so paid gigs can find you.',
    })
  }
  if (
    form.causes.itemIds.length === 0 &&
    form.causes.categoryIds.length === 0 &&
    moves.length < max
  ) {
    moves.push({
      id: 'causes',
      title: 'Choose volunteer causes',
      detail: 'Optional — steers mutual-aid and nonprofit opportunities.',
    })
  }
  if (
    form.playInterests.itemIds.length === 0 &&
    form.playInterests.categoryIds.length === 0 &&
    moves.length < max
  ) {
    moves.push({
      id: 'play',
      title: 'Add play interests',
      detail: 'Optional — hobbies, events, and fun activities in your edition.',
    })
  }

  return moves.slice(0, max)
}

export function buildEditionPreviewLines(form: EndUserProfileForm, skillLabels: string[]): string[] {
  const lines: string[] = []

  if (skillLabels.length >= 2) {
    lines.push(
      `Paid gig matching will lean on skills like “${skillLabels[0]}” and “${skillLabels[1]}” once your profile is saved.`
    )
  } else if (skillLabels.length === 1) {
    lines.push(`Early work signal: ${skillLabels[0]}. More selections sharpen fit.`)
  } else {
    lines.push('Work matching stays broad until skills or parsed resume experience are on file.')
  }

  if (form.locationLabel) {
    lines.push(`Local opportunities anchor to ${form.locationLabel}.`)
  } else {
    lines.push('Place is required — we do not guess your location.')
  }

  lines.push('Volunteer and play surfaces stay conservative until those sections have selections.')

  return lines
}
