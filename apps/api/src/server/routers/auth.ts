import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { authService } from '../services/auth.service'

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
   * Get current user (requires authentication)
   */
  me: publicProcedure.query(async () => {
    // TODO: Add authentication middleware
    return {
      message: 'This will return current user after adding auth middleware',
    }
  }),
})