import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Enhanced data structure with metadata
interface TermConfig {
  terms: string[]
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
  userAppealAllowed: boolean
}

interface CategoryConfig {
  [category: string]: TermConfig
}

const TERMS_DATA: {
  block: CategoryConfig
  warn: CategoryConfig
} = {
  "block": {
    "threats-violence": {
      terms: [
        "kill (you|u|them|him|her)",
        "k1ll",
        "murder",
        "mur[d3]r",
        "shoot (you|u|them)",
        "sh00t",
        "hang (you|u|them)",
        "lynch",
        "bomb (them|you)",
        "b[o0]mb threat",
        "i will (hurt|harm|kill)",
        "we will (hurt|harm|kill)"
      ],
      confidence: 'HIGH',
      reason: 'Direct threats of violence are not allowed on this platform.',
      userAppealAllowed: false
    },

    "hate-speech": {
      terms: [
        "n[i1!][g9]{2}[e3]r",
        "f[a4]g(g[o0]t)?",
        "k[i1]k[e3]",
        "r[e3]t[a4]rd",
        "ch[i1]nk",
        "sp[i1]c",
        "tr[a4]nn(y|ies)",
        "go back to your country",
        "you people are",
        "subhuman",
        "vermin",
        "gas (the|all)"
      ],
      confidence: 'HIGH',
      reason: 'Hate speech and discriminatory language violate our community guidelines.',
      userAppealAllowed: false
    },

    "sexual-exploitation": {
      terms: [
        "child p[o0]rn",
        "cp",
        "underage s[e3]x",
        "r[a4]p[e3]",
        "sexual assault",
        "molest",
        "incest"
      ],
      confidence: 'HIGH',
      reason: 'Content related to sexual exploitation is strictly prohibited.',
      userAppealAllowed: false
    },

    "doxxing": {
      terms: [
        "home address is",
        "phone number is",
        "ssn",
        "social security number",
        "here is his address",
        "leak(ed)? (his|her|their) info"
      ],
      confidence: 'MEDIUM',
      reason: 'Sharing personal information without consent (doxxing) is prohibited.',
      userAppealAllowed: true
    }
  },

  "warn": {
    "profanity": {
      terms: [
        "f[u*][c*]k",
        "sh[i1]t",
        "b[i1]tch",
        "a[s$]{2}hole",
        "d[a4]mn",
        "cr[a4]p",
        "p[i1]ss(ed|off)?"
      ],
      confidence: 'MEDIUM',
      reason: 'Excessive profanity may be flagged for review.',
      userAppealAllowed: true
    },

    "harassment-insults": {
      terms: [
        "you are stupid",
        "you are an idiot",
        "moron",
        "dumb[a4]ss",
        "loser",
        "clown",
        "pathetic"
      ],
      confidence: 'LOW',
      reason: 'Personal insults and harassment are discouraged.',
      userAppealAllowed: true
    },

    "sexual-content-mild": {
      terms: [
        "s[e3]x",
        "n[u*]de",
        "p[o0]rn",
        "horny",
        "nsfw"
      ],
      confidence: 'LOW',
      reason: 'Sexual content may be inappropriate in certain contexts.',
      userAppealAllowed: true
    },

    "spam-solicitation": {
      terms: [
        "buy now",
        "click here",
        "free money",
        "make \\$\\d+ per (day|week)",
        "work from home",
        "guaranteed income",
        "crypto pump",
        "airdrop"
      ],
      confidence: 'MEDIUM',
      reason: 'Spam and unsolicited commercial content is not allowed.',
      userAppealAllowed: true
    },

    "extreme-language": {
      terms: [
        "burn it all down",
        "they should all die",
        "destroy them",
        "eradicate",
        "wipe them out"
      ],
      confidence: 'LOW',
      reason: 'Extreme or violent language may be flagged for context review.',
      userAppealAllowed: true
    }
  }
}

// Helper to detect if a term uses regex patterns
function isRegexPattern(term: string): boolean {
  return /[\[\](){}|\\+*?^$]/.test(term)
}

async function main() {
  console.log('Importing blocked terms with metadata...\n')

  // Get admin user
  const adminUser = await prisma.user.findFirst({
    where: { isAdmin: true },
  })

  if (!adminUser) {
    console.log('No admin user found. Please create an admin user first.')
    process.exit(1)
  }

  console.log(`Using admin user: ${adminUser.email}\n`)

  let addedCount = 0
  let skippedCount = 0
  let updatedCount = 0

  // Process BLOCK terms
  console.log('=== BLOCK TERMS ===')
  for (const [category, config] of Object.entries(TERMS_DATA.block)) {
    console.log(`\nCategory: ${category} (confidence: ${config.confidence}, appeals: ${config.userAppealAllowed ? 'allowed' : 'not allowed'})`)
    for (const term of config.terms) {
      const isRegex = isRegexPattern(term)
      const termLower = term.toLowerCase()

      try {
        await prisma.blockedTerm.upsert({
          where: { term: termLower },
          create: {
            term: termLower,
            isRegex,
            severity: 'BLOCK',
            category,
            confidence: config.confidence,
            reason: config.reason,
            userAppealAllowed: config.userAppealAllowed,
            createdById: adminUser.id,
          },
          update: {
            confidence: config.confidence,
            reason: config.reason,
            userAppealAllowed: config.userAppealAllowed,
          },
        })
        addedCount++
        console.log(`  [OK] ${term}${isRegex ? ' [regex]' : ''}`)
      } catch (error: any) {
        console.error(`  [ERROR] ${term}: ${error.message}`)
      }
    }
  }

  // Process WARN terms
  console.log('\n=== WARN TERMS ===')
  for (const [category, config] of Object.entries(TERMS_DATA.warn)) {
    console.log(`\nCategory: ${category} (confidence: ${config.confidence}, appeals: ${config.userAppealAllowed ? 'allowed' : 'not allowed'})`)
    for (const term of config.terms) {
      const isRegex = isRegexPattern(term)
      const termLower = term.toLowerCase()

      try {
        await prisma.blockedTerm.upsert({
          where: { term: termLower },
          create: {
            term: termLower,
            isRegex,
            severity: 'WARN',
            category,
            confidence: config.confidence,
            reason: config.reason,
            userAppealAllowed: config.userAppealAllowed,
            createdById: adminUser.id,
          },
          update: {
            confidence: config.confidence,
            reason: config.reason,
            userAppealAllowed: config.userAppealAllowed,
          },
        })
        addedCount++
        console.log(`  [OK] ${term}${isRegex ? ' [regex]' : ''}`)
      } catch (error: any) {
        console.error(`  [ERROR] ${term}: ${error.message}`)
      }
    }
  }

  console.log(`\n========================================`)
  console.log(`Done! Processed: ${addedCount} terms`)
  console.log(`========================================`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
