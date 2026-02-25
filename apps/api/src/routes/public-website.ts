/**
 * Public Website Integration Routes
 *
 * Handles inbound data from external band websites (applications, contact forms)
 * and provides endpoints for fetching public band data.
 *
 * Authentication: API key based (X-API-Key header)
 */

import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { notificationService } from '../services/notification.service'

const router = Router()

// ============================================
// TYPES
// ============================================

type InboundType = 'application' | 'contact'

interface InboundPayload {
  type: InboundType
  data: Record<string, any>
  source?: string
}

interface ApplicationData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  message?: string
  // Additional fields are stored in metadata
  [key: string]: any
}

interface ContactData {
  name: string
  email: string
  subject?: string
  message: string
  [key: string]: any
}

// ============================================
// HELPERS
// ============================================

/**
 * Validate API key for a band
 */
async function validateApiKey(bandSlug: string, apiKey: string): Promise<{ valid: boolean; band?: any }> {
  if (!apiKey) {
    return { valid: false }
  }

  const band = await prisma.band.findUnique({
    where: { slug: bandSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      publicApiKey: true,
      publicWebsiteUrl: true,
    },
  })

  if (!band || !band.publicApiKey) {
    return { valid: false }
  }

  // Simple string comparison for now
  // In production, consider using hashed keys
  if (band.publicApiKey !== apiKey) {
    return { valid: false }
  }

  return { valid: true, band }
}

/**
 * Get admins who should be notified of inbound submissions
 */
async function getBandAdmins(bandId: string): Promise<string[]> {
  const admins = await prisma.member.findMany({
    where: {
      bandId,
      status: 'ACTIVE',
      role: { in: ['FOUNDER', 'GOVERNOR', 'MODERATOR'] },
    },
    select: { userId: true },
  })
  return admins.map(a => a.userId)
}

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/public/bands/:slug/inbound
 *
 * Receives data from external websites (applications, contact forms)
 */
router.post('/bands/:slug/inbound', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const apiKey = req.headers['x-api-key'] as string
    const payload = req.body as InboundPayload

    // Validate API key
    const { valid, band } = await validateApiKey(slug, apiKey)
    if (!valid || !band) {
      return res.status(401).json({ error: 'Invalid or missing API key' })
    }

    // Validate payload
    if (!payload.type || !payload.data) {
      return res.status(400).json({ error: 'Missing type or data in payload' })
    }

    const { type, data, source } = payload

    switch (type) {
      case 'application': {
        return await handleApplication(band, data as ApplicationData, source, res)
      }

      case 'contact': {
        return await handleContact(band, data as ContactData, source, res)
      }

      default:
        return res.status(400).json({ error: `Unknown inbound type: ${type}` })
    }
  } catch (error) {
    console.error('Error processing inbound request:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Handle membership application
 */
async function handleApplication(
  band: { id: string; name: string; slug: string },
  data: ApplicationData,
  source: string | undefined,
  res: Response
) {
  const { firstName, lastName, email, phone, ...metadata } = data

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Missing required fields: firstName, lastName, email' })
  }

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  // Create user if doesn't exist
  // Generate a random password - they'll need to reset it to access their account
  if (!user) {
    const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: `${firstName} ${lastName}`,
        password: randomPassword, // Temporary - user will reset via forgot password
      },
    })
  }

  // Check if already a member or has pending application
  const existingMember = await prisma.member.findFirst({
    where: {
      bandId: band.id,
      userId: user.id,
      status: { in: ['ACTIVE', 'PENDING', 'INVITED'] },
    },
  })

  if (existingMember) {
    if (existingMember.status === 'ACTIVE') {
      return res.status(400).json({ error: 'Already a member of this band' })
    }
    if (existingMember.status === 'PENDING') {
      return res.status(400).json({ error: 'Application already pending' })
    }
    if (existingMember.status === 'INVITED') {
      return res.status(400).json({ error: 'Already invited to this band' })
    }
  }

  // Create pending member record
  const member = await prisma.member.create({
    data: {
      bandId: band.id,
      userId: user.id,
      status: 'PENDING',
      role: 'OBSERVER', // Will be set properly when approved
      notes: JSON.stringify({
        source: source || 'public-website',
        submittedAt: new Date().toISOString(),
        phone: phone || null,
        ...metadata,
      }),
    },
  })

  // Notify band admins
  const adminIds = await getBandAdmins(band.id)
  for (const adminId of adminIds) {
    await notificationService.create({
      userId: adminId,
      type: 'MEMBER_APPLIED',
      title: 'New Membership Application',
      message: `${firstName} ${lastName} has applied to join ${band.name} via the public website.`,
      actionUrl: `/bands/${band.slug}/applications`,
      priority: 'MEDIUM',
      bandId: band.id,
      relatedId: member.id,
      relatedType: 'member',
    })
  }

  // Log to audit
  await prisma.auditLog.create({
    data: {
      bandId: band.id,
      actorId: user.id,
      action: 'PUBLIC_APPLICATION_SUBMITTED',
      entityType: 'MEMBER',
      entityId: member.id,
      entityName: `${firstName} ${lastName}`,
      changes: {
        source: source || 'public-website',
        email,
      },
    },
  })

  return res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    applicationId: member.id,
  })
}

