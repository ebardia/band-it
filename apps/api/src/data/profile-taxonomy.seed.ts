import type { ProfileTaxonomyKind } from '@prisma/client'

export type TaxonomySeedCategory = {
  slug: string
  label: string
  items: { slug: string; label: string }[]
}

export const PROFILE_TAXONOMY_SEED: Record<ProfileTaxonomyKind, TaxonomySeedCategory[]> = {
  SKILL: [
    {
      slug: 'writing-content',
      label: 'Writing & Content',
      items: [
        { slug: 'copywriting', label: 'Copywriting' },
        { slug: 'technical-writing', label: 'Technical writing' },
        { slug: 'journalism', label: 'Journalism' },
        { slug: 'editing', label: 'Editing' },
        { slug: 'grant-writing', label: 'Grant writing' },
        { slug: 'scriptwriting', label: 'Scriptwriting' },
      ],
    },
    {
      slug: 'design-creative',
      label: 'Design & Creative',
      items: [
        { slug: 'graphic-design', label: 'Graphic design' },
        { slug: 'ux-ui', label: 'UX/UI' },
        { slug: 'illustration', label: 'Illustration' },
        { slug: 'video', label: 'Video' },
        { slug: 'photography', label: 'Photography' },
        { slug: 'animation', label: 'Animation' },
      ],
    },
    {
      slug: 'marketing',
      label: 'Marketing',
      items: [
        { slug: 'social-media', label: 'Social media' },
        { slug: 'seo', label: 'SEO' },
        { slug: 'paid-ads', label: 'Paid ads' },
        { slug: 'email', label: 'Email' },
        { slug: 'brand-strategy', label: 'Brand strategy' },
        { slug: 'content-marketing', label: 'Content marketing' },
      ],
    },
    {
      slug: 'technology',
      label: 'Technology',
      items: [
        { slug: 'software-dev', label: 'Software dev' },
        { slug: 'web-dev', label: 'Web dev' },
        { slug: 'data-analysis', label: 'Data analysis' },
        { slug: 'ai-ml', label: 'AI/ML' },
        { slug: 'it-support', label: 'IT/support' },
        { slug: 'qa', label: 'QA' },
      ],
    },
    {
      slug: 'business-ops',
      label: 'Business & Ops',
      items: [
        { slug: 'project-management', label: 'Project management' },
        { slug: 'operations', label: 'Operations' },
        { slug: 'finance-accounting', label: 'Finance/accounting' },
        { slug: 'hr', label: 'HR' },
        { slug: 'admin', label: 'Admin' },
      ],
    },
    {
      slug: 'research-analysis',
      label: 'Research & Analysis',
      items: [
        { slug: 'market-research', label: 'Market research' },
        { slug: 'policy-research', label: 'Policy research' },
        { slug: 'data-science', label: 'Data science' },
        { slug: 'ux-research', label: 'UX research' },
      ],
    },
    {
      slug: 'communications',
      label: 'Communications',
      items: [
        { slug: 'pr', label: 'PR' },
        { slug: 'community-management', label: 'Community management' },
        { slug: 'translation', label: 'Translation' },
        { slug: 'public-speaking', label: 'Public speaking' },
      ],
    },
    {
      slug: 'education-training',
      label: 'Education & Training',
      items: [
        { slug: 'teaching', label: 'Teaching' },
        { slug: 'curriculum-design', label: 'Curriculum design' },
        { slug: 'coaching', label: 'Coaching' },
        { slug: 'facilitation', label: 'Facilitation' },
      ],
    },
    {
      slug: 'trades-hands-on',
      label: 'Trades & Hands-on',
      items: [
        { slug: 'construction', label: 'Construction' },
        { slug: 'repair', label: 'Repair' },
        { slug: 'fabrication', label: 'Fabrication' },
        { slug: 'event-production', label: 'Event production' },
      ],
    },
  ],
  CAUSE: [
    {
      slug: 'community-local',
      label: 'Community & Local',
      items: [
        { slug: 'neighborhood', label: 'Neighborhood' },
        { slug: 'mutual-aid', label: 'Mutual aid' },
        { slug: 'homelessness', label: 'Homelessness' },
        { slug: 'food-security', label: 'Food security' },
      ],
    },
    {
      slug: 'education-youth',
      label: 'Education & Youth',
      items: [
        { slug: 'tutoring', label: 'Tutoring' },
        { slug: 'mentoring', label: 'Mentoring' },
        { slug: 'literacy', label: 'Literacy' },
        { slug: 'youth-programs', label: 'Youth programs' },
      ],
    },
    {
      slug: 'environment',
      label: 'Environment',
      items: [
        { slug: 'conservation', label: 'Conservation' },
        { slug: 'climate', label: 'Climate' },
        { slug: 'cleanups', label: 'Cleanups' },
        { slug: 'sustainability', label: 'Sustainability' },
      ],
    },
    {
      slug: 'health-wellbeing',
      label: 'Health & Wellbeing',
      items: [
        { slug: 'public-health', label: 'Public health' },
        { slug: 'mental-health', label: 'Mental health' },
        { slug: 'elder-care', label: 'Elder care' },
        { slug: 'disability', label: 'Disability' },
      ],
    },
    {
      slug: 'civic-justice',
      label: 'Civic & Justice',
      items: [
        { slug: 'voting', label: 'Voting' },
        { slug: 'advocacy', label: 'Advocacy' },
        { slug: 'legal-aid', label: 'Legal aid' },
        { slug: 'human-rights', label: 'Human rights' },
      ],
    },
    {
      slug: 'arts-culture',
      label: 'Arts & Culture',
      items: [
        { slug: 'community-arts', label: 'Community arts' },
        { slug: 'cultural-preservation', label: 'Cultural preservation' },
        { slug: 'public-art', label: 'Public art' },
      ],
    },
    {
      slug: 'animals',
      label: 'Animals',
      items: [
        { slug: 'rescue', label: 'Rescue' },
        { slug: 'shelters', label: 'Shelters' },
        { slug: 'wildlife', label: 'Wildlife' },
      ],
    },
    {
      slug: 'crisis-relief',
      label: 'Crisis & Relief',
      items: [
        { slug: 'disaster-response', label: 'Disaster response' },
        { slug: 'refugee-support', label: 'Refugee support' },
      ],
    },
  ],
  PLAY: [
    {
      slug: 'outdoors',
      label: 'Outdoors',
      items: [
        { slug: 'hiking', label: 'Hiking' },
        { slug: 'biking', label: 'Biking' },
        { slug: 'fishing', label: 'Fishing' },
        { slug: 'camping', label: 'Camping' },
        { slug: 'climbing', label: 'Climbing' },
      ],
    },
    {
      slug: 'sports-fitness',
      label: 'Sports & Fitness',
      items: [
        { slug: 'team-sports', label: 'Team sports' },
        { slug: 'running', label: 'Running' },
        { slug: 'yoga', label: 'Yoga' },
        { slug: 'martial-arts', label: 'Martial arts' },
      ],
    },
    {
      slug: 'arts-making',
      label: 'Arts & Making',
      items: [
        { slug: 'painting', label: 'Painting' },
        { slug: 'music', label: 'Music' },
        { slug: 'crafts', label: 'Crafts' },
        { slug: 'woodworking', label: 'Woodworking' },
        { slug: 'pottery', label: 'Pottery' },
      ],
    },
    {
      slug: 'food-drink',
      label: 'Food & Drink',
      items: [
        { slug: 'cooking', label: 'Cooking' },
        { slug: 'baking', label: 'Baking' },
        { slug: 'brewing', label: 'Brewing' },
        { slug: 'gardening', label: 'Gardening' },
      ],
    },
    {
      slug: 'games-tech',
      label: 'Games & Tech',
      items: [
        { slug: 'board-games', label: 'Board games' },
        { slug: 'video-games', label: 'Video games' },
        { slug: 'tinkering', label: 'Tinkering' },
        { slug: 'maker-projects', label: 'Maker projects' },
      ],
    },
    {
      slug: 'social-culture',
      label: 'Social & Culture',
      items: [
        { slug: 'book-clubs', label: 'Book clubs' },
        { slug: 'language-exchange', label: 'Language exchange' },
        { slug: 'museums', label: 'Museums' },
        { slug: 'live-events', label: 'Live events' },
      ],
    },
    {
      slug: 'performance',
      label: 'Performance',
      items: [
        { slug: 'theater', label: 'Theater' },
        { slug: 'dance', label: 'Dance' },
        { slug: 'music-performance', label: 'Music performance' },
        { slug: 'comedy', label: 'Comedy' },
      ],
    },
  ],
}
