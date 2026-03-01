/**
 * Feature flags for the application
 */

/**
 * Whether P2P payment methods (Venmo, Zelle, Cash App, etc.) are enabled.
 * When false, hides:
 * - Donations tab and features
 * - Manual payments tab and features
 * - Donation settings in finance page
 *
 * Set via NEXT_PUBLIC_ENABLE_P2P_PAYMENTS environment variable.
 * Defaults to false (disabled).
 */
export const isP2PPaymentsEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_ENABLE_P2P_PAYMENTS === 'true'
}
