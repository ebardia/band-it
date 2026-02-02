/**
 * Generate help context from YAML file
 *
 * This script reads docs/help-context.yaml and generates a TypeScript file
 * that can be imported into the help router.
 *
 * Usage: npx ts-node scripts/generate-help-context.ts
 */

import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

interface HelpContext {
  platform: {
    name: string
    description: string
  }
  bands: {
    what: string
    activation: string[]
    subscription: Record<string, any>
    statuses?: Record<string, string>
    roles: Record<string, string>
    workflows: Record<string, any>
  }
  proposals: {
    what: string
    types: Record<string, string>
    execution_types?: Record<string, string>
    statuses: Record<string, string>
    workflow: string
    voting?: Record<string, any>
    rules: string[]
  }
  discussions: {
    what: string
    channel_visibility: Record<string, string>
    features?: string[]
    workflows?: Record<string, string>
  }
  billing: {
    band_subscription: Record<string, any>
    member_dues: Record<string, any>
    payment_methods: Record<string, any>
    manual_payment_flow: string
    manual_payment_statuses?: Record<string, string>
  }
  quick_actions: {
    what: string
    pages: Record<string, string>
  }
  projects?: {
    what: string
    statuses: Record<string, string>
    tasks?: Record<string, any>
  }
  events?: {
    what: string
    types: Record<string, string>
    rsvp_options: Record<string, string>
  }
  common_questions: Record<string, string>
  troubleshooting: Array<{ issue: string; solution: string }>
}

function formatObject(obj: Record<string, any>, indent = ''): string {
  let output = ''
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      output += `${indent}- ${key}: ${value}\n`
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      output += `${indent}- ${key}:\n`
      output += formatObject(value, indent + '  ')
    }
  }
  return output
}

