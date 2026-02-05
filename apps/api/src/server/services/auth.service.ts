import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { TRPCError } from '@trpc/server'
import { emailService } from './email.service'

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d' // Access token expires in 7 days (for development - implement refresh in production)
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

// Feature flags for testing/development
const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true'
const SKIP_PAYMENT_CHECK = process.env.SKIP_PAYMENT_CHECK === 'true'

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
      },
    })

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id)

    // Send verification email (skip if auto-verified)
    if (!SKIP_EMAIL_VERIFICATION) {
      await emailService.sendVerificationEmail(user.id, user.email, user.name)
    }

    // Process pending invites for this email
    const bandsInvited = await this.processPendingInvites(user.id, normalizedEmail, inviteToken)

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

    // Find all pending invites for this email
    const pendingInvites = await prisma.pendingInvite.findMany({
      where: {
        email,
        expiresAt: { gt: new Date() }, // Only non-expired
      },
      include: {
        band: {
          select: { id: true, name: true, slug: true, description: true },
        },
      },
    })

    // If inviteToken provided, prioritize that specific invite
    if (inviteToken) {
      const tokenInvite = await prisma.pendingInvite.findUnique({
        where: { token: inviteToken },
        include: {
          band: {
            select: { id: true, name: true, slug: true, description: true },
          },
        },
      })

      // Add to list if valid and not already in pendingInvites
      if (tokenInvite && tokenInvite.expiresAt > new Date()) {
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
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
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

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
      },
      accessToken,
      refreshToken,
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
}