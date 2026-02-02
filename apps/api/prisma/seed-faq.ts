import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FAQ_ENTRIES = [
  // GETTING STARTED
  {
    category: 'GETTING_STARTED',
    question: 'What is Band It?',
    answer: 'Band It is a transparency-focused platform for community organizations like PACs, advocacy groups, clubs, and committees. It helps groups organize, discuss, make decisions through proposals, and track projects — all with full transparency and accountability.',
    keywords: ['band it', 'about', 'platform', 'what'],
    relatedPages: ['/about'],
    sortOrder: 1,
  },
  {
    category: 'GETTING_STARTED',
    question: 'How do I create a band?',
    answer: '1. Go to your Overview page\n2. Click "Create Band"\n3. Fill in your band\'s details (name, mission, values)\n4. Invite members\n5. Once you meet the minimum member requirement, pay the subscription\n6. Your band is now active!',
    keywords: ['create', 'band', 'new', 'start'],
    relatedPages: ['/bands/create', '/user-dashboard'],
    sortOrder: 2,
  },
  {
    category: 'GETTING_STARTED',
    question: 'How do I join a band?',
    answer: '1. Go to "Discover Bands"\n2. Browse or search for bands that match your interests\n3. Click "Apply" on a band\n4. Wait for the band leadership to approve your application\n5. Once approved, you\'ll see the band in your Overview',
    keywords: ['join', 'apply', 'member', 'discover'],
    relatedPages: ['/bands'],
    sortOrder: 3,
  },

  // BANDS
  {
    category: 'BANDS',
    question: 'How many members do I need to activate a band?',
    answer: 'You need to meet the minimum member requirement (currently 1 for testing, normally 3) to activate a band. Once you reach the minimum, you\'ll be prompted to pay the subscription fee to complete activation.',
    keywords: ['members', 'activate', 'three', 'minimum', 'requirement'],
    relatedPages: ['/bands/create'],
    sortOrder: 1,
  },
  {
    category: 'BANDS',
    question: 'How much does a band subscription cost?',
    answer: 'Band subscriptions are:\n- **$20/month** for small bands (up to 20 members)\n- **$100/month** for large bands (21+ members)\n\nThe subscription is auto-upgraded when you reach 21 members and auto-downgraded if you go below.\n\nIn test mode, use the card number `4242 4242 4242 4242` to test payments.',
    keywords: ['cost', 'price', 'subscription', 'payment', 'fee', 'money'],
    relatedPages: ['/bands'],
    sortOrder: 2,
  },
  {
    category: 'BANDS',
    question: 'How do I invite members to my band?',
    answer: '1. Go to your band\'s page\n2. Click "Members" in the sidebar\n3. Click "Invite Members"\n4. Enter email addresses of people you want to invite\n5. Click Send\n\nInvited people will receive an email with a link to join.',
    keywords: ['invite', 'members', 'email', 'add'],
    relatedPages: [],
    sortOrder: 3,
  },
  {
    category: 'BANDS',
    question: 'What are the different roles in a band?',
    answer: 'Band roles from highest to lowest authority:\n- **Founder**: Created the band, full control\n- **Governor**: Leadership, can manage most settings\n- **Moderator**: Can moderate discussions and members\n- **Conductor**: Can lead projects and tasks\n- **Voting Member**: Standard participation with voting rights\n- **Observer**: Can view but not vote',
    keywords: ['roles', 'founder', 'governor', 'moderator', 'conductor', 'permissions'],
    relatedPages: [],
    sortOrder: 4,
  },

  // PROPOSALS
  {
    category: 'PROPOSALS',
    question: 'What types of proposals are there?',
    answer: 'There are three proposal types:\n- **Governance**: Changes band rules or settings\n- **Project**: Creates a project with tasks when approved\n- **Resolution**: Records a decision (no system action)\n\nEach type goes through the same voting process.',
    keywords: ['proposal', 'types', 'governance', 'project', 'resolution'],
    relatedPages: [],
    sortOrder: 1,
  },
  {
    category: 'PROPOSALS',
    question: 'How does voting work?',
    answer: 'When a proposal is created, members can vote during the voting period (configurable, default 7 days). Each eligible member gets one vote: **Yes**, **No**, or **Abstain**. When the voting period ends, if the proposal meets the approval threshold (usually simple majority), it passes and executes automatically.',
    keywords: ['voting', 'vote', 'approval', 'threshold', 'majority'],
    relatedPages: [],
    sortOrder: 2,
  },
  {
    category: 'PROPOSALS',
    question: 'How do I create a proposal?',
    answer: '1. Go to your band\'s Proposals section\n2. Click "New Proposal"\n3. Select the proposal type (Governance, Project, or Resolution)\n4. Fill in title, description, and details\n5. Set the voting period\n6. Submit for voting\n\nMembers will be notified and can start voting immediately.',
    keywords: ['create', 'proposal', 'new', 'submit'],
    relatedPages: [],
    sortOrder: 3,
  },

  // DISCUSSIONS
  {
    category: 'DISCUSSIONS',
    question: 'How do discussions work?',
    answer: 'Discussions happen in channels within your band:\n- **Public channels**: All members can see and participate\n- **Moderator channels**: Moderators and above only\n- **Governance channels**: Governors and founders only\n\nYou can post messages, reply in threads, pin important messages, and react to messages.',
    keywords: ['discussions', 'channels', 'chat', 'messages', 'threads'],
    relatedPages: [],
    sortOrder: 1,
  },
  {
    category: 'DISCUSSIONS',
    question: 'How do I create a new channel?',
    answer: 'To create a channel:\n1. Go to your band\'s Discussions page\n2. Click "+" or "New Channel"\n3. Enter a channel name and description\n4. Choose visibility (public, moderator, or governance)\n5. Click Create\n\nOnly members with appropriate roles can create channels.',
    keywords: ['channel', 'create', 'new', 'discussion'],
    relatedPages: [],
    sortOrder: 2,
  },

  // BILLING
  {
    category: 'BILLING',
    question: 'How do I pay my band dues?',
    answer: 'If your band has set up dues:\n1. Go to your band\'s Billing section\n2. Click "Pay Dues"\n3. Complete payment via Stripe\n\nYour band may also accept manual payments (Zelle, Venmo, cash). Check with your band\'s treasurer or founder.',
    keywords: ['dues', 'pay', 'payment', 'billing'],
    relatedPages: [],
    sortOrder: 1,
  },
  {
    category: 'BILLING',
    question: 'How do I record a manual payment?',
    answer: 'For payments made outside Stripe (Zelle, Venmo, cash):\n1. Go to your band\'s Billing section\n2. Click the "Manual Payments" tab\n3. Click "Record Payment"\n4. Enter amount, payment method, and date\n5. Submit\n\nThe other party (treasurer or member) must confirm the payment for it to be recorded. If no one confirms within 7 days, it auto-confirms.',
    keywords: ['manual', 'payment', 'zelle', 'venmo', 'cash', 'record'],
    relatedPages: [],
    sortOrder: 2,
  },

  // ACCOUNT
  {
    category: 'ACCOUNT',
    question: 'How do I update my profile?',
    answer: 'To update your profile:\n1. Click on your name or avatar in the top navigation\n2. Go to "Profile" or "Settings"\n3. Update your information (strengths, passions, learning goals, zipcode)\n4. Click Save\n\nKeeping your profile complete helps you get better band recommendations.',
    keywords: ['profile', 'update', 'edit', 'settings', 'account'],
    relatedPages: ['/profile'],
    sortOrder: 1,
  },
  {
    category: 'ACCOUNT',
    question: 'How do I change my password?',
    answer: 'To change your password:\n1. Go to your account settings\n2. Find the password section\n3. Enter your current password and new password\n4. Click Save\n\nIf you forgot your password, use the "Forgot Password" link on the login page.',
    keywords: ['password', 'change', 'reset', 'forgot'],
    relatedPages: ['/login'],
    sortOrder: 2,
  },
]

async function main() {
  console.log('Seeding FAQ entries...')

  for (const entry of FAQ_ENTRIES) {
    await prisma.faqEntry.upsert({
      where: {
        id: `faq-${entry.category}-${entry.sortOrder}`,
      },
      create: {
        id: `faq-${entry.category}-${entry.sortOrder}`,
        ...entry,
      },
      update: {
        question: entry.question,
        answer: entry.answer,
        keywords: entry.keywords,
        relatedPages: entry.relatedPages,
        sortOrder: entry.sortOrder,
      },
    })
  }

  console.log(`Seeded ${FAQ_ENTRIES.length} FAQ entries`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
