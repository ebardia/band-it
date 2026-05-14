/** Profile “signals” depth + copy for preview / next moves (no AI; rule-based only). */

export type ProfileFormShape = {
  zipcode: string
  strengths: string
  weaknesses: string
  passions: string
  developmentPath: string
}

const SIGNAL_FIELDS: (keyof ProfileFormShape)[] = [
  'zipcode',
  'strengths',
  'weaknesses',
  'passions',
  'developmentPath',
]

export function countProfileSignals(fd: ProfileFormShape): { filled: number; total: number; percent: number } {
  const filled = SIGNAL_FIELDS.filter((k) => fd[k].trim().length > 0).length
  const total = SIGNAL_FIELDS.length
  return { filled, total, percent: Math.round((filled / total) * 100) }
}

export type NextMove = { id: string; title: string; detail: string }

export function buildNextMoves(fd: ProfileFormShape, max = 3): NextMove[] {
  const moves: NextMove[] = []

  if (!fd.strengths.trim()) {
    moves.push({
      id: 'strengths',
      title: 'Name a few strengths',
      detail: 'Even three skills sharpen what we can match you to—paid work, volunteer roles, and band tasks.',
    })
  }
  if (!fd.passions.trim()) {
    moves.push({
      id: 'passions',
      title: 'Add what moves you',
      detail: 'Passions steer culture, hobbies, and slower “human world” items in your Daily—not only jobs.',
    })
  }
  if (!fd.zipcode.trim()) {
    moves.push({
      id: 'zip',
      title: 'Optional: add a postal code',
      detail: 'When we have local items, this keeps them relevant without guessing.',
    })
  }
  if (!fd.developmentPath.trim() && moves.length < max) {
    moves.push({
      id: 'learn',
      title: 'Say what you want to learn next',
      detail: 'Growth edges help mentors, trainings, and stretch projects find you.',
    })
  }
  if (!fd.weaknesses.trim() && moves.length < max) {
    moves.push({
      id: 'growth',
      title: 'Note where you are stretching',
      detail: 'Honest growth areas build trust with collaborators and improve fit—not a performance review.',
    })
  }

  return moves.slice(0, max)
}

/**
 * Honest, static-ish preview lines derived only from current fields (until a real edition engine exists).
 */
export function buildEditionPreviewLines(fd: ProfileFormShape, chips: string[]): string[] {
  const lines: string[] = []

  if (chips.length >= 3) {
    lines.push(
      `From your tags, we will bias opportunity and project surfaces toward themes like “${chips[0]}”, “${chips[1]}”, and “${chips[2]}”—always alongside your bands and permissions.`
    )
  } else if (chips.length > 0) {
    lines.push(
      `Early signals: ${chips.slice(0, 8).join(', ')}. As this list grows, matching gets steadier and less generic.`
    )
  } else {
    lines.push(
      'Once strengths, passions, or learning goals are on the page, your Daily can move from “generic” toward “specific to you.”'
    )
  }

  if (fd.zipcode.trim()) {
    lines.push(`Local and regional items—when we run them—will anchor to ${fd.zipcode.trim()}.`)
  } else {
    lines.push('Without a postal code, local flavor stays minimal on purpose—we do not want to guess your place.')
  }

  lines.push(
    'Culture, books, galleries, and hobby-adjacent items stay conservative until passions are richer; agents will respect that ceiling.'
  )

  return lines
}
