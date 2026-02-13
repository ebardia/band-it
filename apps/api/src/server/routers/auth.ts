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

      // Get all bands where user is a member (to reassign content to founders)
      const userMemberships = await prisma.member.findMany({
        where: { userId: input.userId, status: 'ACTIVE' },
        include: {
          band: {
            include: {
              members: {
                where: { role: 'FOUNDER', status: 'ACTIVE' },
                take: 1,
              },
            },
          },
        },
      })

      // Build a map of bandId -> founderId for reassignment
      const bandFounderMap = new Map<string, string>()
      for (const membership of userMemberships) {
        const founder = membership.band.members[0]
        if (founder && founder.userId !== input.userId) {
          bandFounderMap.set(membership.bandId, founder.userId)
        }
      }

      // Soft delete user and clean up related records
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

        // Reassign messages to band founder instead of deleting
        // (Messages are tied to channels which are tied to bands)
        for (const [bandId, founderId] of bandFounderMap) {
          await tx.message.updateMany({
            where: {
              authorId: userId,
              channel: { bandId },
            },
            data: { authorId: founderId },
          })
        }
        // Delete any remaining messages not in a band we have a founder for
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

        // KEEP blocked terms - they are valuable moderation data
        // BlockedTerms created by this user remain in the system

        // KEEP financial records for audit trail
        // BandMemberBilling and ManualPayment records are preserved
        // Nullify optional user references on manual payments
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

        // Nullify optional user references on tasks (assigneeId and verifiedById are optional)
        await tx.task.updateMany({
          where: { assigneeId: userId },
          data: { assigneeId: null },
        })
        await tx.task.updateMany({
          where: { verifiedById: userId },
          data: { verifiedById: null },
        })

        // REASSIGN band content to founder instead of deleting
        // Tasks
        for (const [bandId, founderId] of bandFounderMap) {
          await tx.task.updateMany({
            where: { createdById: userId, bandId },
            data: { createdById: founderId },
          })
        }
        await tx.task.deleteMany({ where: { createdById: userId } }) // Delete any without a band

        // Nullify optional user references on projects (leadId is optional)
        await tx.project.updateMany({
          where: { leadId: userId },
          data: { leadId: null },
        })

        // Projects
        for (const [bandId, founderId] of bandFounderMap) {
          await tx.project.updateMany({
            where: { createdById: userId, bandId },
            data: { createdById: founderId },
          })
        }
        await tx.project.deleteMany({ where: { createdById: userId } })

        // Proposals
        for (const [bandId, founderId] of bandFounderMap) {
          await tx.proposal.updateMany({
            where: { createdById: userId, bandId },
            data: { createdById: founderId },
          })
        }
        await tx.proposal.deleteMany({ where: { createdById: userId } })

        // Events
        for (const [bandId, founderId] of bandFounderMap) {
          await tx.event.updateMany({
            where: { createdById: userId, bandId },
            data: { createdById: founderId },
          })
        }
        await tx.event.deleteMany({ where: { createdById: userId } })

        // Delete feedback votes by user
        await tx.feedbackVote.deleteMany({ where: { userId } })

        // Delete feedback submitted by user
        await tx.feedback.deleteMany({ where: { submittedById: userId } })

        // Post responses - reassign to founder
        for (const [bandId, founderId] of bandFounderMap) {
          await tx.postResponse.updateMany({
            where: {
              authorId: userId,
              post: { bandId },
            },
            data: { authorId: founderId },
          })
        }
        await tx.postResponse.deleteMany({ where: { authorId: userId } })

        // Posts - reassign to founder
        for (const [bandId, founderId] of bandFounderMap) {
          await tx.post.updateMany({
            where: { authorId: userId, bandId },
            data: { authorId: founderId },
          })
        }
        await tx.post.deleteMany({ where: { authorId: userId } })

        // Post categories - reassign to founder
        for (const [bandId, founderId] of bandFounderMap) {
          await tx.postCategory.updateMany({
            where: { createdById: userId, bandId },
            data: { createdById: founderId },
          })
        }
        await tx.postCategory.deleteMany({ where: { createdById: userId } })

        // Channels - reassign to founder
        for (const [bandId, founderId] of bandFounderMap) {
          await tx.channel.updateMany({
            where: { createdById: userId, bandId },
            data: { createdById: founderId },
          })
        }
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

        // KEEP files - they may be attached to financial records or other important data
        // Files uploaded by this user remain in the system

        // Delete notifications and preferences
        await tx.notification.deleteMany({ where: { userId } })
        await tx.notificationPreference.deleteMany({ where: { userId } })

        // Delete memberships
        await tx.member.deleteMany({ where: { userId } })

        // Delete sessions
        await tx.session.deleteMany({ where: { userId } })

        // Soft delete the user: clear PII but keep id and name for audit trail
        // Email is set to a unique placeholder to allow re-registration
        await tx.user.update({
          where: { id: userId },
          data: {
            deletedAt: new Date(),
            email: `deleted_${userId}@deleted.local`,
            password: '',
            zipcode: null,
            strengths: [],
            weaknesses: [],
            passions: [],
            developmentPath: [],
            emailVerified: false,
            emailVerifiedAt: null,
            verificationToken: null,
            passwordResetToken: null,
            passwordResetExpires: null,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            subscriptionStatus: 'INCOMPLETE',
            subscriptionStartedAt: null,
            profileCompleted: false,
            guidelinesAcceptedAt: null,
            guidelinesVersion: null,
            tosAcceptedAt: null,
            tosVersion: null,
            isAdmin: false,
            warningCount: 0,
            suspendedUntil: null,
            suspensionReason: null,
            bannedAt: null,
            banReason: null,
            emailNotificationFrequency: 'DAILY',
            digestFrequency: 'DAILY',
            digestWeeklyDay: null,
            digestLastSentAt: null,
          },
        })
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