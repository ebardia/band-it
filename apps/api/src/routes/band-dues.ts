/**
 * Band Dues Routes
 *
 * Handles band membership dues: plans, checkout, and billing status.
 * Payments go directly to the band's connected Stripe account.
 */

import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { auditStorage, logAuditEvent, AuditContext } from '../lib/auditContext'

const router = Router()

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Environment variables
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Roles that can manage dues plans
const CAN_MANAGE_DUES = ['FOUNDER', 'GOVERNOR']

// Roles that can view all members' billing
const CAN_VIEW_ALL_BILLING = ['FOUNDER', 'GOVERNOR']

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
 * Get user's membership and role in a band
 */
async function getMembership(userId: string, bandId: string) {
  return prisma.member.findUnique({
    where: {
      userId_bandId: { userId, bandId },
    },
    select: { role: true, status: true, isTreasurer: true },
  })
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

/**
 * Get active dues plan for band
 */
async function getActiveDuesPlan(bandId: string) {
  return prisma.bandDuesPlan.findFirst({
    where: {
      bandId,
      isActive: true,
    },
  })
}

/**
 * Validate dues plan input
 */
function validateDuesPlanInput(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (typeof body.amountCents !== 'number') {
    errors.push('amountCents is required and must be a number')
  } else if (body.amountCents < 50) {
    errors.push('amountCents must be at least 50 (Stripe minimum)')
  } else if (body.amountCents > 99999999) {
    errors.push('amountCents must not exceed 99999999')
  }

  if (!body.currency) {
    errors.push('currency is required')
  } else if (body.currency !== 'usd') {
    errors.push('currency must be "usd" (only USD supported in v1)')
  }

  if (!body.interval) {
    errors.push('interval is required')
  } else if (!['month', 'year'].includes(body.interval)) {
    errors.push('interval must be "month" or "year"')
  }

  if (typeof body.isActive !== 'boolean') {
    errors.push('isActive is required and must be a boolean')
  }

  return { valid: errors.length === 0, errors }
}

// ============================================
// ENDPOINTS
// ============================================

/**
 * PUT /api/bands/:bandId/dues-plan
 *
 * Create or update the band's dues plan.
 * Only founders and governors can do this.
 */
router.put('/bands/:bandId/dues-plan', async (req: Request, res: Response) => {
  try {
    const { bandId } = req.params
    const user = getUserFromRequest(req)

    // Auth check
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
    }

    // Permission check
    const member = await getMembership(user.userId, bandId)
    if (!member || member.status !== 'ACTIVE' || !CAN_MANAGE_DUES.includes(member.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only founders and governors can manage dues plans',
      })
    }

    // Validate input
    const validation = validateDuesPlanInput(req.body)
    if (!validation.valid) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: validation.errors,
      })
    }

    // Get band with Stripe account
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: { id: true, name: true },
    })

    if (!band) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Band not found' })
    }

    // Check for connected Stripe account
    const stripeAccount = await getActiveBandStripeAccount(bandId)
    if (!stripeAccount) {
      return res.status(400).json({
        error: 'BAND_STRIPE_NOT_CONNECTED',
        message: 'Band must have a connected Stripe account to create a dues plan',
      })
    }

    const { amountCents, currency, interval, isActive } = req.body

    // Create or reuse Stripe Product on the connected account
    let stripeProductId: string

    // Check if we have an existing product
    const existingPlan = await prisma.bandDuesPlan.findFirst({
      where: { bandId },
      orderBy: { createdAt: 'desc' },
    })

    if (existingPlan?.stripeProductId) {
      stripeProductId = existingPlan.stripeProductId
    } else {
      // Create new product
      const product = await stripe.products.create({
        name: `Band Dues — ${band.name}`,
        metadata: { bandId },
      }, {
        stripeAccount: stripeAccount.stripeAccountId,
      })
      stripeProductId = product.id
    }

    // Always create a new price (prices are immutable in Stripe)
    const price = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: amountCents,
      currency: currency,
      recurring: { interval: interval },
    }, {
      stripeAccount: stripeAccount.stripeAccountId,
    })

    // Deactivate any existing active plans
    await prisma.bandDuesPlan.updateMany({
      where: { bandId, isActive: true },
      data: { isActive: false },
    })

    // Create new plan
    const newPlan = await prisma.bandDuesPlan.create({
      data: {
        bandId,
        isActive,
        currency,
        amountCents,
        interval,
        stripeProductId,
        stripePriceId: price.id,
      },
    })

    console.log('Band Dues: Created plan', {
      bandId,
      planId: newPlan.id,
      amountCents,
      interval,
    })

    // Log audit event
    const auditContext = getAuditContextFromRequest(req, user.userId)
    await auditStorage.run(auditContext, async () => {
      await logAuditEvent({
        bandId,
        action: 'dues_plan_created',
        entityType: 'BandDuesPlan',
        entityId: newPlan.id,
        entityName: `$${(amountCents / 100).toFixed(2)}/${interval}`,
        changes: {
          amountCents: { from: null, to: amountCents },
          currency: { from: null, to: currency },
          interval: { from: null, to: interval },
        },
      })
    })

    return res.json({
      id: newPlan.id,
      amountCents: newPlan.amountCents,
      currency: newPlan.currency,
      interval: newPlan.interval,
      isActive: newPlan.isActive,
      stripeProductId: newPlan.stripeProductId,
      stripePriceId: newPlan.stripePriceId,
    })
  } catch (error: any) {
    console.error('Error creating dues plan:', error)

    if (error.type?.startsWith('Stripe')) {
      return res.status(500).json({ error: 'STRIPE_ERROR', message: error.message })
    }

    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to create dues plan' })
  }
})

