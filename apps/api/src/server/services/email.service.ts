import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { prisma } from '../../lib/prisma'

// For development: Log emails to console
// For production: Use Resend
const isDevelopment = process.env.NODE_ENV !== 'production'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'Band IT <noreply@band-it.com>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// Initialize Resend if API key is available
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

// Create nodemailer transporter as fallback for development
let transporter: nodemailer.Transporter

if (isDevelopment) {
  // In development, just log to console
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'test@test.com',
      pass: 'test',
    },
  })
} else if (!RESEND_API_KEY) {
  // Fallback to nodemailer SMTP if no Resend key
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export const emailService = {
  /**
   * Send email using Resend (production) or nodemailer fallback
   */
  async sendEmail(options: { to: string; subject: string; html: string }) {
    const { to, subject, html } = options

    // In development, just log and return
    if (isDevelopment) {
      console.log('\n=================================')
      console.log(`📧 EMAIL TO: ${to}`)
      console.log(`📧 SUBJECT: ${subject}`)
      console.log('=================================\n')
      return { success: true }
    }

    // Try Resend first in production
    if (resend) {
      try {
        console.log(`[Email] Sending to: ${to}, subject: ${subject.substring(0, 50)}...`)
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to,
          subject,
          html,
        })
        console.log(`[Email] Resend response for ${to}:`, JSON.stringify(result))

        // Check for error in response (rate limiting returns error in data, not exception)
        if (result.error) {
          console.error(`[Email] Resend error for ${to}:`, result.error)
          return { success: false, error: result.error }
        }

        return { success: true }
      } catch (error) {
        console.error(`[Email] Resend error for ${to}:`, error)
        return { success: false, error }
      }
    }

    // Fallback to nodemailer
    try {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      })
      return { success: true }
    } catch (error) {
      console.error('Nodemailer error:', error)
      return { success: false, error }
    }
  },

  /**
   * Send email verification link
   */
  async sendVerificationEmail(userId: string, email: string, name: string) {
    // Generate verification token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    // Save token to database
    await prisma.user.update({
      where: { id: userId },
      data: { verificationToken: token },
    })

    // Create verification link
    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Welcome to Band IT, ${name}!</h1>
        <p style="font-size: 16px; color: #374151;">
          Thank you for registering. Please verify your email address to continue.
        </p>
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}"
             style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p style="font-size: 14px; color: #6B7280;">
          Or copy and paste this link into your browser:<br>
          <a href="${verificationUrl}" style="color: #3B82F6;">${verificationUrl}</a>
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `

    // In development, just log the link
    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 EMAIL VERIFICATION LINK:')
      console.log(verificationUrl)
      console.log('=================================\n')
      return { success: true, verificationUrl }
    }

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Band IT Email',
      html,
    })
  },

  /**
   * Send band invite email to external user (not registered)
   */
  async sendBandInviteEmail(options: {
    email: string
    bandName: string
    inviterName: string
    inviteToken: string
    notes?: string
  }) {
    const { email, bandName, inviterName, inviteToken, notes } = options

    // Create registration link with invite token
    const registerUrl = `${FRONTEND_URL}/register?invite=${inviteToken}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">You're Invited to Join "${bandName}"!</h1>
        <p style="font-size: 16px; color: #374151;">
          ${inviterName} has invited you to join their band on Band IT.
        </p>
        ${notes ? `
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 14px; color: #374151; margin: 0;">
              <strong>Message from ${inviterName}:</strong><br>
              ${notes}
            </p>
          </div>
        ` : ''}
        <p style="font-size: 16px; color: #374151;">
          Band IT is a platform for bands to collaborate on projects, vote on proposals, and manage tasks together.
        </p>
        <div style="margin: 30px 0;">
          <a href="${registerUrl}"
             style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Create Account & Join Band
          </a>
        </div>
        <p style="font-size: 14px; color: #6B7280;">
          Or copy and paste this link into your browser:<br>
          <a href="${registerUrl}" style="color: #3B82F6;">${registerUrl}</a>
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `

    // In development, just log the link
    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 BAND INVITE EMAIL:')
      console.log(`To: ${email}`)
      console.log(`Band: ${bandName}`)
      console.log(`Register URL: ${registerUrl}`)
      console.log('=================================\n')
      return { success: true, registerUrl }
    }

    return this.sendEmail({
      to: email,
      subject: `You're invited to join "${bandName}" on Band IT`,
      html,
    })
  },

  /**
   * Send notification to existing user about band invite
   */
  async sendExistingUserInviteEmail(options: {
    email: string
    userName: string
    bandName: string
    inviterName: string
    notes?: string
  }) {
    const { email, userName, bandName, inviterName, notes } = options

    const invitationsUrl = `${FRONTEND_URL}/invitations`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">You're Invited to Join "${bandName}"!</h1>
        <p style="font-size: 16px; color: #374151;">
          Hi ${userName}, ${inviterName} has invited you to join their band on Band IT.
        </p>
        ${notes ? `
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 14px; color: #374151; margin: 0;">
              <strong>Message from ${inviterName}:</strong><br>
              ${notes}
            </p>
          </div>
        ` : ''}
        <div style="margin: 30px 0;">
          <a href="${invitationsUrl}"
             style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            View Invitation
          </a>
        </div>
        <p style="font-size: 14px; color: #6B7280;">
          Or copy and paste this link into your browser:<br>
          <a href="${invitationsUrl}" style="color: #3B82F6;">${invitationsUrl}</a>
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          You received this email because someone invited you to their band on Band IT.
        </p>
      </div>
    `

    // In development, just log the link
    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 EXISTING USER INVITE EMAIL:')
      console.log(`To: ${email}`)
      console.log(`Band: ${bandName}`)
      console.log(`Invitations URL: ${invitationsUrl}`)
      console.log('=================================\n')
      return { success: true, invitationsUrl }
    }

    return this.sendEmail({
      to: email,
      subject: `You're invited to join "${bandName}" on Band IT`,
      html,
    })
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, name: string, token: string) {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Reset Your Password</h1>
        <p style="font-size: 16px; color: #374151;">
          Hi ${name}, we received a request to reset your password for your Band IT account.
        </p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 14px; color: #6B7280;">
          Or copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #3B82F6;">${resetUrl}</a>
        </p>
        <p style="font-size: 14px; color: #EF4444; margin-top: 20px;">
          This link will expire in 1 hour.
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
      </div>
    `

    // In development, just log the link
    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 PASSWORD RESET LINK:')
      console.log(resetUrl)
      console.log('=================================\n')
      return { success: true, resetUrl }
    }

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Band IT Password',
      html,
    })
  },

  /**
   * Verify email token
   */
  async verifyEmail(token: string) {
    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    })

    if (!user) {
      return { success: false, message: 'Invalid or expired token' }
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationToken: null, // Clear token
      },
    })

    return { success: true, userId: user.id, email: user.email }
  },

  /**
   * Send warning notification email
   */
  async sendWarningEmail(options: {
    email: string
    userName: string
    reason: string
    warningCount: number
  }) {
    const { email, userName, reason, warningCount } = options
    const guidelinesUrl = `${FRONTEND_URL}/community-guidelines`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #F59E0B;">Account Warning</h1>
        <p style="font-size: 16px; color: #374151;">
          Hi ${userName}, your account has received a warning from the Band IT moderation team.
        </p>
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
          <p style="font-size: 14px; color: #92400E; margin: 0;">
            <strong>Reason:</strong><br>
            ${reason}
          </p>
        </div>
        <p style="font-size: 14px; color: #374151;">
          This is warning #${warningCount} on your account. Continued violations may result in suspension or permanent ban.
        </p>
        <p style="font-size: 14px; color: #374151;">
          Please review our <a href="${guidelinesUrl}" style="color: #3B82F6;">Community Guidelines</a> to ensure your future activity complies with our policies.
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          If you believe this warning was issued in error, please contact our support team.
        </p>
      </div>
    `

    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 WARNING EMAIL:')
      console.log(`To: ${email}`)
      console.log(`Reason: ${reason}`)
      console.log(`Warning #${warningCount}`)
      console.log('=================================\n')
      return { success: true }
    }

    return this.sendEmail({
      to: email,
      subject: 'Warning: Your Band IT Account',
      html,
    })
  },

  /**
   * Send suspension notification email
   */
  async sendSuspensionEmail(options: {
    email: string
    userName: string
    reason: string
    suspendedUntil: Date
  }) {
    const { email, userName, reason, suspendedUntil } = options
    const guidelinesUrl = `${FRONTEND_URL}/community-guidelines`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #EF4444;">Account Suspended</h1>
        <p style="font-size: 16px; color: #374151;">
          Hi ${userName}, your Band IT account has been temporarily suspended.
        </p>
        <div style="background-color: #FEE2E2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
          <p style="font-size: 14px; color: #991B1B; margin: 0;">
            <strong>Reason:</strong><br>
            ${reason}
          </p>
        </div>
        <p style="font-size: 16px; color: #374151;">
          <strong>Suspension ends:</strong> ${suspendedUntil.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p style="font-size: 14px; color: #374151;">
          During this time, you will not be able to log in to your account. After the suspension ends, please review our <a href="${guidelinesUrl}" style="color: #3B82F6;">Community Guidelines</a> to ensure your future activity complies with our policies.
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          If you believe this suspension was issued in error, please contact our support team.
        </p>
      </div>
    `

    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 SUSPENSION EMAIL:')
      console.log(`To: ${email}`)
      console.log(`Reason: ${reason}`)
      console.log(`Suspended until: ${suspendedUntil.toLocaleDateString()}`)
      console.log('=================================\n')
      return { success: true }
    }

    return this.sendEmail({
      to: email,
      subject: 'Your Band IT Account Has Been Suspended',
      html,
    })
  },

  /**
   * Send ban notification email
   */
  async sendBanEmail(options: {
    email: string
    userName: string
    reason: string
  }) {
    const { email, userName, reason } = options

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #DC2626;">Account Permanently Banned</h1>
        <p style="font-size: 16px; color: #374151;">
          Hi ${userName}, your Band IT account has been permanently banned due to serious violations of our community guidelines.
        </p>
        <div style="background-color: #FEE2E2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626;">
          <p style="font-size: 14px; color: #991B1B; margin: 0;">
            <strong>Reason:</strong><br>
            ${reason}
          </p>
        </div>
        <p style="font-size: 14px; color: #374151;">
          This decision is final. You will no longer be able to access your account or any associated bands, proposals, or projects.
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          If you believe this ban was issued in error, you may contact our support team for review.
        </p>
      </div>
    `

    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 BAN EMAIL:')
      console.log(`To: ${email}`)
      console.log(`Reason: ${reason}`)
      console.log('=================================\n')
      return { success: true }
    }

    return this.sendEmail({
      to: email,
      subject: 'Your Band IT Account Has Been Permanently Banned',
      html,
    })
  },

  /**
   * Send band dissolved notification email
   */
  async sendBandDissolvedEmail(options: {
    email: string
    userName: string
    bandName: string
    reason?: string
  }) {
    const { email, userName, bandName, reason } = options
    const bandsUrl = `${FRONTEND_URL}/bands`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6B7280;">"${bandName}" Has Been Dissolved</h1>
        <p style="font-size: 16px; color: #374151;">
          Hi ${userName}, the band "${bandName}" has been dissolved by its founder.
        </p>
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 14px; color: #374151; margin: 0;">
            Since the band never reached the minimum members needed to operate, the founder has chosen to close it.
          </p>
        </div>
        ${reason ? `
          <p style="font-size: 14px; color: #374151;">
            <strong>Reason provided:</strong> ${reason}
          </p>
        ` : ''}
        <p style="font-size: 14px; color: #374151;">
          You can discover and join other bands on Band IT.
        </p>
        <div style="margin: 30px 0;">
          <a href="${bandsUrl}"
             style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Browse Bands
          </a>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          If you have any questions, please contact the founder directly.
        </p>
      </div>
    `

    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 BAND DISSOLVED EMAIL:')
      console.log(`To: ${email}`)
      console.log(`Band: ${bandName}`)
      console.log(`Reason: ${reason || 'None provided'}`)
      console.log('=================================\n')
      return { success: true }
    }

    return this.sendEmail({
      to: email,
      subject: `"${bandName}" has been dissolved`,
      html,
    })
  },

  /**
   * Send manual payment recorded notification email
   */
  async sendManualPaymentRecordedEmail(options: {
    email: string
    userName: string
    bandName: string
    bandSlug: string
    amount: number
    payerName: string
    paymentMethod: string
    initiatorName: string
    isForMember: boolean // true if treasurer is notifying member, false if member is notifying treasurer
  }) {
    const { email, userName, bandName, bandSlug, amount, payerName, paymentMethod, initiatorName, isForMember } = options
    const billingUrl = `${FRONTEND_URL}/bands/${bandSlug}/billing?tab=manual`
    const formattedAmount = `$${(amount / 100).toFixed(2)}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Payment Recorded</h1>
        <p style="font-size: 16px; color: #374151;">
          Hi ${userName}, a manual payment has been recorded ${isForMember ? 'on your behalf' : 'by a member'} in ${bandName}.
        </p>
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 14px; color: #374151; margin: 0;">
            <strong>Amount:</strong> ${formattedAmount}<br>
            <strong>Payment Method:</strong> ${paymentMethod}<br>
            <strong>Payer:</strong> ${payerName}<br>
            <strong>Recorded by:</strong> ${initiatorName}
          </p>
        </div>
        <p style="font-size: 14px; color: #374151;">
          Please review and confirm this payment within 7 days. If you don't take action, the payment will be automatically confirmed.
        </p>
        <div style="margin: 30px 0;">
          <a href="${billingUrl}"
             style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Review Payment
          </a>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          You're receiving this because you are a member of ${bandName} on Band IT.
        </p>
      </div>
    `

    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 MANUAL PAYMENT RECORDED EMAIL:')
      console.log(`To: ${email}`)
      console.log(`Amount: ${formattedAmount}`)
      console.log(`Payer: ${payerName}`)
      console.log('=================================\n')
      return { success: true }
    }

    return this.sendEmail({
      to: email,
      subject: `Payment recorded in "${bandName}" - Action required`,
      html,
    })
  },

  /**
   * Send manual payment confirmed notification email
   */
  async sendManualPaymentConfirmedEmail(options: {
    email: string
    userName: string
    bandName: string
    bandSlug: string
    amount: number
    confirmerName: string
  }) {
    const { email, userName, bandName, bandSlug, amount, confirmerName } = options
    const billingUrl = `${FRONTEND_URL}/bands/${bandSlug}/billing?tab=manual`
    const formattedAmount = `$${(amount / 100).toFixed(2)}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10B981;">Payment Confirmed</h1>
        <p style="font-size: 16px; color: #374151;">
          Hi ${userName}, your recorded payment of ${formattedAmount} in ${bandName} has been confirmed by ${confirmerName}.
        </p>
        <div style="background-color: #D1FAE5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
          <p style="font-size: 14px; color: #065F46; margin: 0;">
            Your payment has been processed and your membership dues are now up to date.
          </p>
        </div>
        <div style="margin: 30px 0;">
          <a href="${billingUrl}"
             style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            View Billing
          </a>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          You're receiving this because you are a member of ${bandName} on Band IT.
        </p>
      </div>
    `

    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 MANUAL PAYMENT CONFIRMED EMAIL:')
      console.log(`To: ${email}`)
      console.log(`Amount: ${formattedAmount}`)
      console.log('=================================\n')
      return { success: true }
    }

    return this.sendEmail({
      to: email,
      subject: `Payment confirmed in "${bandName}"`,
      html,
    })
  },

  /**
   * Send manual payment disputed notification email
   */
  async sendManualPaymentDisputedEmail(options: {
    email: string
    userName: string
    bandName: string
    bandSlug: string
    amount: number
    disputerName: string
    reason: string
  }) {
    const { email, userName, bandName, bandSlug, amount, disputerName, reason } = options
    const billingUrl = `${FRONTEND_URL}/bands/${bandSlug}/billing?tab=manual`
    const formattedAmount = `$${(amount / 100).toFixed(2)}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #F59E0B;">Payment Disputed</h1>
        <p style="font-size: 16px; color: #374151;">
          Hi ${userName}, your recorded payment of ${formattedAmount} in ${bandName} has been disputed by ${disputerName}.
        </p>
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
          <p style="font-size: 14px; color: #92400E; margin: 0;">
            <strong>Reason:</strong><br>
            ${reason}
          </p>
        </div>
        <p style="font-size: 14px; color: #374151;">
          A band governor will review and resolve this dispute. You may be contacted for additional information.
        </p>
        <div style="margin: 30px 0;">
          <a href="${billingUrl}"
             style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            View Details
          </a>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          You're receiving this because you are a member of ${bandName} on Band IT.
        </p>
      </div>
    `

    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 MANUAL PAYMENT DISPUTED EMAIL:')
      console.log(`To: ${email}`)
      console.log(`Amount: ${formattedAmount}`)
      console.log(`Reason: ${reason}`)
      console.log('=================================\n')
      return { success: true }
    }

    return this.sendEmail({
      to: email,
      subject: `Payment disputed in "${bandName}"`,
      html,
    })
  },

  /**
   * Send manual payment disputed notification to governors
   */
  async sendManualPaymentDisputedToGovernorsEmail(options: {
    email: string
    governorName: string
    bandName: string
    bandSlug: string
    amount: number
    payerName: string
    disputerName: string
    reason: string
  }) {
    const { email, governorName, bandName, bandSlug, amount, payerName, disputerName, reason } = options
    const billingUrl = `${FRONTEND_URL}/bands/${bandSlug}/billing?tab=manual`
    const formattedAmount = `$${(amount / 100).toFixed(2)}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #EF4444;">Payment Dispute Needs Resolution</h1>
        <p style="font-size: 16px; color: #374151;">
          Hi ${governorName}, a manual payment dispute in ${bandName} requires your attention.
        </p>
        <div style="background-color: #FEE2E2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
          <p style="font-size: 14px; color: #991B1B; margin: 0;">
            <strong>Amount:</strong> ${formattedAmount}<br>
            <strong>Payer:</strong> ${payerName}<br>
            <strong>Disputed by:</strong> ${disputerName}<br>
            <strong>Reason:</strong> ${reason}
          </p>
        </div>
        <p style="font-size: 14px; color: #374151;">
          As a governor, you can resolve this dispute by confirming or rejecting the payment.
        </p>
        <div style="margin: 30px 0;">
          <a href="${billingUrl}"
             style="background-color: #EF4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Resolve Dispute
          </a>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          You're receiving this because you are a governor of ${bandName} on Band IT.
        </p>
      </div>
    `

    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 PAYMENT DISPUTE TO GOVERNORS EMAIL:')
      console.log(`To: ${email}`)
      console.log(`Amount: ${formattedAmount}`)
      console.log(`Payer: ${payerName}`)
      console.log(`Disputed by: ${disputerName}`)
      console.log(`Reason: ${reason}`)
      console.log('=================================\n')
      return { success: true }
    }

    return this.sendEmail({
      to: email,
      subject: `Payment dispute needs resolution in "${bandName}"`,
      html,
    })
  },

  /**
   * Send manual payment resolved notification email
   */
  async sendManualPaymentResolvedEmail(options: {
    email: string
    userName: string
    bandName: string
    bandSlug: string
    amount: number
    outcome: 'CONFIRMED' | 'REJECTED'
    resolverName: string
    note?: string
  }) {
    const { email, userName, bandName, bandSlug, amount, outcome, resolverName, note } = options
    const billingUrl = `${FRONTEND_URL}/bands/${bandSlug}/billing?tab=manual`
    const formattedAmount = `$${(amount / 100).toFixed(2)}`
    const isConfirmed = outcome === 'CONFIRMED'

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${isConfirmed ? '#10B981' : '#EF4444'};">Payment Dispute Resolved</h1>
        <p style="font-size: 16px; color: #374151;">
          Hi ${userName}, the disputed payment of ${formattedAmount} in ${bandName} has been resolved by ${resolverName}.
        </p>
        <div style="background-color: ${isConfirmed ? '#D1FAE5' : '#FEE2E2'}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isConfirmed ? '#10B981' : '#EF4444'};">
          <p style="font-size: 14px; color: ${isConfirmed ? '#065F46' : '#991B1B'}; margin: 0;">
            <strong>Outcome:</strong> ${isConfirmed ? 'Payment Confirmed' : 'Payment Rejected'}
            ${note ? `<br><br><strong>Note:</strong> ${note}` : ''}
          </p>
        </div>
        <div style="margin: 30px 0;">
          <a href="${billingUrl}"
             style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            View Billing
          </a>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          You're receiving this because you are a member of ${bandName} on Band IT.
        </p>
      </div>
    `

    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 PAYMENT RESOLVED EMAIL:')
      console.log(`To: ${email}`)
      console.log(`Amount: ${formattedAmount}`)
      console.log(`Outcome: ${outcome}`)
      console.log('=================================\n')
      return { success: true }
    }

    return this.sendEmail({
      to: email,
      subject: `Payment dispute resolved in "${bandName}" - ${isConfirmed ? 'Confirmed' : 'Rejected'}`,
      html,
    })
  },

  /**
   * Send contact form email to support
   */
  async sendContactFormEmail(options: {
    name: string
    email: string
    subject: string
    message: string
  }) {
    const { name, email, subject, message } = options
    const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'bardia@ebardia.com'

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">New Contact Form Submission</h1>
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 14px; color: #374151; margin: 0;">
            <strong>From:</strong> ${name} (${email})<br>
            <strong>Subject:</strong> ${subject}
          </p>
        </div>
        <div style="background-color: #FFFFFF; padding: 15px; border: 1px solid #E5E7EB; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 14px; color: #374151; white-space: pre-wrap; margin: 0;">
            ${message}
          </p>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          This message was sent via the Band IT contact form.
        </p>
      </div>
    `

    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 CONTACT FORM EMAIL:')
      console.log(`From: ${name} (${email})`)
      console.log(`Subject: ${subject}`)
      console.log(`Message: ${message}`)
      console.log('=================================\n')
      return { success: true }
    }

    return this.sendEmail({
      to: CONTACT_EMAIL,
      subject: `[Band IT Contact] ${subject}`,
      html,
    })
  },

  /**
   * Send auto-confirm warning email
   */
  async sendManualPaymentAutoConfirmWarningEmail(options: {
    email: string
    userName: string
    bandName: string
    bandSlug: string
    payerName: string
    amount: number
    paymentMethod: string
    autoConfirmAt: Date
  }) {
    const { email, userName, bandName, bandSlug, payerName, amount, paymentMethod, autoConfirmAt } = options
    const billingUrl = `${FRONTEND_URL}/bands/${bandSlug}/billing?tab=manual`
    const formattedAmount = `$${(amount / 100).toFixed(2)}`
    const formattedDate = autoConfirmAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #F59E0B;">Payment Auto-Confirm Warning</h1>
        <p style="font-size: 16px; color: #374151;">
          Hi ${userName}, a payment in ${bandName} will be automatically confirmed in 2 days if not reviewed.
        </p>
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
          <p style="font-size: 14px; color: #92400E; margin: 0;">
            <strong>Amount:</strong> ${formattedAmount}<br>
            <strong>Payment Method:</strong> ${paymentMethod}<br>
            <strong>Payer:</strong> ${payerName}<br>
            <strong>Auto-confirms on:</strong> ${formattedDate}
          </p>
        </div>
        <p style="font-size: 14px; color: #374151;">
          Please review and either confirm or dispute this payment before it is automatically confirmed.
        </p>
        <div style="margin: 30px 0;">
          <a href="${billingUrl}"
             style="background-color: #F59E0B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Review Payment Now
          </a>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 12px; color: #9CA3AF;">
          You're receiving this because you are a member of ${bandName} on Band IT.
        </p>
      </div>
    `

    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 PAYMENT AUTO-CONFIRM WARNING EMAIL:')
      console.log(`To: ${email}`)
      console.log(`Amount: ${formattedAmount}`)
      console.log(`Auto-confirms on: ${formattedDate}`)
      console.log('=================================\n')
      return { success: true }
    }

    return this.sendEmail({
      to: email,
      subject: `Action required: Payment will auto-confirm in 2 days - "${bandName}"`,
      html,
    })
  },
}