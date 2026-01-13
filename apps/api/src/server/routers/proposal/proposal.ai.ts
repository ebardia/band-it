import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { aiService } from '../../../services/ai.service'

export const proposalAiRouter = router({
  /**
   * AI: Generate proposal draft
   */
  generateDraft: publicProcedure
    .input(
      z.object({
        title: z.string().min(3, 'Title must be at least 3 characters'),
        type: z.enum(['GENERAL', 'BUDGET', 'PROJECT', 'POLICY', 'MEMBERSHIP']),
        context: z.string().optional(),
        bandName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const draft = await aiService.generateProposalDraft({
        title: input.title,
        type: input.type,
        context: input.context,
        bandName: input.bandName,
      })

      return {
        success: true,
        draft,
      }
    }),
})