/**
 * GET /api/bands/:bandId/dues-plan
 *
 * Get the band's active dues plan.
 * Any band member can view.
 */
router.get('/bands/:bandId/dues-plan', async (req: Request, res: Response) => {
  try {
    const { bandId } = req.params
    const user = getUserFromRequest(req)

    // Auth check
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
    }

    // Membership check
    const member = await getMembership(user.userId, bandId)
    if (!member || member.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You must be an active band member to view the dues plan',
      })
    }

    const plan = await getActiveDuesPlan(bandId)

    if (!plan) {
      return res.json({ isActive: false })
    }

    return res.json({
      id: plan.id,
      amountCents: plan.amountCents,
      currency: plan.currency,
      interval: plan.interval,
      isActive: plan.isActive,
    })
  } catch (error) {
    console.error('Error getting dues plan:', error)
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to get dues plan' })
  }
})

/**
 * POST /api/bands/:bandId/dues-checkout
 *
 * Start a Stripe Checkout session for the authenticated member.
 */
router.post('/bands/:bandId/dues-checkout', async (req: Request, res: Response) => {
  try {
    const { bandId } = req.params
    const user = getUserFromRequest(req)

    // Auth check
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
    }

    // Get member's membership
    const member = await getMembership(user.userId, bandId)
    if (!member || member.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'NOT_A_MEMBER',
        message: 'You must be an active band member to pay dues',
      })
    }

    // Get band's Stripe account
    const stripeAccount = await getActiveBandStripeAccount(bandId)
    if (!stripeAccount) {
      return res.status(400).json({
        error: 'BAND_STRIPE_NOT_CONNECTED',
        message: 'This band does not have a connected Stripe account. A band admin needs to connect a Stripe account in the Finance page before dues can be collected.',
      })
    }

    // Check if charges are enabled
    if (!stripeAccount.chargesEnabled) {
      return res.status(400).json({
        error: 'STRIPE_NOT_READY',
        message: "This band's Stripe account setup is incomplete. A band admin needs to complete the Stripe account setup in the Stripe Dashboard.",
      })
    }

    // Get active dues plan
    const duesPlan = await getActiveDuesPlan(bandId)
    if (!duesPlan || !duesPlan.stripePriceId) {
      return res.status(400).json({
        error: 'NO_DUES_PLAN',
        message: 'This band has no active dues plan',
      })
    }

    // Check for existing active subscription
    const existingBilling = await prisma.bandMemberBilling.findUnique({
      where: {
        bandId_memberUserId: { bandId, memberUserId: user.userId },
      },
    })

    if (existingBilling?.status === 'ACTIVE') {
      return res.status(400).json({
        error: 'ALREADY_SUBSCRIBED',
        message: 'You already have an active subscription',
      })
    }

    // Get band slug for redirect URLs
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: { slug: true },
    })

    // Create Stripe Checkout session on the connected account
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price: duesPlan.stripePriceId,
        quantity: 1,
      }],
      success_url: `${FRONTEND_URL}/bands/${band?.slug || bandId}/billing?success=true`,
      cancel_url: `${FRONTEND_URL}/bands/${band?.slug || bandId}/billing?canceled=true`,
      metadata: {
        band_id: bandId,
        member_user_id: user.userId,
      },
    }, {
      stripeAccount: stripeAccount.stripeAccountId,
    })

    console.log('Band Dues: Created checkout session', {
      bandId,
      userId: user.userId,
      sessionId: session.id,
    })

    // Log audit event
    const auditContext = getAuditContextFromRequest(req, user.userId)
    await auditStorage.run(auditContext, async () => {
      await logAuditEvent({
        bandId,
        action: 'dues_checkout_started',
        entityType: 'BandMemberBilling',
        entityId: session.id,
        entityName: `Dues Checkout ($${(duesPlan.amountCents / 100).toFixed(2)}/${duesPlan.interval})`,
      })
    })

    return res.json({ checkoutUrl: session.url })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)

    if (error.type?.startsWith('Stripe')) {
      return res.status(500).json({
        error: 'CHECKOUT_FAILED',
        message: 'Unable to start checkout. Please try again.',
      })
    }

    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to start checkout' })
  }
})

