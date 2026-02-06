import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { emailService } from '../services/email.service'

export const contactRouter = router({
  /**
   * Submit contact form - public endpoint, no authentication required
   */
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required').max(100),
        email: z.string().email('Invalid email address'),
        subject: z.string().min(1, 'Subject is required').max(200),
        message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
      })
    )
    .mutation(async ({ input }) => {
      const { name, email, subject, message } = input

      await emailService.sendContactFormEmail({
        name,
        email,
        subject,
        message,
      })

      return { success: true }
    }),
})
