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
   */
  async register(email: string, password: string, name: string) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User with this email already exists',
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with optional auto-verification and subscription activation
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        // Auto-verify email if SKIP_EMAIL_VERIFICATION is enabled
        emailVerified: SKIP_EMAIL_VERIFICATION,
        emailVerifiedAt: SKIP_EMAIL_VERIFICATION ? new Date() : null,
        // Auto-activate subscription if SKIP_PAYMENT_CHECK is enabled
        subscriptionStatus: SKIP_PAYMENT_CHECK ? 'ACTIVE' : 'INCOMPLETE',
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

    return {
      user,
      accessToken,
      refreshToken,
    }
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