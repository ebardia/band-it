import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { TRPCError } from '@trpc/server'
import { emailService } from './email.service'
import { analyticsService } from './analytics.service'

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d' // Access token expires in 7 days (for development - implement refresh in production)
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

// Feature flags for testing/development
const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true'
const SKIP_PAYMENT_CHECK = process.env.SKIP_PAYMENT_CHECK === 'true'

/** Pending invites expired after this many days are not auto-attached (register/login). Default 30. */
const PENDING_INVITE_GRACE_DAYS = Number(process.env.PENDING_INVITE_GRACE_DAYS) || 30

function pendingInviteExpiresAfterCutoff(): Date {
  return new Date(Date.now() - PENDING_INVITE_GRACE_DAYS * 24 * 60 * 60 * 1000)
}

function isPendingInviteAttachable(
  invite: { expiresAt: Date; invalidatedAt: Date | null },
): boolean {
  if (invite.invalidatedAt) {
    return false
  }
  return invite.expiresAt > pendingInviteExpiresAfterCutoff()
}

export const authService = {
  /**
   * Register a new user
   * @param inviteToken - Optional invite token from band invite email
   * @param guidelinesVersion - Version of community guidelines accepted
   * @param tosVersion - Version of Terms of Service/Privacy Policy accepted
   */
  async register(email: string, password: string, name: string, inviteToken?: string, guidelinesVersion?: number, tosVersion?: number) {
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User with this email already exists',
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with optional auto-verification
    // Registration is free - all users start as ACTIVE
    // Payment will be required when creating a band
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name,
        // Auto-verify email if SKIP_EMAIL_VERIFICATION is enabled
        emailVerified: SKIP_EMAIL_VERIFICATION,
        emailVerifiedAt: SKIP_EMAIL_VERIFICATION ? new Date() : null,
        // All users are ACTIVE by default - payment happens at band creation
        subscriptionStatus: 'ACTIVE',
        // Community guidelines acceptance
        guidelinesAcceptedAt: guidelinesVersion ? new Date() : null,
        guidelinesVersion: guidelinesVersion || null,
        // Terms of Service & Privacy Policy acceptance
        tosAcceptedAt: tosVersion ? new Date() : null,
        tosVersion: tosVersion || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        emailVerified: true,
        subscriptionStatus: true,
        accessApproved: true,
        isAdmin: true,
      },
    })

    // Generate tokens (no default band membership)
    const { accessToken, refreshToken } = await this.generateTokens(user.id)

    // Send verification email (skip if auto-verified)
    if (!SKIP_EMAIL_VERIFICATION) {
      await emailService.sendVerificationEmail(user.id, user.email, user.name)
    }

    // Notify admin of new registration
    await emailService.sendNewUserRegistrationNotification({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
    })

    // Process pending invites for this email
    const bandsInvited = await this.processPendingInvites(user.id, normalizedEmail, inviteToken)

    // Track registration event
    await analyticsService.trackEvent('user_registered', {
      userId: user.id,
    })

    return {
      user,
      accessToken,
      refreshToken,
      bandsInvited, // Return info about bands user was invited to
    }
  },

  /**
   * Process pending invites after user registration
   * Creates Member records and deletes PendingInvite records
   */
  async processPendingInvites(userId: string, email: string, inviteToken?: string) {
    const bandsInvited: Array<{ id: string; name: string; slug: string; description: string | null }> = []

    const cutoff = pendingInviteExpiresAfterCutoff()

    // Find pending invites for this email: not invalidated, and not older than grace window
    const pendingInvites = await prisma.pendingInvite.findMany({
      where: {
        email,
        invalidatedAt: null,
        expiresAt: { gt: cutoff },
      },
      include: {
        band: {
          select: { id: true, name: true, slug: true, description: true },
        },
      },
    })

    // If inviteToken provided, merge that invite (e.g. URL token survives longer than strict expiry)
    if (inviteToken) {
      const tokenInvite = await prisma.pendingInvite.findUnique({
        where: { token: inviteToken },
        include: {
          band: {
            select: { id: true, name: true, slug: true, description: true },
          },
        },
      })

      if (
        tokenInvite &&
        isPendingInviteAttachable(tokenInvite) &&
        tokenInvite.email === email
      ) {
        const alreadyIncluded = pendingInvites.some(pi => pi.id === tokenInvite.id)
        if (!alreadyIncluded) {
          pendingInvites.push(tokenInvite)
        }
      }
    }

    // Process each pending invite
    for (const invite of pendingInvites) {
      try {
        // Check if user is already a member (shouldn't happen, but safety check)
        const existingMember = await prisma.member.findUnique({
          where: {
            userId_bandId: {
              userId,
              bandId: invite.bandId,
            },
          },
        })

        if (!existingMember) {
          // Create member record as INVITED so user can review band details first
          await prisma.member.create({
            data: {
              userId,
              bandId: invite.bandId,
              role: invite.role,
              status: 'INVITED',
              invitedBy: invite.invitedById,
              notes: invite.notes,
            },
          })

          bandsInvited.push({
            id: invite.band.id,
            name: invite.band.name,
            slug: invite.band.slug,
            description: invite.band.description,
          })
        }

        // Delete the pending invite
        await prisma.pendingInvite.delete({
          where: { id: invite.id },
        })
      } catch (error) {
        console.error(`Failed to process pending invite ${invite.id}:`, error)
        // Continue processing other invites
      }
    }

    return bandsInvited
  },

  /**
   * Login user
   */
  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim()

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      })
    }

    // Check if user account has been deleted
    if (user.deletedAt) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      })
    }

    // Check if user is banned
    if (user.bannedAt) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Your account has been banned. Reason: ${user.banReason || 'Violation of community guidelines'}`,
      })
    }

    // Check if user is suspended
    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      const suspendedUntilStr = user.suspendedUntil.toLocaleDateString()
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Your account is suspended until ${suspendedUntilStr}. Please try again later.`,
      })
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id)

    // Attach any pending invites (same email + grace window) — fixes users who registered without token
    const bandsInvited = await this.processPendingInvites(user.id, user.email)

    // Track sign-in event
    await analyticsService.trackEvent('user_signed_in', {
      userId: user.id,
    })

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
        accessApproved: user.accessApproved,
        isAdmin: user.isAdmin,
      },
      accessToken,
      refreshToken,
      bandsInvited,
    }
  },

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(userId: string) {
    // Generate access token (short-lived)
    const accessToken = jwt.sign({ userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    })

    // Generate refresh token (long-lived) with timestamp to ensure uniqueness
    const refreshToken = jwt.sign({ userId, timestamp: Date.now() }, JWT_SECRET, {
      expiresIn: '30d',
    })

    // Delete old sessions for this user
    await prisma.session.deleteMany({
      where: { userId },
    })

    // Save new refresh token to database
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN)
    await prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt,
      },
    })

    return { accessToken, refreshToken }
  },

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
      return decoded
    } catch (error) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      })
    }
  },

  /**
   * Add new user to the default band (BAND IT Doings) as CONDUCTOR
   * This runs silently - if the band doesn't exist, it just skips
   */
  async addToPracticeBand(userId: string) {
    const PRACTICE_BAND_SLUG = 'band-it-doings'

    try {
      // Find the practice band
      const practiceBand = await prisma.band.findUnique({
        where: { slug: PRACTICE_BAND_SLUG },
        select: { id: true },
      })

      if (!practiceBand) {
        console.log(`Practice band "${PRACTICE_BAND_SLUG}" not found, skipping`)
        return
      }

      // Check if user is already a member (shouldn't happen on registration, but safety check)
      const existingMember = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId,
            bandId: practiceBand.id,
          },
        },
      })

      if (existingMember) {
        console.log(`User ${userId} is already a member of practice band`)
        return
      }

      // Add user to practice band as CONDUCTOR with ACTIVE status
      await prisma.member.create({
        data: {
          userId,
          bandId: practiceBand.id,
          role: 'CONDUCTOR',
          status: 'ACTIVE',
        },
      })

      console.log(`Added user ${userId} to practice band as CONDUCTOR`)
    } catch (error) {
      // Log but don't fail registration if this fails
      console.error('Failed to add user to practice band:', error)
    }
  },
}