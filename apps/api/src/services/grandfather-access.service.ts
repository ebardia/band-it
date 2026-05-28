import { prisma } from '../lib/prisma'

/**
 * Users who already existed when the waiting-room gate launched keep their
 * access — only signups created after this cutoff are gated. Runs on startup
 * and is idempotent (it only ever touches still-unapproved, pre-cutoff users),
 * so re-running on every deploy is a safe no-op once the backfill has applied.
 */
const GATE_LAUNCH_CUTOFF = new Date('2026-05-28T22:00:00Z')

export async function grandfatherExistingUsers(): Promise<void> {
  try {
    const result = await prisma.user.updateMany({
      where: {
        createdAt: { lt: GATE_LAUNCH_CUTOFF },
        accessApproved: false,
      },
      data: { accessApproved: true },
    })
    if (result.count > 0) {
      console.log(`✅ Grandfathered ${result.count} pre-launch user(s) into approved access`)
    }
  } catch (err) {
    // Never let the backfill block server startup.
    console.error('[grandfatherExistingUsers] backfill failed:', err)
  }
}
