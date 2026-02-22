/**
 * Manual test script for cron jobs
 *
 * Usage: npx tsx src/scripts/test-cron.ts [job-name]
 *
 * Examples:
 *   npx tsx src/scripts/test-cron.ts digest
 *   npx tsx src/scripts/test-cron.ts task-escalation
 *   npx tsx src/scripts/test-cron.ts checklist-escalation
 */

import { runDigestJob } from '../cron/digest-cron'
import { runTaskEscalationJob, runChecklistEscalationJob } from '../cron/task-escalation-cron'
import { runGracePeriodCheck, runBillingOwnerCheck, runLowMemberCountCheck, runAutoConfirms, runAutoConfirmWarnings } from '../cron/billing-cron'

const jobs: Record<string, () => Promise<any>> = {
  'digest': runDigestJob,
  'task-escalation': runTaskEscalationJob,
  'checklist-escalation': runChecklistEscalationJob,
  'grace-period': runGracePeriodCheck,
  'billing-owner': runBillingOwnerCheck,
  'low-member': runLowMemberCountCheck,
  'auto-confirms': runAutoConfirms,
  'auto-confirm-warnings': runAutoConfirmWarnings,
}

async function main() {
  const jobName = process.argv[2]

  if (!jobName || !jobs[jobName]) {
    console.log('Available jobs:')
    Object.keys(jobs).forEach(name => console.log(`  - ${name}`))
    console.log('\nUsage: npx tsx src/scripts/test-cron.ts <job-name>')
    process.exit(1)
  }

  console.log(`\n🚀 Running ${jobName} job...\n`)

  const startTime = Date.now()
  try {
    const result = await jobs[jobName]()
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n✅ Job completed in ${duration}s`)
    if (result) {
      console.log('Result:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.error(`\n❌ Job failed after ${duration}s:`, error)
    process.exit(1)
  }

  process.exit(0)
}

main()
