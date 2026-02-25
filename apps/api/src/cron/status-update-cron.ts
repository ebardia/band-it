import cron from 'node-cron'
import { statusUpdateService } from '../services/status-update.service'
import { withCronRetry } from '../lib/retry'

/**
 * Initialize the weekly status update cron job
 * Runs every Sunday at 6 PM UTC (before the new week starts)
 */
export function initStatusUpdateCron() {
  // Send weekly status updates every Sunday at 6 PM UTC
  cron.schedule('0 18 * * 0', async () => {
    console.log('[CRON] Running weekly status update job...')
    await withCronRetry('STATUS_UPDATE', runStatusUpdateJob)
  })

  console.log('Status update cron job initialized (Sundays at 6 PM UTC)')
}

/**
 * Run the status update job
 * Can be called manually or by cron
 */
export async function runStatusUpdateJob(): Promise<{
  sent: number
  failed: number
  errors: Array<{ bandId: string; error: string }>
}> {
  console.log('[STATUS_UPDATE] Starting weekly status update job...')

  const result = await statusUpdateService.sendAll()

  console.log(
    `[STATUS_UPDATE] Job complete: sent=${result.sent}, failed=${result.failed}`
  )

  if (result.errors.length > 0) {
    console.log('[STATUS_UPDATE] Errors:', result.errors)
  }

  return result
}
