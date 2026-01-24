import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Terms that should BLOCK content entirely (severe violations)
const BLOCK_TERMS = {
  'hate-speech': [
    // Racial slurs and hate terms - keeping list minimal but representative
    'n[i1]gg[e3]r',  // regex pattern
    'k[i1]ke',
    'sp[i1]c',
    'ch[i1]nk',
    'f[a4]gg[o0]t',
    'tr[a4]nny',
    'r[e3]t[a4]rd',
  ],
  'threats': [
    'kill yourself',
    'kys',
    'i will kill',
    'gonna kill',
    'death threat',
  ],
  'illegal': [
    'child porn',
    'cp links',
    'buy drugs',
    'sell drugs',
    'illegal weapons',
  ],
}

// Terms that should WARN (flag for review but allow posting)
const WARN_TERMS = {
  'profanity': [
    'fuck',
    'shit',
    'ass',
    'bitch',
    'damn',
    'crap',
    'bastard',
    'piss',
    'dick',
    'cock',
    'pussy',
    'whore',
    'slut',
  ],
  'mild-offensive': [
    'idiot',
    'stupid',
    'dumb',
    'moron',
    'loser',
    'jerk',
    'suck',
    'hate you',
    'screw you',
  ],
  'spam-patterns': [
    'buy now',
    'click here',
    'free money',
    'act now',
    'limited time',
    'make money fast',
    'work from home',
    'casino',
    'viagra',
    'crypto giveaway',
  ],
  'potentially-harmful': [
    'suicide',
    'self-harm',
    'cutting',
    'anorexia',
    'bulimia',
  ],
}

async function main() {
  console.log('Seeding blocked terms...')

  // Get or create a system admin user for the createdById field
  let adminUser = await prisma.user.findFirst({
    where: { isAdmin: true },
  })

  if (!adminUser) {
    console.log('No admin user found. Please create an admin user first.')
    process.exit(1)
  }

  const adminUserId = adminUser.id
  console.log(`Using admin user: ${adminUser.email}`)

  let addedCount = 0
  let skippedCount = 0

  // Add BLOCK terms
  for (const [category, terms] of Object.entries(BLOCK_TERMS)) {
    for (const term of terms) {
      const isRegex = term.includes('[') || term.includes('(') || term.includes('\\')

      try {
        await prisma.blockedTerm.create({
          data: {
            term: term.toLowerCase(),
            isRegex,
            severity: 'BLOCK',
            category,
            createdById: adminUserId,
          },
        })
        addedCount++
        console.log(`  [BLOCK] Added: ${term} (${category})`)
      } catch (error: any) {
        if (error.code === 'P2002') {
          skippedCount++
          console.log(`  [SKIP] Already exists: ${term}`)
        } else {
          throw error
        }
      }
    }
  }

  // Add WARN terms
  for (const [category, terms] of Object.entries(WARN_TERMS)) {
    for (const term of terms) {
      const isRegex = term.includes('[') || term.includes('(') || term.includes('\\')

      try {
        await prisma.blockedTerm.create({
          data: {
            term: term.toLowerCase(),
            isRegex,
            severity: 'WARN',
            category,
            createdById: adminUserId,
          },
        })
        addedCount++
        console.log(`  [WARN] Added: ${term} (${category})`)
      } catch (error: any) {
        if (error.code === 'P2002') {
          skippedCount++
          console.log(`  [SKIP] Already exists: ${term}`)
        } else {
          throw error
        }
      }
    }
  }

  console.log(`\nDone! Added ${addedCount} terms, skipped ${skippedCount} duplicates.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
