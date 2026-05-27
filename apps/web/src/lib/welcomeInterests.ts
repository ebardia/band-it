export type WelcomeInterest = {
  id: string
  kicker: string
  title: string
  description: string
  action: 'profile' | 'band' | 'discover'
  templateId?: string
}

export const WELCOME_INTERESTS: WelcomeInterest[] = [
  {
    id: 'paid-work',
    kicker: 'For hire',
    title: 'Paid work & gigs',
    description: 'Build your profile so we can surface jobs, contracts, and projects that fit.',
    action: 'profile',
  },
  {
    id: 'cause',
    kicker: 'Good trouble',
    title: 'Causes & campaigns',
    description: 'Advocacy, organizing, and showing up where it counts.',
    action: 'band',
    templateId: 'cause',
  },
  {
    id: 'community',
    kicker: 'Neighbors',
    title: 'Community & mutual aid',
    description: 'Neighborhoods, local groups, and people who have each other’s backs.',
    action: 'band',
    templateId: 'community',
  },
  {
    id: 'creative',
    kicker: 'On stage',
    title: 'Creative collabs',
    description: 'Bands, art, theater, and projects that need a crew.',
    action: 'band',
    templateId: 'creative',
  },
  {
    id: 'browse',
    kicker: 'Window shopping',
    title: 'Still figuring it out',
    description: 'Browse what’s out there before you commit to anything.',
    action: 'discover',
  },
]
