import crypto from 'crypto'

const DIGEST_SECRET = process.env.DIGEST_UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || 'digest-secret-key'
const TOKEN_EXPIRY_DAYS = 90

/**
 * Generate an unsubscribe token for digest emails
 * Token format: base64(userId:timestamp:signature)
 * Signature: HMAC-SHA256(userId:timestamp, SECRET)
 */
export function generateUnsubscribeToken(userId: string): string {
  const timestamp = Date.now().toString()
  const data = `${userId}:${timestamp}`

  const signature = crypto
    .createHmac('sha256', DIGEST_SECRET)
    .update(data)
    .digest('hex')

  const token = Buffer.from(`${userId}:${timestamp}:${signature}`).toString('base64url')
  return token
}

/**
 * Verify an unsubscribe token and extract the userId
 * Returns null if token is invalid or expired
 */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split(':')

    if (parts.length !== 3) {
      return null
    }

    const [userId, timestamp, signature] = parts

    // Verify signature
    const data = `${userId}:${timestamp}`
    const expectedSignature = crypto
      .createHmac('sha256', DIGEST_SECRET)
      .update(data)
      .digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null
    }

    // Check expiration (90 days)
    const tokenTime = parseInt(timestamp, 10)
    const expiryMs = TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    const now = Date.now()

    if (now - tokenTime > expiryMs) {
      return null // Token expired
    }

    return userId
  } catch (error) {
    return null
  }
}

/**
 * Generate the full unsubscribe URL for an email
 */
export function getUnsubscribeUrl(userId: string): string {
  const token = generateUnsubscribeToken(userId)
  const baseUrl = process.env.FRONTEND_URL || 'https://banditeco.com'
  return `${baseUrl}/unsubscribe?token=${token}`
}

/**
 * Generate the preferences URL for an email
 */
export function getPreferencesUrl(): string {
  const baseUrl = process.env.FRONTEND_URL || 'https://banditeco.com'
  return `${baseUrl}/user-dashboard/settings`
}
