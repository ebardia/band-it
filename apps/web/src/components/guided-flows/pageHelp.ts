/**
 * Page-specific help definitions
 *
 * Each page has steps that explain elements ON THAT PAGE.
 * No navigation - just explains what's in front of the user.
 */

export interface HelpStep {
  /** CSS selector for the element to highlight (optional - if missing, shows centered) */
  element?: string
  /** Title of this help step */
  title: string
  /** Explanation text */
  description: string
  /** Which side to show the popover */
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export interface PageHelp {
  /** Page title for the help modal */
  pageTitle: string
  /** Brief description of what this page is for */
  pageDescription: string
  /** Help steps for this page */
  steps: HelpStep[]
}

// ============================================================================
// TIER 1: First-time User Pages
// ============================================================================

export const pageHelpDefinitions: Record<string, PageHelp> = {
  // User Dashboard
  '/user-dashboard': {
    pageTitle: 'Your Dashboard',
    pageDescription: 'This is your home base - see everything happening across all your bands.',
    steps: [
      {
        title: 'Welcome to Your Dashboard',
        description: 'This page gives you a quick overview of everything happening in your bands. Let\'s walk through the key areas.',
      },
      {
        element: '[data-guide="nav-overview"]',
        title: 'Dashboard Link',
        description: 'Click here anytime to return to this overview page.',
        side: 'bottom',
      },
      {
        element: '[data-guide="nav-my-bands"]',
        title: 'My Bands',
        description: 'See all the bands you\'re a member of. Click to view and switch between your bands.',
        side: 'bottom',
      },
      {
        element: '[data-guide="nav-browse-bands"]',
        title: 'Browse Bands',
        description: 'Discover new bands to join or search for a specific band by name.',
        side: 'bottom',
      },
      {
        element: '[data-guide="notification-bell"]',
        title: 'Notifications',
        description: 'Get alerts when someone mentions you, votes on your proposals, assigns you tasks, or invites you to a band.',
        side: 'bottom',
      },
      {
        element: '[data-guide="dashboard-tasks"]',
        title: 'Your Tasks',
        description: 'See tasks assigned to you across all bands. Stay on top of your to-dos.',
        side: 'top',
      },
      {
        element: '[data-guide="dashboard-activity"]',
        title: 'Recent Activity',
        description: 'See what\'s happening in your bands - new proposals, votes, comments, and more.',
        side: 'top',
      },
    ],
  },

  // Browse Bands
  '/bands': {
    pageTitle: 'Browse Bands',
    pageDescription: 'Find and join bands that match your interests.',
    steps: [
      {
        title: 'Discover Bands',
        description: 'This page shows public bands you can browse and apply to join. Let\'s see how to find the right band for you.',
      },
      {
        element: '[data-guide="band-search"]',
        title: 'Search Bands',
        description: 'Looking for a specific band? Type the name here to find it quickly. You can also search by description or values.',
        side: 'bottom',
      },
      {
        element: '[data-guide="band-list"]',
        title: 'Available Bands',
        description: 'Browse through public bands. Each card shows the band name, description, and member count. Click "View Details" to learn more.',
        side: 'top',
      },
      {
        title: 'Joining a Band',
        description: 'Found a band you like? Click "Apply to Join" to submit an application. The band\'s admins will review it and you\'ll get notified of their decision.',
      },
      {
        title: 'Create Your Own',
        description: 'Don\'t see what you\'re looking for? Click "Create Band" to start your own group and invite others to join.',
      },
    ],
  },

  // Create Band
  '/bands/create': {
    pageTitle: 'Create a Band',
    pageDescription: 'Start your own group and build a community.',
    steps: [
      {
        title: 'Create Your Band',
        description: 'A band is your group\'s home for collaboration and decision-making. Fill out this form to get started.',
      },
      {
        element: '[data-guide="band-name"]',
        title: 'Band Name',
        description: 'Choose a memorable name that represents your group. This is how others will find you.',
        side: 'bottom',
      },
      {
        element: '[data-guide="band-description"]',
        title: 'Description',
        description: 'Tell people what your band is about. What do you do? What\'s your story? This helps attract the right members.',
        side: 'bottom',
      },
      {
        element: '[data-guide="band-mission"]',
        title: 'Mission Statement',
        description: 'What is your band trying to achieve? A clear mission helps align your members around shared goals.',
        side: 'bottom',
      },
      {
        element: '[data-guide="band-create-button"]',
        title: 'Create Your Band',
        description: 'Once you\'ve filled everything out, click here to create your band. You\'ll become the Founder with full administrative access.',
        side: 'top',
      },
      {
        title: 'What\'s Next?',
        description: 'After creating your band, you can customize settings, invite members, and start collaborating. Your band starts in "Pending" status until you have 3 active members.',
      },
    ],
  },

  // Band Discussion Page (main band page)
  '/bands/[slug]': {
    pageTitle: 'Discussions',
    pageDescription: 'Chat with your band members in organized channels.',
    steps: [
      {
        title: 'Band Discussions',
        description: 'This is your band\'s communication hub. Have conversations, share ideas, and stay connected with your team.',
      },
      {
        element: '[data-guide="band-discussions"]',
        title: 'Discussions',
        description: 'You\'re here! This is where band members chat in real-time across different channels.',
        side: 'right',
      },
      {
        element: '[data-guide="band-proposals"]',
        title: 'Proposals',
        description: 'Where democracy happens. Create proposals for the band to vote on, and cast your votes on others\' ideas.',
        side: 'right',
      },
      {
        element: '[data-guide="band-projects"]',
        title: 'Projects',
        description: 'Organize work into projects. Track progress and coordinate with your team.',
        side: 'right',
      },
      {
        element: '[data-guide="band-tasks"]',
        title: 'Tasks',
        description: 'Track to-dos and assignments. See what needs to be done and who\'s doing it.',
        side: 'right',
      },
      {
        element: '[data-guide="band-members"]',
        title: 'Members',
        description: 'See who\'s in the band, their roles, and contact information.',
        side: 'right',
      },
      {
        element: '[data-guide="channel-list"]',
        title: 'Channels',
        description: 'Conversations are organized into channels by topic. Click a channel to view its messages.',
        side: 'right',
      },
      {
        element: '[data-guide="message-composer"]',
        title: 'Send Messages',
        description: 'Type your message here and press Enter to send. You can @mention other members to get their attention.',
        side: 'top',
      },
    ],
  },
}

/**
 * Get help for the current page
 * Handles dynamic routes like /bands/[slug]
 */
export function getPageHelp(pathname: string): PageHelp | null {
  // Direct match
  if (pageHelpDefinitions[pathname]) {
    return pageHelpDefinitions[pathname]
  }

  // Handle dynamic band routes: /bands/[slug]/...
  const bandRouteMatch = pathname.match(/^\/bands\/[^\/]+(.*)$/)
  if (bandRouteMatch) {
    const subPath = bandRouteMatch[1] || ''

    // Main band page (discussions)
    if (subPath === '' || subPath === '/') {
      return pageHelpDefinitions['/bands/[slug]']
    }

    // Other band pages - check for match with [slug] placeholder
    const dynamicKey = `/bands/[slug]${subPath}`
    if (pageHelpDefinitions[dynamicKey]) {
      return pageHelpDefinitions[dynamicKey]
    }
  }

  return null
}

/**
 * Check if help is available for a page
 */
export function hasPageHelp(pathname: string): boolean {
  return getPageHelp(pathname) !== null
}