function convertToPrompt(data: HelpContext): string {
  let output = ''

  // Platform intro
  output += `# ${data.platform.name}\n`
  output += `${data.platform.description}\n\n`

  // Bands
  output += `## BANDS\n`
  output += `${data.bands.what}\n\n`

  if (data.bands.activation) {
    output += `### Activation Requirements\n`
    data.bands.activation.forEach((rule: string) => {
      output += `- ${rule}\n`
    })
    output += `\n`
  }

  if (data.bands.subscription) {
    output += `### Subscription Pricing\n`
    if (data.bands.subscription.tier_1) {
      output += `- ${data.bands.subscription.tier_1.members}: ${data.bands.subscription.tier_1.price}\n`
    }
    if (data.bands.subscription.tier_2) {
      output += `- ${data.bands.subscription.tier_2.members}: ${data.bands.subscription.tier_2.price}\n`
    }
    if (data.bands.subscription.notes) {
      data.bands.subscription.notes.forEach((note: string) => {
        output += `- ${note}\n`
      })
    }
    output += `\n`
  }

  if (data.bands.roles) {
    output += `### Roles (highest to lowest authority)\n`
    Object.entries(data.bands.roles).forEach(([role, desc]) => {
      output += `- ${role}: ${desc}\n`
    })
    output += `\n`
  }

  if (data.bands.workflows) {
    output += `### Key Workflows\n`
    if (typeof data.bands.workflows.create === 'string') {
      output += `- Create a band: ${data.bands.workflows.create}\n`
    }
    if (typeof data.bands.workflows.join === 'string') {
      output += `- Join a band: ${data.bands.workflows.join}\n`
    }
    if (data.bands.workflows.dissolve) {
      if (data.bands.workflows.dissolve.under_minimum_members) {
        output += `- Dissolve (under minimum members): ${data.bands.workflows.dissolve.under_minimum_members}\n`
      }
      if (data.bands.workflows.dissolve.at_or_above_minimum_members) {
        output += `- Dissolve (at or above minimum members): ${data.bands.workflows.dissolve.at_or_above_minimum_members}\n`
      }
    }
    output += `\n`
  }

  // Proposals
  output += `## PROPOSALS\n`
  output += `${data.proposals.what}\n\n`

  if (data.proposals.types) {
    output += `### Proposal Types\n`
    Object.entries(data.proposals.types).forEach(([type, desc]) => {
      output += `- ${type}: ${desc}\n`
    })
    output += `\n`
  }

  if (data.proposals.statuses) {
    output += `### Proposal Statuses\n`
    Object.entries(data.proposals.statuses).forEach(([status, meaning]) => {
      output += `- ${status}: ${meaning}\n`
    })
    output += `\n`
  }

  if (data.proposals.workflow) {
    output += `### Proposal Workflow\n`
    output += `${data.proposals.workflow}\n\n`
  }

  if (data.proposals.voting) {
    output += `### Voting\n`
    if (data.proposals.voting.options) {
      output += `- Vote options: ${data.proposals.voting.options}\n`
    }
    if (data.proposals.voting.default_period) {
      output += `- Default voting period: ${data.proposals.voting.default_period}\n`
    }
    if (data.proposals.voting.methods) {
      output += `- Voting methods:\n`
      Object.entries(data.proposals.voting.methods).forEach(([method, desc]) => {
        output += `  - ${method}: ${desc}\n`
      })
    }
    output += `\n`
  }

  if (data.proposals.rules) {
    output += `### Proposal Rules\n`
    data.proposals.rules.forEach((rule: string) => {
      output += `- ${rule}\n`
    })
    output += `\n`
  }

  // Discussions
  output += `## DISCUSSIONS\n`
  output += `${data.discussions.what}\n\n`

  if (data.discussions.channel_visibility) {
    output += `### Channel Visibility Levels\n`
    Object.entries(data.discussions.channel_visibility).forEach(([vis, who]) => {
      output += `- ${vis}: ${who}\n`
    })
    output += `\n`
  }

  if (data.discussions.features) {
    output += `### Features\n`
    data.discussions.features.forEach((feature: string) => {
      output += `- ${feature}\n`
    })
    output += `\n`
  }

  // Billing
  output += `## BILLING\n\n`

  if (data.billing.band_subscription) {
    output += `### Band Subscription\n`
    output += `- What: ${data.billing.band_subscription.what}\n`
    output += `- Who pays: ${data.billing.band_subscription.who_pays}\n`
    if (data.billing.band_subscription.pricing) {
      output += `- Pricing: ${data.billing.band_subscription.pricing}\n`
    }
    output += `\n`
  }

  if (data.billing.member_dues) {
    output += `### Member Dues\n`
    output += `- What: ${data.billing.member_dues.what}\n`
    output += `- Required: ${data.billing.member_dues.required}\n`
    output += `\n`
  }

  if (data.billing.payment_methods) {
    output += `### Payment Methods\n`
    if (data.billing.payment_methods.stripe) {
      output += `- Stripe: ${data.billing.payment_methods.stripe}\n`
    }
    if (data.billing.payment_methods.manual) {
      output += `- Manual options: ${data.billing.payment_methods.manual.join(', ')}\n`
    }
    output += `\n`
  }

  if (data.billing.manual_payment_flow) {
    output += `### Manual Payment Flow\n`
    output += `${data.billing.manual_payment_flow}\n\n`
  }

  // Quick Actions
  output += `## QUICK ACTIONS\n`
  output += `${data.quick_actions.what}\n\n`

  if (data.quick_actions.pages) {
    output += `### Available Pages\n`
    Object.entries(data.quick_actions.pages).forEach(([name, url]) => {
      output += `- ${name}: ${url}\n`
    })
    output += `\n`
  }

  // Projects (if present)
  if (data.projects) {
    output += `## PROJECTS\n`
    output += `${data.projects.what}\n\n`

    if (data.projects.statuses) {
      output += `### Project Statuses\n`
      Object.entries(data.projects.statuses).forEach(([status, desc]) => {
        output += `- ${status}: ${desc}\n`
      })
      output += `\n`
    }

    if (data.projects.tasks) {
      output += `### Tasks\n`
      output += `${data.projects.tasks.what}\n`
      if (data.projects.tasks.statuses) {
        output += `Task statuses: ${Object.keys(data.projects.tasks.statuses).join(', ')}\n`
      }
      output += `\n`
    }
  }

  // Events (if present)
  if (data.events) {
    output += `## EVENTS\n`
    output += `${data.events.what}\n\n`

    if (data.events.types) {
      output += `### Event Types\n`
      Object.entries(data.events.types).forEach(([type, desc]) => {
        output += `- ${type}: ${desc}\n`
      })
      output += `\n`
    }

    if (data.events.rsvp_options) {
      output += `### RSVP Options\n`
      Object.entries(data.events.rsvp_options).forEach(([option, desc]) => {
        output += `- ${option}: ${desc}\n`
      })
      output += `\n`
    }
  }

  // Common Questions
  output += `## COMMON QUESTIONS\n\n`
  Object.entries(data.common_questions).forEach(([question, answer]) => {
    const readableQuestion = question
      .replace(/_/g, ' ')
      .replace(/^how do i /, 'How do I ')
      .replace(/^why /, 'Why ')
      .replace(/^what /, 'What ')
    output += `### ${readableQuestion}?\n`
    output += `${answer}\n\n`
  })

  // Troubleshooting
  output += `## TROUBLESHOOTING\n\n`
  data.troubleshooting.forEach((item) => {
    output += `### ${item.issue}\n`
    output += `${item.solution}\n\n`
  })

  return output
}

function validateContext(prompt: string): void {
  const placeholders = prompt.match(/\[([A-Z_]+|\w+)\]/g)
  if (placeholders && placeholders.length > 0) {
    console.warn('Warning: Found possible unfilled placeholders:', placeholders)
  }
}

function generateContext() {
  const yamlPath = path.join(__dirname, '..', 'docs', 'help-context.yaml')

  if (!fs.existsSync(yamlPath)) {
    console.error('Error: docs/help-context.yaml not found')
    console.error('Expected path:', yamlPath)
    process.exit(1)
  }

  console.log('Reading:', yamlPath)
  const yamlContent = fs.readFileSync(yamlPath, 'utf-8')
  const data = yaml.load(yamlContent) as HelpContext

  const prompt = convertToPrompt(data)

  // Validate no placeholders remain
  validateContext(prompt)

  const output = `// AUTO-GENERATED from docs/help-context.yaml - DO NOT EDIT DIRECTLY
// Generated at: ${new Date().toISOString()}
// To update, edit docs/help-context.yaml and run: npm run generate-help-context

export const PLATFORM_CONTEXT = \`
${prompt.replace(/`/g, '\\`')}
\`
`

  const outputPath = path.join(__dirname, '..', 'src', 'lib', 'help', 'generated-context.ts')

  // Ensure directory exists
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(outputPath, output)
  console.log('Generated:', outputPath)
  console.log('Context size:', prompt.length, 'characters')
}

generateContext()
