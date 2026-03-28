import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { requireGoodStanding } from '../../../lib/dues-enforcement'

const CAN_DELETE_PROJECT = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export const deleteProject = publicProcedure
  .input(
    z.object({
      projectId: z.string(),
      userId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      include: {
        band: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
            },
          },
        },
        _count: { select: { tasks: true } },
      },
    })

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      })
    }

    await requireGoodStanding(project.bandId, input.userId)

    const member = project.band.members.find(m => m.userId === input.userId)
    if (!member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an active band member to delete projects',
      })
    }

    if (!CAN_DELETE_PROJECT.includes(member.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete projects',
      })
    }

    if (project.status !== 'PLANNING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only projects in Planning status can be deleted',
      })
    }

    if (project._count.tasks > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Delete all tasks in this project before deleting the project',
      })
    }

    await prisma.project.delete({
      where: { id: input.projectId },
    })

    return {
      success: true,
      message: 'Project deleted',
    }
  })
