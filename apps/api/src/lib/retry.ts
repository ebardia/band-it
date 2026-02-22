/**
 * Retry utility for handling transient failures (e.g., database connection issues)
 */

import { prisma } from './prisma'

export interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  resetConnection?: boolean
  onRetry?: (error: Error, attempt: number, delayMs: number) => void
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 5,
  initialDelayMs: 5000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  resetConnection: true,
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if an error is a transient database connection error that should be retried
 */
function isTransientError(error: any): boolean {
  // Prisma connection errors
  if (error?.code === 'P1001') return true // Can't reach database server
  if (error?.code === 'P1002') return true // Database server timeout
  if (error?.code === 'P1008') return true // Operations timed out
  if (error?.code === 'P1017') return true // Server closed connection

  // Check error message for common transient issues
  const message = error?.message?.toLowerCase() || ''
  if (message.includes('connection') && message.includes('closed')) return true
  if (message.includes("can't reach database")) return true
  if (message.includes('connection refused')) return true
  if (message.includes('connection timeout')) return true
  if (message.includes('econnreset')) return true
  if (message.includes('etimedout')) return true

  return false
}

/**
 * Execute a function with automatic retries for transient failures
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
    resetConnection,
  } = { ...DEFAULT_OPTIONS, ...options }
  const { onRetry } = options

  let lastError: Error | null = null
  let delayMs = initialDelayMs

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // If it's the last attempt or not a transient error, throw immediately
      if (attempt > maxRetries || !isTransientError(error)) {
        throw error
      }

      // Log the retry
      console.log(`[RETRY] Attempt ${attempt} failed with transient error, retrying in ${delayMs}ms...`)

      if (onRetry) {
        onRetry(error, attempt, delayMs)
      }

      // Reset Prisma connection to get a fresh connection from the pool
      if (resetConnection) {
        try {
          console.log(`[RETRY] Resetting database connection...`)
          await prisma.$disconnect()
        } catch (disconnectError) {
          console.log(`[RETRY] Disconnect error (ignored):`, disconnectError)
        }
      }

      // Wait before retrying
      await sleep(delayMs)

      // Increase delay for next attempt (exponential backoff)
      delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError
}

/**
 * Wrap a cron job function with retry logic
 * Logs errors but doesn't throw, so cron continues running
 *
 * Default retry window: ~2.5 minutes (5s + 10s + 20s + 40s + 60s)
 * This handles Neon database cold starts and brief outages
 */
export async function withCronRetry<T>(
  jobName: string,
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T | null> {
  try {
    return await withRetry(fn, {
      maxRetries: 5,
      initialDelayMs: 5000, // Start with 5 second delay
      maxDelayMs: 60000,    // Cap at 1 minute between retries
      backoffMultiplier: 2,
      resetConnection: true,
      onRetry: (error, attempt, delayMs) => {
        console.log(`[${jobName}] Retry ${attempt}/${5}: ${error.message}. Waiting ${delayMs / 1000}s...`)
      },
      ...options,
    })
  } catch (error: any) {
    console.error(`[${jobName}] Fatal error after 5 retries:`, error)
    return null
  }
}
