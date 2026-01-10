import nodemailer from 'nodemailer'
import { prisma } from '../../lib/prisma'

// For development: Log emails to console
// For production: Use real SMTP (SendGrid, AWS SES, etc.)
const isDevelopment = process.env.NODE_ENV !== 'production'

// Create test transporter for development
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
} else {
  // In production, use real email service
  // TODO: Configure SendGrid or AWS SES
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
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`

    // Email content
    const mailOptions = {
      from: '"Band IT" <noreply@band-it.com>',
      to: email,
      subject: 'Verify Your Band IT Email',
      html: `
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
      `,
    }

    // In development, just log the link
    if (isDevelopment) {
      console.log('\n=================================')
      console.log('📧 EMAIL VERIFICATION LINK:')
      console.log(verificationUrl)
      console.log('=================================\n')
      return { success: true, verificationUrl } // Return for testing
    }

    // In production, actually send the email
    try {
      await transporter.sendMail(mailOptions)
      return { success: true }
    } catch (error) {
      console.error('Error sending email:', error)
      return { success: false, error }
    }
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
}