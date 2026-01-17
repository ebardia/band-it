import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { setAuditFlags, clearAuditFlags } from '../../../lib/auditContext'

// Roles that can update any proposal
const CAN_UPDATE_ANY = ['FOUNDER', 'GOVERNOR', 'MODERATOR']

export const proposalUpdateRouter = router({
  /**
   * Update a proposal (only if still OPEN)
   */
  update: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
        userId: z.string(),
        title: z.string().min(5).optional(),
        description: z.string().min(20).optional(),
        type: z.enum(['GENERAL', 'BUDGET', 'PROJECT', 'POLICY', 'MEMBERSHIP']).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        problemStatement: z.string().optional().nullable(),
        expectedOutcome: z.string().optional().nullable(),
        risksAndConcerns: z.string().optional().nullable(),
        budgetRequested: z.number().optional().nullable(),
        budgetBreakdown: z.string().optional().nullable(),
        fundingSource: z.string().optional().nullable(),
        proposedStartDate: z.date().optional().nullable(),
        proposedEndDate: z.date().optional().nullable(),
        milestones: z.string().optional().nullable(),
        externalLinks: z.array(z.string()).optional(),
        // Integrity Guard flags
        proceedWithFlags: z.boolean().optional(),
        flagReasons: z.array(z.string()).optional(),
        flagDetails: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { proposalId, userId, proceedWithFlags, flagReasons, flagDetails, ...updateData } = input

      // Set integrity flags in audit context if user proceeded with warnings
      if (proceedWithFlags && flagReasons && flagReasons.length > 0) {
        setAuditFlags({
          flagged: true,
          flagReasons,
          flagDetails,
        })
      }

      // Get the proposal
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: {
          band: {
            include: {
              members: {
                where: { userId, status: 'ACTIVE' },
              },
            },
          },
        },
      })

      if (!proposal) {
        throw new Error('Proposal not found')
      }

      // Check if proposal is still open
      if (proposal.status !== 'OPEN') {
        throw new Error('Cannot edit a closed proposal')
      }

      // Check permissions - creator or admin roles can edit
      const membership = proposal.band.members[0]
      const isCreator = proposal.createdById === userId
      const canUpdateAny = membership && CAN_UPDATE_ANY.includes(membership.role)

      if (!isCreator && !canUpdateAny) {
        throw new Error('You do not have permission to edit this proposal')
      }

      // Update proposal
      const updated = await prisma.proposal.update({
        where: { id: proposalId },
        data: updateData,
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
          band: {
            select: { id: true, name: true, slug: true },
          },
        },
      })

      // Clear flags to prevent leaking to other operations
      clearAuditFlags()

      return {
        success: true,
        message: 'Proposal updated successfully',
        proposal: updated,
      }
    }),
})