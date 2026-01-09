import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { TRPCError } from '@trpc/server'

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '15m' // Access token expires in 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

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

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id)

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

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign({ userId }, JWT_SECRET, {
      expiresIn: '30d',
    })

    // Save refresh token to database
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