import { GuidedFlow } from './GuidedFlowContext'

/**
 * Guided flow definitions for Band IT
 *
 * Each flow navigates to ONE page and walks through elements on that page.
 * This keeps flows simple and reliable.
 */

// ============================================================================
// GETTING STARTED FLOWS
// ============================================================================

export const appOverviewFlow: GuidedFlow = {
  id: 'app-overview',
  name: 'Explore Band IT',
  description: 'Learn what Band IT is and how it can help your group collaborate.',
  icon: '🎸',
  category: 'getting-started',
  steps: [
    {
      navigateTo: '/user-dashboard',
      title: 'Welcome to Band IT!',
      description: 'Band IT helps groups make decisions together democratically. Whether you\'re running a club, a team, or any organization - we help you stay organized and give everyone a voice.',
    },
    {
      navigateTo: '/user-dashboard',
      element: '[data-guide="nav-overview"]',
      title: 'Your Dashboard',
      description: 'This is your home base. See your upcoming tasks, recent activity, and quick access to all your bands.',
      side: 'bottom',
    },
    {
      navigateTo: '/user-dashboard',
      element: '[data-guide="nav-my-bands"]',
      title: 'My Bands',
      description: 'Click here to view all the bands you\'re a member of. A "band" is any group you collaborate with.',
      side: 'bottom',
    },
    {
      navigateTo: '/user-dashboard',
      element: '[data-guide="nav-browse-bands"]',
      title: 'Browse Bands',
      description: 'Click here to discover public bands you can join, or search for a specific band by name.',
      side: 'bottom',
    },
    {
      navigateTo: '/user-dashboard',
      element: '[data-guide="notification-bell"]',
      title: 'Notifications',
      description: 'Stay updated! You\'ll see alerts here when someone mentions you, votes on your proposals, or assigns you a task.',
      side: 'bottom',
    },
    {
      navigateTo: '/user-dashboard',
      title: 'Ready to explore!',
      description: 'That\'s the navigation basics! Use the menu to explore different areas. Try the "Create a Band" or "Join a Band" guides to learn more.',
    },
  ],
}

export const createBandFlow: GuidedFlow = {
  id: 'create-band',
  name: 'Create a Band',
  description: 'Start your own group and invite members to collaborate.',
  icon: '🎵',
  category: 'getting-started',
  steps: [
    {
      navigateTo: '/bands/create',
      title: 'Create Your Band',
      description: 'A band is your group\'s home. It can be a club, a team, a committee, or any group that makes decisions together.',
    },
    {
      navigateTo: '/bands/create',
      element: '[data-guide="band-name"]',
      title: 'Band Name',
      description: 'Choose a memorable name for your band. This is how others will find and recognize your group.',
      side: 'bottom',
    },
    {
      navigateTo: '/bands/create',
      element: '[data-guide="band-description"]',
      title: 'Description',
      description: 'Explain what your band is about. Tell people about your group\'s story and what makes you unique.',
      side: 'bottom',
    },
    {
      navigateTo: '/bands/create',
      element: '[data-guide="band-mission"]',
      title: 'Mission Statement',
      description: 'What is your band trying to achieve? This helps potential members understand your purpose.',
      side: 'bottom',
    },
    {
      navigateTo: '/bands/create',
      element: '[data-guide="band-create-button"]',
      title: 'Create Your Band',
      description: 'Once you\'ve filled in all the details, click here to create your band. You\'ll become the Founder with full administrative access.',
      side: 'top',
    },
  ],
}

export const joinBandFlow: GuidedFlow = {
  id: 'join-band',
  name: 'Join a Band',
  description: 'Find and join an existing group to start collaborating.',
  icon: '🤝',
  category: 'getting-started',
  steps: [
    {
      navigateTo: '/bands',
      title: 'Find a Band to Join',
      description: 'This page shows public bands you can browse and apply to join. You can also search for a specific band.',
    },
    {
      navigateTo: '/bands',
      element: '[data-guide="band-search"]',
      title: 'Search Bands',
      description: 'Know the name of the band you\'re looking for? Type it here to find it quickly.',
      side: 'bottom',
    },
    {
      navigateTo: '/bands',
      element: '[data-guide="band-list"]',
      title: 'Browse Available Bands',
      description: 'These are public bands accepting new members. Click "View Details" to learn more, or "Apply to Join" to submit an application.',
      side: 'top',
    },
    {
      navigateTo: '/bands',
      title: 'Applying to Join',
      description: 'When you apply, the band\'s admins will review your application. You\'ll get a notification when they respond.',
    },
    {
      navigateTo: '/bands',
      title: 'Direct Invitations',
      description: 'If someone invited you directly, check your notifications (the bell icon). You can accept the invitation to join immediately!',
    },
  ],
}

