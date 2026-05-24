import zipcodes from 'zipcodes'
import { prisma } from '../lib/prisma'

export type UsLocationResult = {
  id: string
  city: string
  state: string
  zip: string
  label: string
}

function formatLabel(city: string, state: string, zip: string): string {
  return `${city}, ${state} ${zip}`
}

/** Search all US ZIP codes (via zipcodes package) — not limited to seeded cities. */
export function searchUsLocations(query: string, limit = 12): UsLocationResult[] {
  const q = query.trim()
  if (!q) return []

  const qLower = q.toLowerCase()
  const isZipQuery = /^\d{3,5}$/.test(q)
  const seen = new Set<string>()
  const candidates: { result: UsLocationResult; score: number }[] = []

  for (const zip of Object.keys(zipcodes.zipcodes)) {
    const info = zipcodes.lookup(zip)
    if (!info?.city || !info?.state) continue

    const label = formatLabel(info.city, info.state, zip)
    let score = 0

    if (info.zip === q) score = 100
    else if (isZipQuery && info.zip.startsWith(q)) score = 90
    else if (info.city.toLowerCase() === qLower) score = 85
    else if (info.city.toLowerCase().startsWith(qLower)) score = 75
    else if (info.state.toLowerCase() === qLower) score = 70
    else if (info.city.toLowerCase().includes(qLower)) score = 60
    else if (label.toLowerCase().includes(qLower)) score = 50
    else continue

    const dedupeKey = `${info.city}|${info.state}|${zip}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    candidates.push({
      score,
      result: {
        id: `zip:${zip}:${info.city}:${info.state}`,
        city: info.city,
        state: info.state,
        zip,
        label,
      },
    })
  }

  return candidates
    .sort(
      (a, b) => b.score - a.score || a.result.label.localeCompare(b.result.label)
    )
    .slice(0, limit)
    .map((c) => c.result)
}

/** Persist a selected ZIP row so profile.locationId references the database. */
export async function ensureUsLocation(city: string, state: string, zip: string) {
  const label = formatLabel(city, state.toUpperCase(), zip)
  return prisma.usLocation.upsert({
    where: {
      city_state_zip: {
        city,
        state: state.toUpperCase(),
        zip,
      },
    },
    create: {
      city,
      state: state.toUpperCase(),
      zip,
      label,
    },
    update: { label },
  })
}

export async function resolveProfileLocation(
  locationId: string | undefined,
  fallback: { city: string; state: string; zip: string } | undefined
) {
  if (fallback?.city && fallback?.state && fallback?.zip) {
    return ensureUsLocation(fallback.city, fallback.state, fallback.zip)
  }

  if (locationId && !locationId.startsWith('zip:')) {
    const existing = await prisma.usLocation.findUnique({ where: { id: locationId } })
    if (existing) return existing
  }

  if (locationId?.startsWith('zip:')) {
    const parts = locationId.split(':')
    const zip = parts[1]
    const info = zipcodes.lookup(zip)
    if (info) {
      return ensureUsLocation(info.city, info.state, zip)
    }
  }

  return null
}
