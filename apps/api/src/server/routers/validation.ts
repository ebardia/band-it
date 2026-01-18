import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { validateContent, EntityType } from '../../services/validation.service'

const entityTypeEnum = z.enum(['Proposal', 'Project', 'Task', 'ChecklistItem'])
const actionEnum = z.enum(['create', 'update'])

export const validationRouter = router({
  /**
   * Check content for integrity issues before create/update.
   *
   * Returns:
   * - canProceed: false only if BLOCK issues exist (legality)
   * - issues: array of detected issues with type, severity, and message
   *
   * Usage:
   * 1. Call this before creating/updating content
   * 2. If canProceed is false, show block modal - user cannot proceed
   * 3. If canProceed is true but issues exist, show warning modal - user can choose to proceed
   * 4. If proceeding with warnings, pass proceedWithFlags=true to the create/update mutation
   */
  check: publicProcedure
    .input(z.object({
      entityType: entityTypeEnum,
      action: actionEnum,
      bandId: z.string(),
      userId: z.string().optional(),
      entityId: z.string().optional(),
      data: z.object({
        title: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
      }).passthrough(), // Allow additional fields
      parentId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await validateContent({
        entityType: input.entityType as EntityType,
        action: input.action,
        bandId: input.bandId,
        userId: input.userId,
        entityId: input.entityId,
        data: input.data,
        parentId: input.parentId,
      })

      return result
    }),
})
