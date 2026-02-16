import { VotingMethod } from '@prisma/client'

export interface MilestoneWording {
  title: string
  description: string
  whyItMatters: string
  celebration: string
  actionLabel: string
  actionPath: string
}

export interface OnboardingTemplate {
  id: string
  name: string
  emoji: string
  description: string

  suggestedMission: string
  suggestedValues: string[]
  suggestedVotingMethod: VotingMethod
  suggestedVotingPeriodDays: number
  memberThreshold: number

  milestones: Record<number, MilestoneWording>
}

// Base milestone structure shared across templates
const BASE_MILESTONES: Record<number, Omit<MilestoneWording, 'title' | 'description' | 'celebration'>> = {
  1: {
    whyItMatters: 'This is the foundation of your collective.',
    actionLabel: 'Done',
    actionPath: '',
  },
  2: {
    whyItMatters: 'A clear mission helps everyone understand what you\'re working toward.',
    actionLabel: 'Edit Details',
    actionPath: '/settings',
  },
  3: {
    whyItMatters: 'Collective decisions require multiple people.',
    actionLabel: 'Invite Members',
    actionPath: '/invite',
  },
  4: {
    whyItMatters: 'Communication builds trust and alignment.',
    actionLabel: 'Start Discussion',
    actionPath: '',
  },
  5: {
    whyItMatters: 'Clear rules make decision-making fair and transparent.',
    actionLabel: 'Configure Settings',
    actionPath: '/settings',
  },
  6: {
    whyItMatters: 'Proposals are how your group makes decisions together.',
    actionLabel: 'Create Proposal',
    actionPath: '/proposals/create',
  },
  7: {
    whyItMatters: 'This is the core of collective action - deciding together.',
    actionLabel: 'View Proposals',
    actionPath: '/proposals',
  },
  8: {
    whyItMatters: 'Projects turn decisions into organized action.',
    actionLabel: 'Start Project',
    actionPath: '/projects',
  },
  9: {
    whyItMatters: 'Getting things done shows your group can execute.',
    actionLabel: 'View Tasks',
    actionPath: '/tasks',
  },
  10: {
    whyItMatters: 'Written agreements create clarity and accountability.',
    actionLabel: 'Add Document',
    actionPath: '/documents',
  },
}