// ============================================================================
// EDUCATIONAL FLOWS (no navigation needed)
// ============================================================================

export const understandRolesFlow: GuidedFlow = {
  id: 'understand-roles',
  name: 'Understand Roles',
  description: 'Learn about the different member roles and what each can do.',
  icon: '👑',
  category: 'bands',
  steps: [
    {
      title: 'Member Roles in Band IT',
      description: 'Each band has different roles with different permissions. Understanding roles helps you know what you and others can do.',
    },
    {
      title: 'Founder',
      description: 'The person who created the band. Has full control including deleting the band, changing all settings, and managing billing. There\'s only one Founder.',
    },
    {
      title: 'Governor',
      description: 'Senior admins who can manage most band settings, approve members, and create proposals. They can do almost everything except delete the band.',
    },
    {
      title: 'Moderator',
      description: 'Can manage discussions, approve members, and help maintain order. Good for trusted members who help run day-to-day operations.',
    },
    {
      title: 'Conductor',
      description: 'Can manage projects and tasks. Perfect for project managers or team leads who organize work.',
    },
    {
      title: 'Voting Member',
      description: 'Full members who can vote on proposals, participate in discussions, and be assigned tasks. The backbone of any band!',
    },
    {
      title: 'Observer',
      description: 'Can view most content but cannot vote or create proposals. Good for stakeholders who need visibility without participation.',
    },
    {
      title: 'Role-Based Permissions',
      description: 'Each band can customize which roles can create proposals, approve members, and more. Check your band\'s settings to see the specific permissions.',
    },
  ],
}

export const votingProcessFlow: GuidedFlow = {
  id: 'voting-process',
  name: 'How Voting Works',
  description: 'Understand the voting process and how decisions are made.',
  icon: '🗳️',
  category: 'proposals',
  steps: [
    {
      title: 'Democratic Decision Making',
      description: 'Band IT uses transparent voting to make group decisions. Every vote is recorded and results are calculated automatically.',
    },
    {
      title: 'Casting Your Vote',
      description: 'When a proposal is open for voting, you can vote Yes (approve), No (reject), or Abstain (no opinion). You can change your vote until voting closes.',
    },
    {
      title: 'Voting Threshold',
      description: 'Each proposal type has a threshold - the percentage of Yes votes needed to pass. For example, if the threshold is 60%, more than 60% of votes must be Yes.',
    },
    {
      title: 'Quorum',
      description: 'Quorum is the minimum participation required for a vote to be valid. If not enough members vote, the proposal may not pass even with all Yes votes.',
    },
    {
      title: 'Vote Weight',
      description: 'Some bands give certain roles more voting power. For example, Governors might have 2 votes while regular members have 1. Check your band\'s settings.',
    },
    {
      title: 'Results & Execution',
      description: 'When voting ends, the result is calculated automatically. Passed proposals can trigger actions like creating projects or changing settings.',
    },
  ],
}

// ============================================================================
// EXPORT ALL FLOWS
// ============================================================================

export const allFlows: GuidedFlow[] = [
  // Getting Started
  appOverviewFlow,
  createBandFlow,
  joinBandFlow,

  // Bands
  understandRolesFlow,

  // Proposals
  votingProcessFlow,
]

// Flows to show for first-time users
export const gettingStartedFlows: GuidedFlow[] = [
  appOverviewFlow,
  createBandFlow,
  joinBandFlow,
]

// Get flows by category
export function getFlowsByCategory(category: string): GuidedFlow[] {
  return allFlows.filter(flow => flow.category === category)
}

// Get a specific flow by ID
export function getFlowById(id: string): GuidedFlow | undefined {
  return allFlows.find(flow => flow.id === id)
}
