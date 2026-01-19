import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { authService } from '../services/auth.service'
import { emailService } from '../services/email.service'
import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'

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
        inviteToken: z.string().optional(), // Optional token from band invite email
      })
    )
    .mutation(async ({ input }) => {
      const result = await authService.register(
        input.email,
        input.password,
        input.name,
        input.inviteToken
      )

      return {
        success: true,
        message: 'Account created successfully',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        bandsJoined: result.bandsJoined, // Return info about auto-joined bands
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
   * Get user profile
   */
  getProfile: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          email: true,
          name: true,
          zipcode: true,
          strengths: true,
          weaknesses: true,
          passions: true,
          developmentPath: true,
          emailVerified: true,
          subscriptionStatus: true,
          createdAt: true,
        },
      })

      if (!user) {
        throw new Error('User not found')
      }

      return {
        success: true,
        user,
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
   * Request password reset
   */
  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true, email: true, name: true },
      })

      // Always return success to prevent email enumeration
      if (!user) {
        return {
          success: true,
          message: 'If an account exists with this email, you will receive a password reset link.',
        }
      }

      // Generate reset token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

      // Save token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpires: expires,
        },
      })

      // Send email
      await emailService.sendPasswordResetEmail(user.email, user.name, token)

      return {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      }
    }),

  /**
   * Reset password with token
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z
          .string()
          .min(8, 'Password must be at least 8 characters')
          .max(100, 'Password must be less than 100 characters'),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { passwordResetToken: input.token },
      })

      if (!user) {
        throw new Error('Invalid or expired reset link')
      }

      if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        throw new Error('Reset link has expired. Please request a new one.')
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10)

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      })

      return {
        success: true,
        message: 'Password reset successfully. You can now sign in with your new password.',
      }
    }),

  /**
   * Change password
   */
  changePassword: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z
          .string()
          .min(8, 'Password must be at least 8 characters')
          .max(100, 'Password must be less than 100 characters'),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(input.currentPassword, user.password)

      if (!isValidPassword) {
        throw new Error('Current password is incorrect')
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10)

      // Update password
      await prisma.user.update({
        where: { id: input.userId },
        data: { password: hashedPassword },
      })

      return {
        success: true,
        message: 'Password changed successfully',
      }
    }),

  /**
   * Delete account
   */
  deleteAccount: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        password: z.string().min(1, 'Password is required'),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(input.password, user.password)

      if (!isValidPassword) {
        throw new Error('Password is incorrect')
      }

      // Delete user (cascade will delete sessions, memberships, etc.)
      await prisma.user.delete({
        where: { id: input.userId },
      })

      return {
        success: true,
        message: 'Account deleted successfully',
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