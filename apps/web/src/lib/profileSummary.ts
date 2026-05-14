/** Build read-only summary copy + chips from profile fields (no extra schema). */

export type ProfileFields = {
  name: string
  zipcode: string | null
  strengths: string[]
  weaknesses: string[]
  passions: string[]
  developmentPath: string[]
}

function cleanList(items: string[]): string[] {
  return items
    .map((s) => s.trim())
    .filter(Boolean)
}

function joinReadable(items: string[], max = 4): string {
  const t = cleanList(items)
  if (t.length === 0) return ''
  const shown = t.slice(0, max)
  const tail = t.length > max ? ` and ${t.length - max} more` : ''
  if (shown.length === 1) return shown[0] + tail
  if (shown.length === 2) return `${shown[0]} and ${shown[1]}${tail}`
  return `${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]}${tail}`
}

export function buildProfileSummaryText(p: ProfileFields): string {
  const strengths = joinReadable(p.strengths, 5)
  const passions = joinReadable(p.passions, 5)
  const learning = joinReadable(p.developmentPath, 4)
  const zip = (p.zipcode || '').trim()

  const parts: string[] = []
  if (strengths) {
    parts.push(`You bring ${strengths}${passions ? `, with energy around ${passions}` : ''}.`)
  } else if (passions) {
    parts.push(`You're drawn to ${passions}.`)
  }
  if (learning) {
    parts.push(`You're building toward ${learning}.`)
  }
  const growth = joinReadable(p.weaknesses, 4)
  if (growth) {
    parts.push(`You're working on ${growth}.`)
  }
  if (zip) {
    parts.push(`You're based near ${zip}.`)
  }
  if (parts.length === 0) {
    return 'Add a few details below so we can shape your edition around what matters to you.'
  }
  return parts.join(' ')
}

export function toChips(csv: string, max = 12): string[] {
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max)
}
