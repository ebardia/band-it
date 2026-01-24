/**
 * Stripe Connect Routes
 *
 * Handles OAuth flow for connecting Band Stripe accounts (Standard Connect).
 * Band-It never touches funds - bands receive payments directly.
 */

import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import {
  generateStateToken,
  storeOAuthState,
  validateAndConsumeOAuthState,
} from '../lib/oauth-state-store'
import { auditStorage, logAuditEvent, AuditContext } from '../lib/auditContext'

const router = Router()

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Environment variables
const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID
const STRIPE_REDIRECT_URI = process.env.STRIPE_CONNECT_REDIRECT_URI ||
  `${process.env.API_URL || 'http://localhost:3001'}/api/stripe/connect/callback`
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Roles that can connect/disconnect Stripe
const CAN_MANAGE_STRIPE = ['FOUNDER', 'GOVERNOR']

// ============================================
// HELPERS
// ============================================

interface AuthenticatedUser {
  userId: string
}

/**
 * Extract user from JWT token in Authorization header
 */
function getUserFromRequest(req: Request): AuthenticatedUser | null {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return { userId: decoded.userId }
  } catch {
    return null
  }
}

/**
 * Extract audit context from request
 */
function getAuditContextFromRequest(req: Request, userId?: string): AuditContext {
  const forwarded = req.headers['x-forwarded-for']
  const ipAddress = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress

  return {
    userId,
    ipAddress,
    userAgent: req.headers['user-agent'],
  }
}

/**
 * Check if user has permission to manage Stripe for this band
 */
async function canUserManageStripe(userId: string, bandId: string): Promise<boolean> {
  const member = await prisma.member.findUnique({
    where: {
      userId_bandId: { userId, bandId },
    },
    select: { role: true, status: true },
  })

  if (!member || member.status !== 'ACTIVE') {
    return false
  }

  return CAN_MANAGE_STRIPE.includes(member.role)
}

/**
 * Check if user is a member of the band
 */
async function isUserBandMember(userId: string, bandId: string): Promise<boolean> {
  const member = await prisma.member.findUnique({
    where: {
      userId_bandId: { userId, bandId },
    },
    select: { status: true },
  })

  return member?.status === 'ACTIVE'
}

/**
 * Get active Stripe account for band
 */
async function getActiveBandStripeAccount(bandId: string) {
  return prisma.bandStripeAccount.findFirst({
    where: {
      bandId,
      disconnectedAt: null,
    },
  })
}

// ============================================
// ENDPOINTS
// ============================================

/**
 * POST /api/bands/:bandId/stripe/connect
 *
 * Start Stripe OAuth flow to connect a band's Stripe account.
 * Returns a URL to redirect the user to Stripe.
 */
