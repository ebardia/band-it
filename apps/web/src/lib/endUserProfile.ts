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
