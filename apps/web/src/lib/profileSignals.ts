/** Profile signal depth + Daily preview / next moves — newspaper voice, rule-based. */

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
      title: 'Pin your place on the map',
      detail: 'Required—so local gigs, volunteer shifts, and weirdly perfect events know where to find you.',
    })
  }
  if (!form.resumeText.trim() && !form.resumeFileId && !form.resumeFileName) {
    moves.push({
      id: 'resume',
      title: 'File your résumé with the desk',
      detail: 'Paste or upload PDF, DOCX, or TXT. We’ll decode it into editable sections—no fax machine required.',
    })
  }
  if (
    form.skills.itemIds.length === 0 &&
    form.skills.categoryIds.length === 0 &&
    moves.length < max
  ) {
    moves.push({
      id: 'skills',
      title: 'Check off what you can do',
      detail: 'No fresh résumé? Pick skills from the list anyway—paid work doesn’t always read your PDF.',
    })
  }
  if (
    form.causes.itemIds.length === 0 &&
    form.causes.categoryIds.length === 0 &&
    moves.length < max
  ) {
    moves.push({
      id: 'causes',
      title: 'Name the causes you’d show up for',
      detail: 'Optional—but it’s how mutual aid and volunteer listings find their way into your Daily.',
    })
  }
  if (
    form.playInterests.itemIds.length === 0 &&
    form.playInterests.categoryIds.length === 0 &&
    moves.length < max
  ) {
    moves.push({
      id: 'play',
      title: 'Add what you do for fun',
      detail: 'Optional—hobbies, scenes, and offbeat events stay quiet until you give us a hint.',
    })
  }

  return moves.slice(0, max)
}

export function buildEditionPreviewLines(form: EndUserProfileForm, chips: string[]): string[] {
  const lines: string[] = []

  if (chips.length >= 3) {
    lines.push(
      `From your tags, tomorrow’s edition will lean toward “${chips[0]}”, “${chips[1]}”, and “${chips[2]}”—always filtered through your bands and what you’ve actually signed up for.`
    )
  } else if (chips.length > 0) {
    lines.push(
      `Early signals: ${chips.slice(0, 8).join(', ')}. The more tags on the page, the less generic your Daily feels.`
    )
  } else {
    lines.push(
      'Right now your Daily reads like everyone else’s morning paper. Fill in a few sections and it starts sounding like yours.'
    )
  }

  if (form.locationLabel) {
    lines.push(`Local and regional items—when we run them—anchor to ${form.locationLabel}.`)
  } else {
    lines.push('Without a place on the map, local flavor stays thin on purpose—we’re not guessing your ZIP code.')
  }

  lines.push(
    'Culture, galleries, and hobby-adjacent listings stay conservative until Play and Volunteer have something to work with.'
  )

  return lines
}
