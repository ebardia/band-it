/**
 * Shared constants used across the application
 */

/**
 * Minimum number of active members required to activate a band.
 * Set to 1 for testing period, normally 3 for production.
 */
export const MIN_MEMBERS_TO_ACTIVATE = 1

/**
 * Pricing tier thresholds
 */
export const PRICING_TIER_THRESHOLD = 21 // Members count where pricing changes from $20 to $100

/**
 * Whether bands require payment to become active.
 * Set to false for testing, true for production.
 * When false, bands auto-activate when reaching MIN_MEMBERS_TO_ACTIVATE.
 */
export const REQUIRE_PAYMENT_TO_ACTIVATE = false
