import cron from 'node-cron'
import pLimit from 'p-limit'
import { subDays } from 'date-fns'
import { prisma } from '../lib/prisma'
import { getQuickActionsForUser } from '../lib/quickActions'
import { sendDigestEmail } from '../server/services/digest-email.service'
import { withCronRetry } from '../lib/retry'

// Concurrency limit for sending emails (Resend allows 2 req/sec on free tier)
const limit = pLimit(1)

// Delay between emails to respect rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Initialize the digest email cron job
 * Runs daily at 8 AM UTC
 */
export function initDigestCron() {
  // Send digest emails daily at 8 AM UTC
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running digest email job...')
    await withCronRetry('DIGEST', sendDigestEmails)
  })

  console.log('Digest cron job initialized (8 AM UTC)')
}

/**
 * Manual trigger for testing
 */
export async function runDigestJob() {
  console.log('[DIGEST] Manual digest job triggered')
  return sendDigestEmails()
}

/**
 * Main function to send digest emails to all eligible users
 */
async function sendDigestEmails(): Promise<{ sent: number; skipped: number; failed: number }> {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0-6 (Sunday-Saturday)

  let sent = 0
  let skipped = 0
  let failed = 0

  // Process users in batches using cursor-based pagination
  const batchSize = 100
  let cursor: string | undefined

  while (true) {
    // Get users who should receive digest today
    const users = await prisma.user.findMany({
      where: {
        digestFrequency: { not: 'NEVER' },
        OR: [
          // Daily users
          { digestFrequency: 'DAILY' },

          // Every other day - check if 2+ days since last sent
          {
            digestFrequency: 'EVERY_OTHER_DAY',
            OR: [
              { digestLastSentAt: null },
              { digestLastSentAt: { lte: subDays(today, 2) } },
            ],
          },

          // Weekly users - check if today is their day
          {
            digestFrequency: 'WEEKLY',
            digestWeeklyDay: dayOfWeek,
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    })

    if (users.length === 0) break

    // Process batch sequentially with delay to respect Resend rate limits (2/sec)
    const results = await Promise.all(
      users.map((user) =>
        limit(async () => {
          try {
            const result = await sendDigestToUser(user)
            if (result === 'sent') {
              sent++
              // Wait 600ms between sent emails to stay under 2/sec limit
              await delay(600)
            } else if (result === 'skipped') {
              skipped++
            }
            return result
          } catch (error) {
            console.error(`[DIGEST] Failed for ${user.id}:`, error)
            failed++
            return 'failed'
          }
        })
      )
    )

    // Update cursor for next batch
    cursor = users[users.length - 1].id

    console.log(
      `[DIGEST] Batch complete: sent=${results.filter((r) => r === 'sent').length}, skipped=${results.filter((r) => r === 'skipped').length}, failed=${results.filter((r) => r === 'failed').length}`
    )
  }

  console.log(`[DIGEST] Job complete: sent=${sent}, skipped=${skipped}, failed=${failed}`)
  return { sent, skipped, failed }
}

/**
 * Send digest email to a single user
 */
async function sendDigestToUser(user: {
  id: string
  email: string
  name: string | null
}): Promise<'sent' | 'skipped' | 'failed'> {
  // Get pending actions for user
  const { actions } = await getQuickActionsForUser(user.id, 10)

  // Skip if no actions
  if (actions.length === 0) {
    return 'skipped'
  }

  // Send email
  const result = await sendDigestEmail(user.id, user.email, user.name, actions)

  if (!result.success) {
    console.error(`[DIGEST] Email failed for ${user.id}:`, result.error)
    return 'failed'
  }

  // Update last sent timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { digestLastSentAt: new Date() },
  })

  return 'sent'
}