export const TEMPLATES: Record<string, OnboardingTemplate> = {
  cause: {
    id: 'cause',
    name: 'Organizing a Cause',
    emoji: '✊',
    description: 'For campaigns, advocacy, activism, or political organizing',
    suggestedMission: 'We are organizing to...',
    suggestedValues: ['Transparency', 'Collective Action', 'Accountability'],
    suggestedVotingMethod: 'SIMPLE_MAJORITY',
    suggestedVotingPeriodDays: 3,
    memberThreshold: 3,
    milestones: {
      1: {
        ...BASE_MILESTONES[1],
        title: 'Create your band',
        description: 'You\'ve started your organizing space.',
        celebration: 'Your organizing space is ready!',
      },
      2: {
        ...BASE_MILESTONES[2],
        title: 'Define your mission',
        description: 'What are you fighting for? Make it clear.',
        celebration: 'Your mission is set!',
      },
      3: {
        ...BASE_MILESTONES[3],
        title: 'Recruit organizers',
        description: `You need at least 3 organizers to build momentum.`,
        celebration: 'Your organizing team is forming!',
      },
      4: {
        ...BASE_MILESTONES[4],
        title: 'Start your first discussion',
        description: 'Get the conversation going with your organizers.',
        celebration: 'The conversation has begun!',
      },
      5: {
        ...BASE_MILESTONES[5],
        title: 'Set up voting rules',
        description: 'Decide how your group will make decisions.',
        celebration: 'Your decision-making process is set!',
      },
      6: {
        ...BASE_MILESTONES[6],
        title: 'Propose an action',
        description: 'Put something to a vote - even something small.',
        celebration: 'Your first proposal is live!',
      },
      7: {
        ...BASE_MILESTONES[7],
        title: 'Pass your first proposal',
        description: 'Experience collective decision-making in action.',
        celebration: 'You\'ve made your first collective decision!',
      },
      8: {
        ...BASE_MILESTONES[8],
        title: 'Launch a campaign',
        description: 'Turn a decision into organized action.',
        celebration: 'Your campaign is underway!',
      },
      9: {
        ...BASE_MILESTONES[9],
        title: 'Complete a campaign task',
        description: 'See work get done through your band.',
        celebration: 'You\'re getting things done!',
      },
      10: {
        ...BASE_MILESTONES[10],
        title: 'Document your principles',
        description: 'Record your guiding principles or agreements.',
        celebration: 'Your principles are documented!',
      },
    },
  },

  community: {
    id: 'community',
    name: 'Community Group',
    emoji: '🏘️',
    description: 'For neighborhoods, mutual aid, local organizations, or associations',
    suggestedMission: 'Our community comes together to...',
    suggestedValues: ['Community', 'Mutual Support', 'Inclusion'],
    suggestedVotingMethod: 'SUPERMAJORITY_66',
    suggestedVotingPeriodDays: 7,
    memberThreshold: 4,
    milestones: {
      1: {
        ...BASE_MILESTONES[1],
        title: 'Create your band',
        description: 'You\'ve started your community space.',
        celebration: 'Your community space is ready!',
      },
      2: {
        ...BASE_MILESTONES[2],
        title: 'Define your purpose',
        description: 'What brings your community together?',
        celebration: 'Your purpose is clear!',
      },
      3: {
        ...BASE_MILESTONES[3],
        title: 'Invite neighbors',
        description: 'You need at least 4 members to function as a community.',
        celebration: 'Your community is growing!',
      },
      4: {
        ...BASE_MILESTONES[4],
        title: 'Start a discussion',
        description: 'Open up the conversation with your community.',
        celebration: 'The community conversation has started!',
      },
      5: {
        ...BASE_MILESTONES[5],
        title: 'Establish decision rules',
        description: 'Decide how your community will make decisions together.',
        celebration: 'Your community governance is set!',
      },
      6: {
        ...BASE_MILESTONES[6],
        title: 'Propose something',
        description: 'Put an idea to your community for a decision.',
        celebration: 'Your first community proposal is live!',
      },
      7: {
        ...BASE_MILESTONES[7],
        title: 'Pass your first decision',
        description: 'Make your first community decision together.',
        celebration: 'Your community made its first decision!',
      },
      8: {
        ...BASE_MILESTONES[8],
        title: 'Start an initiative',
        description: 'Turn your decision into community action.',
        celebration: 'Your community initiative has launched!',
      },
      9: {
        ...BASE_MILESTONES[9],
        title: 'Complete a community task',
        description: 'See community work get done.',
        celebration: 'Your community is making progress!',
      },
      10: {
        ...BASE_MILESTONES[10],
        title: 'Save your bylaws',
        description: 'Document your community guidelines or bylaws.',
        celebration: 'Your community guidelines are saved!',
      },
    },
  },

  creative: {
    id: 'creative',
    name: 'Creative Project',
    emoji: '🎨',
    description: 'For bands, art collectives, theater groups, or creative collaborations',
    suggestedMission: 'We create...',
    suggestedValues: ['Creativity', 'Collaboration', 'Fairness'],
    suggestedVotingMethod: 'SIMPLE_MAJORITY',
    suggestedVotingPeriodDays: 2,
    memberThreshold: 2,
    milestones: {
      1: {
        ...BASE_MILESTONES[1],
        title: 'Create your collective',
        description: 'You\'ve started your creative space.',
        celebration: 'Your creative space is ready!',
      },
      2: {
        ...BASE_MILESTONES[2],
        title: 'Define your creative vision',
        description: 'What does your collective create?',
        celebration: 'Your vision is set!',
      },
      3: {
        ...BASE_MILESTONES[3],
        title: 'Bring in collaborators',
        description: 'You need at least 2 people to collaborate.',
        celebration: 'Your creative team is forming!',
      },
      4: {
        ...BASE_MILESTONES[4],
        title: 'Start a group chat',
        description: 'Get the creative conversation flowing.',
        celebration: 'The creative dialogue has begun!',
      },
      5: {
        ...BASE_MILESTONES[5],
        title: 'Decide how you decide',
        description: 'Set up how your collective makes decisions.',
        celebration: 'Your decision process is ready!',
      },
      6: {
        ...BASE_MILESTONES[6],
        title: 'Propose a project or gig',
        description: 'Put your first creative project to a vote.',
        celebration: 'Your first project proposal is live!',
      },
      7: {
        ...BASE_MILESTONES[7],
        title: 'Agree on your first project',
        description: 'Make your first creative decision together.',
        celebration: 'You\'ve agreed on your first project!',
      },
      8: {
        ...BASE_MILESTONES[8],
        title: 'Set up the project',
        description: 'Organize your creative project.',
        celebration: 'Your project is organized!',
      },
      9: {
        ...BASE_MILESTONES[9],
        title: 'Complete a creative task',
        description: 'Finish a piece of the creative work.',
        celebration: 'You\'re creating together!',
      },
      10: {
        ...BASE_MILESTONES[10],
        title: 'Record agreements',
        description: 'Document agreements about credits, splits, or roles.',
        celebration: 'Your agreements are documented!',
      },
    },
  },

  other: {
    id: 'other',
    name: 'Something Else',
    emoji: '⚙️',
    description: 'For unique groups or experienced users',
    suggestedMission: '',
    suggestedValues: [],
    suggestedVotingMethod: 'SIMPLE_MAJORITY',
    suggestedVotingPeriodDays: 7,
    memberThreshold: 3,
    milestones: {
      1: {
        ...BASE_MILESTONES[1],
        title: 'Create your band',
        description: 'You\'ve created your band.',
        celebration: 'Your band is ready!',
      },
      2: {
        ...BASE_MILESTONES[2],
        title: 'Define your mission',
        description: 'What is your band working toward?',
        celebration: 'Your mission is set!',
      },
      3: {
        ...BASE_MILESTONES[3],
        title: 'Invite members',
        description: 'You need at least 3 members to work collectively.',
        celebration: 'Your team is growing!',
      },
      4: {
        ...BASE_MILESTONES[4],
        title: 'Start a discussion',
        description: 'Begin communicating with your band.',
        celebration: 'The conversation has started!',
      },
      5: {
        ...BASE_MILESTONES[5],
        title: 'Set up voting rules',
        description: 'Configure how your band makes decisions.',
        celebration: 'Your governance is configured!',
      },
      6: {
        ...BASE_MILESTONES[6],
        title: 'Create a proposal',
        description: 'Put something to a vote.',
        celebration: 'Your first proposal is live!',
      },
      7: {
        ...BASE_MILESTONES[7],
        title: 'Pass your first proposal',
        description: 'Make your first collective decision.',
        celebration: 'You\'ve made your first decision!',
      },
      8: {
        ...BASE_MILESTONES[8],
        title: 'Launch a project',
        description: 'Start organized work on a goal.',
        celebration: 'Your project has launched!',
      },
      9: {
        ...BASE_MILESTONES[9],
        title: 'Complete a task',
        description: 'Get something done through your band.',
        celebration: 'You\'re getting things done!',
      },
      10: {
        ...BASE_MILESTONES[10],
        title: 'Add documentation',
        description: 'Store important documents for your band.',
        celebration: 'Your documentation is saved!',
      },
    },
  },
}

export function getTemplate(templateId: string): OnboardingTemplate {
  return TEMPLATES[templateId] || TEMPLATES.other
}

export function getTemplateList(): Array<{ id: string; name: string; emoji: string; description: string }> {
  return Object.values(TEMPLATES).map(t => ({
    id: t.id,
    name: t.name,
    emoji: t.emoji,
    description: t.description,
  }))
}

export const TOTAL_MILESTONES = 10
