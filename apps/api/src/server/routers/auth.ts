import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { authService } from '../services/auth.service'
import { emailService } from '../services/email.service'
import { prisma } from '../../lib/prisma'

export const authRouter = router({
  /**
   * Register new user
   */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
        password: z
          .string()
          .min(8, 'Password must be at least 8 characters')
          .max(100, 'Password must be less than 100 characters'),
        name: z
          .string()
          .min(2, 'Name must be at least 2 characters')
          .max(100, 'Name must be less than 100 characters'),
      })
    )
    .mutation(async ({ input }) => {
      const result = await authService.register(
        input.email,
        input.password,
        input.name
      )

      return {
        success: true,
        message: 'Account created successfully',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }
    }),

  /**
   * Verify email with token
   */
  verifyEmail: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await emailService.verifyEmail(input.token)

      if (!result.success) {
        throw new Error(result.message || 'Verification failed')
      }

      return {
        success: true,
        message: 'Email verified successfully',
        userId: result.userId,
      }
    }),

  /**
   * Resend verification email
   */
  resendVerification: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          email: true,
          name: true,
          emailVerified: true,
        },
      })

      if (!user) {
        throw new Error('User not found')
      }

      if (user.emailVerified) {
        throw new Error('Email already verified')
      }

      await emailService.sendVerificationEmail(input.userId, user.email, user.name)

      return {
        success: true,
        message: 'Verification email sent',
      }
    }),

  /**
   * Login user
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required'),
      })
    )
    .mutation(async ({ input }) => {
      const result = await authService.login(input.email, input.password)

      return {
        success: true,
        message: 'Logged in successfully',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }
    }),

  /**
   * Update user profile
   */
  updateProfile: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        zipcode: z.string().length(5, 'Zipcode must be 5 digits'),
        strengths: z.string().min(1, 'Please enter at least one strength'),
        weaknesses: z.string().min(1, 'Please enter at least one area for improvement'),
        passions: z.string().min(1, 'Please enter at least one passion'),
        developmentPath: z.string().min(1, 'Please enter at least one learning goal'),
      })
    )
    .mutation(async ({ input }) => {
      // Convert comma-separated strings to arrays
      const strengthsArray = input.strengths.split(',').map(s => s.trim()).filter(Boolean)
      const weaknessesArray = input.weaknesses.split(',').map(s => s.trim()).filter(Boolean)
      const passionsArray = input.passions.split(',').map(s => s.trim()).filter(Boolean)
      const developmentPathArray = input.developmentPath.split(',').map(s => s.trim()).filter(Boolean)

      // Update user in database
      const user = await prisma.user.update({
        where: { id: input.userId },
        data: {
          zipcode: input.zipcode,
          strengths: strengthsArray,
          weaknesses: weaknessesArray,
          passions: passionsArray,
          developmentPath: developmentPathArray,
        },
        select: {
          id: true,
          email: true,
          name: true,
          zipcode: true,
          strengths: true,
          weaknesses: true,
          passions: true,
          developmentPath: true,
          profileCompleted: true,
        },
      })

      return {
        success: true,
        message: 'Profile updated successfully',
        user,
      }
    }),

  /**
   * Get current user (requires authentication)
   */
  me: publicProcedure.query(async () => {
    // TODO: Add authentication middleware
    return {
      message: 'This will return current user after adding auth middleware',
    }
  }),
})