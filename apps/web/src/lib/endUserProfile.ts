export type WorkExperienceEntry = {
  title: string
  org: string
  startDate?: string
  endDate?: string
  description?: string
}

export type EducationEntry = {
  degree: string
  institution: string
  startDate?: string
  endDate?: string
}

export type CertificationEntry = {
  name: string
  issuer?: string
  date?: string
}

export type TaxonomySelection = {
  categoryIds: string[]
  itemIds: string[]
}

export type ProfileTaxonomyCategory = {
  id: string
  kind: 'SKILL' | 'CAUSE' | 'PLAY'
  slug: string
  label: string
  items: { id: string; slug: string; label: string }[]
}

export type UsLocationOption = {
  id: string
  city: string
  state: string
  zip: string
  label: string
}

export type EndUserProfileForm = {
  locationId: string
  locationLabel: string
  locationCity: string
  locationState: string
  locationZip: string
  resumeText: string
  resumeFileId: string | null
  resumeFileName: string | null
  workExperience: WorkExperienceEntry[]
  education: EducationEntry[]
  certifications: CertificationEntry[]
  skills: TaxonomySelection
  causes: TaxonomySelection
  playInterests: TaxonomySelection
}

export const EMPTY_PROFILE_FORM: EndUserProfileForm = {
  locationId: '',
  locationLabel: '',
  locationCity: '',
  locationState: '',
  locationZip: '',
  resumeText: '',
  resumeFileId: null,
  resumeFileName: null,
  workExperience: [],
  education: [],
  certifications: [],
  skills: { categoryIds: [], itemIds: [] },
  causes: { categoryIds: [], itemIds: [] },
  playInterests: { categoryIds: [], itemIds: [] },
}

/** Shape returned by `trpc.profile.get` for a single user's profile. */
export type ProfilePayload = {
  locationId: string | null
  location: { label: string; city?: string; state?: string; zip?: string } | null
  resumeText: string | null
  resumeFileId: string | null
  resumeFile: { originalName: string } | null
  workExperience: unknown
  education: unknown
  certifications: unknown
  skills: TaxonomySelection
  causes: TaxonomySelection
  playInterests: TaxonomySelection
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/**
 * Canonical mapper from the persisted profile payload to the editable form.
 * JSON fields are guarded with `Array.isArray` so malformed data can't crash
 * downstream consumers. Used by the profile page and the daily onboarding.
 */
export function profileToForm(profile: ProfilePayload): EndUserProfileForm {
  return {
    locationId: profile.locationId ?? '',
    locationLabel: profile.location?.label ?? '',
    locationCity: profile.location?.city ?? '',
    locationState: profile.location?.state ?? '',
    locationZip: profile.location?.zip ?? '',
    resumeText: profile.resumeText ?? '',
    resumeFileId: profile.resumeFileId,
    resumeFileName: profile.resumeFile?.originalName ?? null,
    workExperience: asArray<WorkExperienceEntry>(profile.workExperience),
    education: asArray<EducationEntry>(profile.education),
    certifications: asArray<CertificationEntry>(profile.certifications),
    skills: profile.skills,
    causes: profile.causes,
    playInterests: profile.playInterests,
  }
}
