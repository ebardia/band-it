import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { notificationService } from '../../../services/notification.service'
import { emailService } from '../../services/email.service'

/**
 * Check and set activatedAt when band reaches 3 active members
 * This should be called after any member becomes ACTIVE
 */
export async function checkAndSetBandActivation(bandId: string): Promise<boolean> {
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: { activatedAt: true },
  })

  // Already activated, nothing to do
  if (band?.activatedAt) {
    return false
  }

  // Count active members
  const activeCount = await prisma.member.count({
    where: {
      bandId,
      status: 'ACTIVE',
    },
  })

  // Activate if reached 3 members
  if (activeCount >= 3) {
    await prisma.band.update({
      where: { id: bandId },
      data: { activatedAt: new Date() },
    })
    return true
  }

  return false
}

export const bandDissolveRouter = router({
  /**
   * Check if band can be dissolved
   */
  canDissolve: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const band = await prisma.band.findUnique({
        where: { id: input.bandId },
        include: {
          members: {
            where: { status: 'ACTIVE' },
            select: { userId: true, role: true },
          },
        },
      })

      if (!band) {
        return { canDissolve: false, reason: 'Band not found' }
      }

      // Check if user is the founder
      const founderMember = band.members.find(m => m.role === 'FOUNDER')
      if (!founderMember || founderMember.userId !== input.userId) {
        return { canDissolve: false, reason: 'Only the founder can dissolve the band' }
      }

      // Check if already dissolved
      if (band.dissolvedAt) {
        return { canDissolve: false, reason: 'Band is already dissolved' }
      }

      // Check if activated (reached 3 members at some point)
      if (band.activatedAt) {
        return { canDissolve: false, reason: 'Active bands cannot be dissolved this way. Create a proposal instead.' }
      }

      return { canDissolve: true }
    }),

  /**
   * Dissolve an inactive band
   */
  dissolve: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
        userId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const band = await prisma.band.findUnique({
        where: { id: input.bandId },
        include: {
          members: {
            where: { status: 'ACTIVE' },
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      })

      if (!band) {
        throw new Error('Band not found')
      }

      // Check if user is the founder
      const founderMember = band.members.find(m => m.role === 'FOUNDER')
      if (!founderMember || founderMember.userId !== input.userId) {
        throw new Error('Only the founder can dissolve the band')
      }

      // Check if already dissolved
      if (band.dissolvedAt) {
        throw new Error('Band is already dissolved')
      }

      // Check if activated
      if (band.activatedAt) {
        throw new Error('Active bands cannot be dissolved this way. Create a proposal instead.')
      }

      // Perform dissolution in a transaction
      await prisma.$transaction(async (tx) => {
        // 1. Mark band as dissolved
        await tx.band.update({
          where: { id: input.bandId },
          data: {
            dissolvedAt: new Date(),
            dissolvedById: input.userId,
            dissolutionReason: input.reason,
          },
        })

        // 2. Reject all pending applications (status: PENDING)
        await tx.member.updateMany({
          where: {
            bandId: input.bandId,
            status: 'PENDING',
          },
          data: {
            status: 'REJECTED',
          },
        })

        // 3. Reject all pending invitations (status: INVITED)
        await tx.member.updateMany({
          where: {
            bandId: input.bandId,
            status: 'INVITED',
          },
          data: {
            status: 'REJECTED',
          },
        })

        // 4. Delete all pending email invites (PendingInvite records)
        await tx.pendingInvite.deleteMany({
          where: {
            bandId: input.bandId,
          },
        })
      })

      // 5. Notify other active members (not the founder) via email and in-app
      const otherMembers = band.members.filter(m => m.userId !== input.userId)

      for (const member of otherMembers) {
        // In-app notification
        await notificationService.create({
          userId: member.userId,
          type: 'BAND_DISSOLVED',
          actionUrl: '/bands',
          priority: 'HIGH',
          metadata: {
            bandName: band.name,
            reason: input.reason || 'No reason provided',
          },
          relatedId: input.bandId,
          relatedType: 'BAND',
        })

        // Email notification
        try {
          await emailService.sendBandDissolvedEmail({
            email: member.user.email,
            userName: member.user.name,
            bandName: band.name,
            reason: input.reason,
          })
        } catch (error) {
          // Log but don't fail if email fails
          console.error(`Failed to send dissolution email to ${member.user.email}:`, error)
        }
      }

      return {
        success: true,
        message: 'Band has been dissolved',
      }
    }),
})
