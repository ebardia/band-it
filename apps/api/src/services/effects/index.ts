/**
 * Effect Handlers Registry
 *
 * This module exports all effect handlers and provides an initialization
 * function to register them with the proposal effects service.
 */

import { registerFinanceBucketGovernanceEffects } from './finance-bucket-governance.effects'

// Re-export for direct access
export * from './finance-bucket-governance.effects'

/**
 * Initialize all effect handlers
 * Call this when the application starts
 */
export function initializeEffectHandlers(): void {
  registerFinanceBucketGovernanceEffects()

  // Add future effect handler registrations here
  // e.g., registerMembershipGovernanceEffects()
  // e.g., registerVotingGovernanceEffects()
}