/**
 * GET /api/bands/:bandId/members/:memberId/billing
 *
 * Get billing status for a specific member.
 * Members can view their own; founders/governors/treasurers can view any.
 */
router.get('/bands/:bandId/members/:memberId/billing', async (req: Request, res: Response) => {
  try {
    const { bandId, memberId } = req.params
    const user = getUserFromRequest(req)

    // Auth check
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
    }

    // Permission check
    const requestingMember = await getMembership(user.userId, bandId)
    if (!requestingMember || requestingMember.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    // Check if user can view this member's billing
    const isOwnBilling = memberId === user.userId
    const canViewAll = CAN_VIEW_ALL_BILLING.includes(requestingMember.role) || requestingMember.isTreasurer

    if (!isOwnBilling && !canViewAll) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You can only view your own billing status',
      })
    }

    // Get billing record
    const billing = await prisma.bandMemberBilling.findUnique({
      where: {
        bandId_memberUserId: { bandId, memberUserId: memberId },
      },
    })

    if (!billing) {
      return res.json({
        status: 'UNPAID',
        currentPeriodEnd: null,
        lastPaymentAt: null,
      })
    }

    return res.json({
      status: billing.status,
      currentPeriodEnd: billing.currentPeriodEnd?.toISOString() || null,
      lastPaymentAt: billing.lastPaymentAt?.toISOString() || null,
    })
  } catch (error) {
    console.error('Error getting member billing:', error)
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to get billing status' })
  }
})

/**
 * GET /api/bands/:bandId/billing
 *
 * List billing status for all band members.
 * Only founders, governors, and treasurers can view.
 */
router.get('/bands/:bandId/billing', async (req: Request, res: Response) => {
  try {
    const { bandId } = req.params
    const { status: filterStatus } = req.query
    const user = getUserFromRequest(req)

    // Auth check
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
    }

    // Permission check
    const member = await getMembership(user.userId, bandId)
    if (!member || member.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You must be an active band member',
      })
    }

    const canViewAll = CAN_VIEW_ALL_BILLING.includes(member.role) || member.isTreasurer
    if (!canViewAll) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only founders, governors, and treasurers can view all billing statuses',
      })
    }

    // Get all active members
    const allMembers = await prisma.member.findMany({
      where: { bandId, status: 'ACTIVE' },
      include: {
        user: { select: { id: true, name: true } },
      },
    })

    // Get all billing records
    const billingRecords = await prisma.bandMemberBilling.findMany({
      where: { bandId },
    })

    // Create a map of userId -> billing
    const billingMap = new Map(billingRecords.map(b => [b.memberUserId, b]))

    // Build member list with billing status
    let members = allMembers.map(m => {
      const billing = billingMap.get(m.user.id)
      return {
        userId: m.user.id,
        displayName: m.user.name,
        status: billing?.status || 'UNPAID',
        currentPeriodEnd: billing?.currentPeriodEnd?.toISOString() || null,
      }
    })

    // Filter by status if specified
    if (filterStatus && ['ACTIVE', 'UNPAID', 'PAST_DUE', 'CANCELED'].includes(filterStatus as string)) {
      members = members.filter(m => m.status === filterStatus)
    }

    // Calculate summary
    const summary = {
      total: allMembers.length,
      active: members.filter(m => m.status === 'ACTIVE').length,
      unpaid: members.filter(m => m.status === 'UNPAID').length,
      pastDue: members.filter(m => m.status === 'PAST_DUE').length,
      canceled: members.filter(m => m.status === 'CANCELED').length,
    }

    return res.json({ members, summary })
  } catch (error) {
    console.error('Error getting band billing:', error)
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to get billing data' })
  }
})

export default router
