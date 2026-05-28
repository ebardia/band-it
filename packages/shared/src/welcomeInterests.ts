export type ProfileFocusSection = 'place' | 'work' | 'skills' | 'causes' | 'play'

export type WelcomeInterest = {
  id: string
  kicker: string
  title: string
  description: string
  profileSections: ProfileFocusSection[]
}

export const WELCOME_INTERESTS: WelcomeInterest[] = [
  {
    id: 'paid-work',
    kicker: 'For hire',
    title: 'Paid work & gigs',
    description: 'Build your profile so we can surface jobs, contracts, and projects that fit.',
    profileSections: ['place', 'work', 'skills'],
  },
  {
    id: 'cause',
    kicker: 'Good trouble',
    title: 'Causes & campaigns',
    description: 'Advocacy, organizing, and showing up where it counts.',
    profileSections: ['causes'],
  },
  {
    id: 'community',
    kicker: 'Neighbors',
    title: 'Community & mutual aid',
    description: 'Neighborhoods, local groups, and people who have each other’s backs.',
    profileSections: ['place', 'causes'],
  },
  {
    id: 'creative',
    kicker: 'On stage',
    title: 'Creative collabs',
    description: 'Bands, art, theater, and projects that need a crew.',
    profileSections: ['play'],
  },
  {
    id: 'browse',
    kicker: 'Window shopping',
    title: 'Still figuring it out',
    description: 'Stay on your Daily — opportunities will sharpen as you add to your profile.',
    profileSections: [],
  },
]

export const WELCOME_INTEREST_IDS = WELCOME_INTERESTS.map((item) => item.id)

const interestById = new Map(WELCOME_INTERESTS.map((item) => [item.id, item]))

export function isWelcomeInterestId(id: string): boolean {
  return interestById.has(id)
}

export function profileSectionsForInterestIds(interestIds: string[]): ProfileFocusSection[] {
  const sections = new Set<ProfileFocusSection>()
  for (const id of interestIds) {
    const interest = interestById.get(id)
    if (!interest) continue
    for (const section of interest.profileSections) {
      sections.add(section)
    }
  }
  const order: ProfileFocusSection[] = ['place', 'work', 'skills', 'causes', 'play']
  return order.filter((section) => sections.has(section))
}

export function profilePathForInterestIds(interestIds: string[]): string {
  const sections = profileSectionsForInterestIds(interestIds)
  if (sections.length === 0) return '/user-dashboard/profile'
  return `/user-dashboard/profile?sections=${sections.join(',')}`
}

export const PROFILE_FOCUS_SECTION_IDS: Record<ProfileFocusSection, string> = {
  place: 'profile-section-place',
  work: 'profile-section-work',
  skills: 'profile-section-skills',
  causes: 'profile-section-causes',
  play: 'profile-section-play',
}
