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
        guidelinesVersion: z.number().int().positive(), // Required: version of community guidelines accepted
        tosVersion: z.number().int().positive(), // Required: version of ToS/Privacy Policy accepted
      })
    )
    .mutation(async ({ input }) => {
      const result = await authService.register(
        input.email,
        input.password,
        input.name,
        input.inviteToken,
        input.guidelinesVersion,
        input.tosVersion
      )

      return {
        success: true,
        message: 'Account created successfully',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        bandsInvited: result.bandsInvited, // Return info about bands user was invited to
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
          isAdmin: true,
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

      // Check if user created any active (non-dissolved) bands
      const activeBandsCreated = await prisma.band.findMany({
        where: {
          createdById: input.userId,
          dissolvedAt: null,
        },
        select: { id: true, name: true, slug: true },
      })

      if (activeBandsCreated.length > 0) {
        const bandNames = activeBandsCreated.map(b => b.name).join(', ')
        throw new Error(
          `Cannot delete account. You are the creator of active band(s): ${bandNames}. ` +
          `Please transfer ownership or dissolve these bands first.`
        )
      }

      // Delete all related records in correct order to avoid FK constraints
      await prisma.$transaction(async (tx) => {
        const userId = input.userId

        // Delete help interactions
        await tx.helpInteraction.deleteMany({ where: { userId } })

        // Delete proposal review history
        await tx.proposalReviewHistory.deleteMany({ where: { reviewerId: userId } })

        // Nullify proposal reviewer references
        await tx.proposal.updateMany({
          where: { reviewedById: userId },
          data: { reviewedById: null },
        })

        // Delete message reactions
        await tx.messageReaction.deleteMany({ where: { userId } })

        // Delete message mentions
        await tx.messageMention.deleteMany({ where: { userId } })

        // Delete message edits
        await tx.messageEdit.deleteMany({ where: { editedById: userId } })

        // Delete channel read statuses
        await tx.channelReadStatus.deleteMany({ where: { userId } })

        // Delete messages authored (this will cascade to edits, mentions, reactions on those messages)
        await tx.message.deleteMany({ where: { authorId: userId } })

        // Delete comments authored
        await tx.comment.deleteMany({ where: { authorId: userId } })

        // Delete reactions given
        await tx.reaction.deleteMany({ where: { userId } })

        // Delete mentions received
        await tx.mention.deleteMany({ where: { userId } })

        // Nullify checklist items completed/assigned references (both are optional fields)
        await tx.checklistItem.updateMany({
          where: { completedById: userId },
          data: { completedById: null },
        })
        await tx.checklistItem.updateMany({
          where: { assigneeId: userId },
          data: { assigneeId: null },
        })

        // Delete votes (has onDelete: Cascade on User relation)
        await tx.vote.deleteMany({ where: { userId } })

        // Delete event RSVPs
        await tx.eventRSVP.deleteMany({ where: { userId } })

        // Delete event attendances for this user
        await tx.eventAttendance.deleteMany({ where: { userId } })
        // markedById is required, so delete attendances marked by this user
        await tx.eventAttendance.deleteMany({ where: { markedById: userId } })

        // Delete warnings received/issued
        await tx.warning.deleteMany({ where: { userId } })
        await tx.warning.deleteMany({ where: { issuedById: userId } })

        // Nullify flagged content reviewer references (optional fields)
        await tx.flaggedContent.updateMany({
          where: { reviewedById: userId },
          data: { reviewedById: null },
        })
        await tx.flaggedContent.updateMany({
          where: { appealReviewedById: userId },
          data: { appealReviewedById: null },
        })

        // Delete flagged content authored
        await tx.flaggedContent.deleteMany({ where: { authorId: userId } })

        // Delete blocked terms created by user
        await tx.blockedTerm.deleteMany({ where: { createdById: userId } })

        // Delete band member billings
        await tx.bandMemberBilling.deleteMany({ where: { memberUserId: userId } })

        // Delete manual payments where user is the member
        await tx.manualPayment.deleteMany({ where: { memberUserId: userId } })
        // Nullify optional user references on remaining manual payments
        await tx.manualPayment.updateMany({
          where: { confirmedById: userId },
          data: { confirmedById: null },
        })
        await tx.manualPayment.updateMany({
          where: { disputedById: userId },
          data: { disputedById: null },
        })
        await tx.manualPayment.updateMany({
          where: { resolvedById: userId },
          data: { resolvedById: null },
        })
        // initiatedById is required, so delete any remaining payments initiated by user
        await tx.manualPayment.deleteMany({ where: { initiatedById: userId } })

        // Nullify optional user references on tasks (assigneeId and verifiedById are optional)
        await tx.task.updateMany({
          where: { assigneeId: userId },
          data: { assigneeId: null },
        })
        await tx.task.updateMany({
          where: { verifiedById: userId },
          data: { verifiedById: null },
        })
        // createdById is required, so delete tasks created by user
        await tx.task.deleteMany({ where: { createdById: userId } })

        // Nullify optional user references on projects (leadId is optional)
        await tx.project.updateMany({
          where: { leadId: userId },
          data: { leadId: null },
        })
        // createdById is required, so delete projects created by user
        await tx.project.deleteMany({ where: { createdById: userId } })

        // createdById is required on proposals, so delete proposals created by user
        await tx.proposal.deleteMany({ where: { createdById: userId } })

        // createdById is required on events, so delete events created by user
        await tx.event.deleteMany({ where: { createdById: userId } })

        // createdById is required on channels, so delete channels created by user
        await tx.channel.deleteMany({ where: { createdById: userId } })

        // Delete pending invites created by user (invitedById is required)
        await tx.pendingInvite.deleteMany({ where: { invitedById: userId } })

        // Handle bands - nullify billing owner and dissolver (both optional)
        await tx.band.updateMany({
          where: { billingOwnerId: userId },
          data: { billingOwnerId: null },
        })
        await tx.band.updateMany({
          where: { dissolvedById: userId },
          data: { dissolvedById: null },
        })

        // Delete dissolved bands created by user (active bands are blocked above)
        await tx.band.deleteMany({
          where: {
            createdById: userId,
            dissolvedAt: { not: null },
          },
        })

        // Delete files uploaded
        await tx.file.deleteMany({ where: { uploadedById: userId } })

        // Delete notifications and preferences
        await tx.notification.deleteMany({ where: { userId } })
        await tx.notificationPreference.deleteMany({ where: { userId } })

        // Delete memberships
        await tx.member.deleteMany({ where: { userId } })

        // Delete sessions
        await tx.session.deleteMany({ where: { userId } })

        // Finally delete the user
        await tx.user.delete({ where: { id: userId } })
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

  /**
   * Get user's own warnings
   */
  getMyWarnings: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const warnings = await prisma.warning.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reason: true,
          acknowledged: true,
          acknowledgedAt: true,
          createdAt: true,
        },
      })

      return { warnings }
    }),

  /**
   * Acknowledge a warning
   */
  acknowledgeWarning: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        warningId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify warning belongs to user
      const warning = await prisma.warning.findFirst({
        where: {
          id: input.warningId,
          userId: input.userId,
        },
      })

      if (!warning) {
        throw new Error('Warning not found')
      }

      const updated = await prisma.warning.update({
        where: { id: input.warningId },
        data: {
          acknowledged: true,
          acknowledgedAt: new Date(),
        },
      })

      return { warning: updated }
    }),

  /**
   * Acknowledge all warnings
   */
  acknowledgeAllWarnings: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await prisma.warning.updateMany({
        where: {
          userId: input.userId,
          acknowledged: false,
        },
        data: {
          acknowledged: true,
          acknowledgedAt: new Date(),
        },
      })

      return { success: true }
    }),
})