router.post('/bands/:bandId/stripe/connect', async (req: Request, res: Response) => {
  try {
    const { bandId } = req.params
    const user = getUserFromRequest(req)

    // Auth check
    if (!user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' })
    }

    // Permission check
    const canManage = await canUserManageStripe(user.userId, bandId)
    if (!canManage) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Only founders and governors can connect Stripe accounts',
      })
    }

    // Check if band exists
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: { id: true, slug: true },
    })

    if (!band) {
      return res.status(404).json({ error: 'not_found', message: 'Band not found' })
    }

    // Check if already connected
    const existingAccount = await getActiveBandStripeAccount(bandId)
    if (existingAccount) {
      return res.status(400).json({
        error: 'already_connected',
        message: 'Band already has a connected Stripe account. Disconnect first to reconnect.',
      })
    }

    // Validate environment
    if (!STRIPE_CLIENT_ID) {
      console.error('STRIPE_CLIENT_ID not configured')
      return res.status(500).json({ error: 'server_error', message: 'Stripe not configured' })
    }

    // Generate state token for CSRF protection
    const state = generateStateToken()
    storeOAuthState(state, { bandId, userId: user.userId })

    // Build Stripe OAuth URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: STRIPE_CLIENT_ID,
      scope: 'read_write',
      redirect_uri: STRIPE_REDIRECT_URI,
      state: state,
    })

    const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`

    return res.json({ url })
  } catch (error) {
    console.error('Error starting Stripe connection:', error)
    return res.status(500).json({ error: 'server_error', message: 'Failed to start Stripe connection' })
  }
})

/**
 * GET /api/stripe/connect/callback
 *
 * OAuth callback from Stripe. Validates state, exchanges code for account,
 * stores connection, and redirects to frontend.
 */
router.get('/stripe/connect/callback', async (req: Request, res: Response) => {
  const { code, state, error: stripeError } = req.query as {
    code?: string
    state?: string
    error?: string
  }

  // Validate state first (before anything else)
  if (!state) {
    console.error('Stripe Connect callback: Missing state parameter')
    // Can't redirect to band page without knowing bandId
    return res.redirect(`${FRONTEND_URL}?error=invalid_state`)
  }

  const stateData = validateAndConsumeOAuthState(state)
  if (!stateData) {
    console.error('Stripe Connect callback: Invalid or expired state', { state })
    // Log security event
    console.warn('SECURITY: Stripe OAuth state mismatch or expired', { state })
    return res.redirect(`${FRONTEND_URL}?error=invalid_state`)
  }

  const { bandId, userId } = stateData

  // Look up the band slug for redirects
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: { slug: true },
  })
  const bandSlug = band?.slug || bandId

  // Check for Stripe error (user denied access)
  if (stripeError === 'access_denied') {
    return res.redirect(`${FRONTEND_URL}/bands/${bandSlug}/finance?error=access_denied`)
  }

  if (stripeError) {
    console.error('Stripe Connect callback error:', stripeError)
    return res.redirect(`${FRONTEND_URL}/bands/${bandSlug}/finance?error=stripe_error`)
  }

  // Validate code
  if (!code) {
    console.error('Stripe Connect callback: Missing code')
    return res.redirect(`${FRONTEND_URL}/bands/${bandSlug}/finance?error=stripe_error`)
  }

  try {
    // Exchange code for access token and account ID
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    })

    const stripeAccountId = response.stripe_user_id
    if (!stripeAccountId) {
      console.error('Stripe Connect: No stripe_user_id in response')
      return res.redirect(`${FRONTEND_URL}/bands/${bandSlug}/finance?error=stripe_error`)
    }

    // Fetch account details
    const account = await stripe.accounts.retrieve(stripeAccountId)

    // Check if there's already an active connection (race condition protection)
    const existingAccount = await getActiveBandStripeAccount(bandId)
    if (existingAccount) {
      console.warn('Stripe Connect: Band already connected during OAuth flow', { bandId })
      return res.redirect(`${FRONTEND_URL}/bands/${bandSlug}/finance?error=already_connected`)
    }

    // Store in database
    await prisma.bandStripeAccount.create({
      data: {
        bandId,
        stripeAccountId,
        chargesEnabled: account.charges_enabled ?? false,
        detailsSubmitted: account.details_submitted ?? false,
        connectedAt: new Date(),
      },
    })

    console.log('Stripe Connect: Successfully connected', {
      bandId,
      stripeAccountId,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
    })

    // Log audit event
    const auditContext = getAuditContextFromRequest(req, userId)
    await auditStorage.run(auditContext, async () => {
      await logAuditEvent({
        bandId,
        action: 'stripe_account_connected',
        entityType: 'BandStripeAccount',
        entityId: stripeAccountId,
        entityName: `Stripe Account ${stripeAccountId.slice(-8)}`,
        changes: {
          chargesEnabled: { from: null, to: account.charges_enabled },
          detailsSubmitted: { from: null, to: account.details_submitted },
        },
      })
    })

    // Redirect to frontend with success (use slug, not id)
    return res.redirect(`${FRONTEND_URL}/bands/${bandSlug}/finance?stripe=connected`)
  } catch (error: any) {
    console.error('Stripe Connect callback error:', error.message || error)

    if (error.type === 'StripeInvalidGrantError') {
      return res.redirect(`${FRONTEND_URL}/bands/${bandSlug}/finance?error=invalid_code`)
    }

    return res.redirect(`${FRONTEND_URL}/bands/${bandSlug}/finance?error=server_error`)
  }
})

/**
 * GET /api/bands/:bandId/stripe/status
 *
 * Get Stripe connection status for a band.
 * Any band member can view this.
 */
router.get('/bands/:bandId/stripe/status', async (req: Request, res: Response) => {
  try {
    const { bandId } = req.params
    const user = getUserFromRequest(req)

    // Auth check
    if (!user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' })
    }

    // Membership check (any member can view status)
    const isMember = await isUserBandMember(user.userId, bandId)
    if (!isMember) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'You must be a band member to view Stripe status',
      })
    }

    // Get active Stripe account
    const account = await getActiveBandStripeAccount(bandId)

    if (!account) {
      return res.json({ connected: false })
    }

    return res.json({
      connected: true,
      stripeAccountId: account.stripeAccountId,
      chargesEnabled: account.chargesEnabled,
      detailsSubmitted: account.detailsSubmitted,
      connectedAt: account.connectedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error getting Stripe status:', error)
    return res.status(500).json({ error: 'server_error', message: 'Failed to get Stripe status' })
  }
})

/**
 * POST /api/bands/:bandId/stripe/refresh
 *
 * Refresh account status from Stripe.
 * Only founders and governors can do this.
 */
router.post('/bands/:bandId/stripe/refresh', async (req: Request, res: Response) => {
  try {
    const { bandId } = req.params
    const user = getUserFromRequest(req)

    // Auth check
    if (!user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' })
    }

    // Permission check
    const canManage = await canUserManageStripe(user.userId, bandId)
    if (!canManage) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Only founders and governors can refresh Stripe status',
      })
    }

    // Get active Stripe account
    const account = await getActiveBandStripeAccount(bandId)

    if (!account) {
      return res.status(400).json({
        error: 'not_connected',
        message: 'Band does not have a connected Stripe account',
      })
    }

    // Fetch latest status from Stripe
    const stripeAccount = await stripe.accounts.retrieve(account.stripeAccountId)

    // Update in database
    const updated = await prisma.bandStripeAccount.update({
      where: { id: account.id },
      data: {
        chargesEnabled: stripeAccount.charges_enabled ?? false,
        detailsSubmitted: stripeAccount.details_submitted ?? false,
      },
    })

    return res.json({
      connected: true,
      stripeAccountId: updated.stripeAccountId,
      chargesEnabled: updated.chargesEnabled,
      detailsSubmitted: updated.detailsSubmitted,
      connectedAt: updated.connectedAt.toISOString(),
    })
  } catch (error: any) {
    console.error('Error refreshing Stripe status:', error)

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: 'stripe_error',
        message: 'Stripe account not found or access revoked',
      })
    }

    return res.status(500).json({ error: 'server_error', message: 'Failed to refresh Stripe status' })
  }
})

/**
 * POST /api/bands/:bandId/stripe/disconnect
 *
 * Disconnect Stripe account from band.
 * Only founders and governors can do this.
 * Soft delete - does not revoke access on Stripe side.
 */
router.post('/bands/:bandId/stripe/disconnect', async (req: Request, res: Response) => {
  try {
    const { bandId } = req.params
    const user = getUserFromRequest(req)

    // Auth check
    if (!user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' })
    }

    // Permission check
    const canManage = await canUserManageStripe(user.userId, bandId)
    if (!canManage) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Only founders and governors can disconnect Stripe accounts',
      })
    }

    // Get active Stripe account
    const account = await getActiveBandStripeAccount(bandId)

    if (!account) {
      return res.status(400).json({
        error: 'not_connected',
        message: 'Band does not have a connected Stripe account',
      })
    }

    // Soft delete - set disconnectedAt
    await prisma.bandStripeAccount.update({
      where: { id: account.id },
      data: {
        disconnectedAt: new Date(),
      },
    })

    console.log('Stripe Connect: Disconnected', {
      bandId,
      stripeAccountId: account.stripeAccountId,
    })

    // Log audit event
    const auditContext = getAuditContextFromRequest(req, user.userId)
    await auditStorage.run(auditContext, async () => {
      await logAuditEvent({
        bandId,
        action: 'stripe_account_disconnected',
        entityType: 'BandStripeAccount',
        entityId: account.stripeAccountId,
        entityName: `Stripe Account ${account.stripeAccountId.slice(-8)}`,
      })
    })

    return res.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting Stripe:', error)
    return res.status(500).json({ error: 'server_error', message: 'Failed to disconnect Stripe' })
  }
})

export default router