/**
 * Handle contact form submission
 */
async function handleContact(
  band: { id: string; name: string; slug: string },
  data: ContactData,
  source: string | undefined,
  res: Response
) {
  const { name, email, subject, message, ...metadata } = data

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields: name, email, message' })
  }

  // Store contact submission
  // Using a generic "PublicSubmission" concept - could be a separate table
  // For now, we'll create a notification and audit log

  const adminIds = await getBandAdmins(band.id)

  for (const adminId of adminIds) {
    await notificationService.create({
      userId: adminId,
      type: 'CONTACT_FORM_SUBMITTED',
      title: subject || 'New Contact Form Message',
      message: `${name} (${email}) sent a message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
      actionUrl: `/bands/${band.slug}`,
      priority: 'LOW',
      bandId: band.id,
      metadata: {
        senderName: name,
        senderEmail: email,
        subject,
        message,
        source: source || 'public-website',
        ...metadata,
      },
    })
  }

  // Log to audit
  await prisma.auditLog.create({
    data: {
      bandId: band.id,
      actorId: null, // External user
      action: 'PUBLIC_CONTACT_SUBMITTED',
      entityType: 'CONTACT',
      entityId: `contact-${Date.now()}`,
      entityName: name,
      changes: {
        email,
        subject,
        messagePreview: message.substring(0, 200),
        source: source || 'public-website',
      },
    },
  })

  return res.status(201).json({
    success: true,
    message: 'Message received. We will get back to you soon.',
  })
}

/**
 * GET /api/public/bands/:slug/info
 *
 * Get public information about a band (no auth required)
 */
router.get('/bands/:slug/info', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params

    const band = await prisma.band.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            members: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    })

    if (!band || band.status !== 'ACTIVE') {
      return res.status(404).json({ error: 'Band not found' })
    }

    return res.json({
      id: band.id,
      name: band.name,
      slug: band.slug,
      description: band.description,
      imageUrl: band.imageUrl,
      memberCount: band._count.members,
      createdAt: band.createdAt,
    })
  } catch (error) {
    console.error('Error fetching band info:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/public/bands/:slug/members
 *
 * Get public member list (requires API key, returns limited info)
 */
router.get('/bands/:slug/members', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const apiKey = req.headers['x-api-key'] as string

    const { valid, band } = await validateApiKey(slug, apiKey)
    if (!valid || !band) {
      return res.status(401).json({ error: 'Invalid or missing API key' })
    }

    const members = await prisma.member.findMany({
      where: {
        bandId: band.id,
        status: 'ACTIVE',
      },
      select: {
        role: true,
        createdAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return res.json({
      members: members.map(m => ({
        name: m.user.name,
        role: m.role,
        joinedAt: m.createdAt,
      })),
      count: members.length,
    })
  } catch (error) {
    console.error('Error fetching members:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
