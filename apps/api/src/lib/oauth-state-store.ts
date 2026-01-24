/**
 * OAuth State Store
 *
 * Simple in-memory store for OAuth state tokens with TTL.
 * Used for CSRF protection in OAuth flows.
 */

import crypto from 'crypto'

interface StateData {
  bandId: string
  userId: string
  createdAt: number
}

// In-memory store for OAuth state tokens
const stateStore = new Map<string, StateData>()

// Default TTL: 10 minutes
const DEFAULT_TTL_MS = 10 * 60 * 1000

/**
 * Generate a cryptographically secure random state token
 */
export function generateStateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Store OAuth state with associated data
 *
 * @param state - The state token
 * @param data - Associated data (bandId, userId)
 * @param ttlMs - Time to live in milliseconds (default: 10 minutes)
 */
export function storeOAuthState(
  state: string,
  data: { bandId: string; userId: string },
  ttlMs: number = DEFAULT_TTL_MS
): void {
  stateStore.set(state, {
    ...data,
    createdAt: Date.now(),
  })

  // Schedule cleanup after TTL
  setTimeout(() => {
    stateStore.delete(state)
  }, ttlMs)
}

/**
 * Validate and retrieve OAuth state data
 *
 * @param state - The state token to validate
 * @returns The associated data if valid, null if invalid or expired
 */
export function validateAndConsumeOAuthState(
  state: string
): { bandId: string; userId: string } | null {
  const data = stateStore.get(state)

  if (!data) {
    return null
  }

  // Check if expired (defensive, though setTimeout should handle this)
  const age = Date.now() - data.createdAt
  if (age > DEFAULT_TTL_MS) {
    stateStore.delete(state)
    return null
  }

  // Consume the state (one-time use)
  stateStore.delete(state)

  return {
    bandId: data.bandId,
    userId: data.userId,
  }
}

/**
 * Clear all stored states (useful for testing)
 */
export function clearAllStates(): void {
  stateStore.clear()
}

/**
 * Get the number of stored states (useful for debugging)
 */
export function getStateCount(): number {
  return stateStore.size
}
