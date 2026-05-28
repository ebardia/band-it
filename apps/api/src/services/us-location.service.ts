import zipcodes from 'zipcodes'
import { prisma } from '../lib/prisma'

export type UsLocationResult = {
  id: string
  city: string
  state: string
  zip: string
  label: string
}

type ZipInfo = {
  zip: string
  city: string
  state: string
}

const zipCodes = zipcodes.codes as Record<string, ZipInfo>
const allZipKeys = Object.keys(zipCodes)

function formatLabel(city: string, state: string, zip: string): string {
  return `${city}, ${state} ${zip}`
}

function toResult(info: ZipInfo): UsLocationResult {
  return {
    id: `zip:${info.zip}:${info.city}:${info.state}`,
    city: info.city,
    state: info.state,
    zip: info.zip,
    label: formatLabel(info.city, info.state, info.zip),
  }
}

function pushUnique(
  seen: Set<string>,
  candidates: { result: UsLocationResult; score: number }[],
  info: ZipInfo,
  score: number
) {
  if (!info?.city || !info?.state || !info?.zip) return
  const dedupeKey = `${info.city}|${info.state}|${info.zip}`
  if (seen.has(dedupeKey)) return
  seen.add(dedupeKey)
  candidates.push({ score, result: toResult(info) })
}

/** Search all US ZIP codes — not limited to seeded major cities. */
export function searchUsLocations(query: string, limit = 12): UsLocationResult[] {
  const q = query.trim()
  if (!q) return []

  const qLower = q.toLowerCase()
  const seen = new Set<string>()
  const candidates: { result: UsLocationResult; score: number }[] = []

  // Fast path: exact 5-digit ZIP
  if (/^\d{5}$/.test(q)) {
    const exact = zipCodes[q] ?? zipcodes.lookup(q)
    if (exact?.city && exact?.state) {
      return [toResult(exact)]
    }
    return []
  }

  // ZIP prefix (1–4 digits): scan keys only
  if (/^\d{1,4}$/.test(q)) {
    for (const zip of allZipKeys) {
      if (!zip.startsWith(q)) continue
      pushUnique(seen, candidates, zipCodes[zip], zip === q ? 100 : 90)
    }
  } else {
    // City / state / label text search
    for (const zip of allZipKeys) {
      const info = zipCodes[zip]
      if (!info) continue

      let score = 0
      if (info.city.toLowerCase() === qLower) score = 85
      else if (info.city.toLowerCase().startsWith(qLower)) score = 75
      else if (info.state.toLowerCase() === qLower) score = 70
      else if (info.city.toLowerCase().includes(qLower)) score = 60
      else if (formatLabel(info.city, info.state, info.zip).toLowerCase().includes(qLower)) score = 50
      else continue

      pushUnique(seen, candidates, info, score)
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score || a.result.label.localeCompare(b.result.label))
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
  // Prefer the explicitly selected location id; only use the raw
  // city/state/zip fallback when no id was supplied, so stale or edited
  // fallback values can't override the user's actual pick.
  if (locationId && !locationId.startsWith('zip:')) {
    const existing = await prisma.usLocation.findUnique({ where: { id: locationId } })
    if (existing) return existing
  }

  if (locationId?.startsWith('zip:')) {
    const zip = locationId.split(':')[1]
    const info = zipCodes[zip] ?? zipcodes.lookup(zip)
    if (info) {
      return ensureUsLocation(info.city, info.state, zip)
    }
  }

  if (fallback?.city && fallback?.state && fallback?.zip) {
    return ensureUsLocation(fallback.city, fallback.state, fallback.zip)
  }

  return null
}
