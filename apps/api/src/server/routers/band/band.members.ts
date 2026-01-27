import { z } from 'zod'
import { publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { notificationService } from '../../../services/notification.service'

const MemberRoleEnum = z.enum(['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'])

/**
 * Get all members of a band with detailed info
 */
export const getMembers = publicProcedure
  .input(z.object({
    bandId: z.string(),
  }))
  .query(async ({ input }) => {
    const { bandId } = input

    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: {
        id: true,
        name: true,
        whoCanChangeRoles: true,
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                strengths: true,
                passions: true,
                zipcode: true,
                createdAt: true,
              }
            }
          },
          orderBy: [
            { role: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      }
    })

    if (!band) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Band not found'
      })
    }

    // Get contribution stats for each member
    const memberStats = await Promise.all(
      band.members.map(async (member) => {
        const [tasksCompleted, tasksAssigned, proposalsCreated, votesCount] = await Promise.all([
          prisma.task.count({
            where: {
              bandId,
              assigneeId: member.userId,
              status: 'COMPLETED'
            }
          }),
          prisma.task.count({
            where: {
              bandId,
              assigneeId: member.userId,
            }
          }),
          prisma.proposal.count({
            where: {
              bandId,
              createdById: member.userId,
            }
          }),
          prisma.vote.count({
            where: {
              proposal: { bandId },
              userId: member.userId,
            }
          })
        ])

        return {
          odMemberId: member.id,
          odUserId: member.userId,
          tasksCompleted,
          tasksAssigned,
          proposalsCreated,
          votesCount,
        }
      })
    )

    // Merge stats with members
    const membersWithStats = band.members.map(member => {
      const stats = memberStats.find(s => s.odMemberId === member.id)
      return {
        ...member,
        stats: stats ? {
          tasksCompleted: stats.tasksCompleted,
          tasksAssigned: stats.tasksAssigned,
          proposalsCreated: stats.proposalsCreated,
          votesCount: stats.votesCount,
        } : null
      }
    })

    return {
      members: membersWithStats,
      whoCanChangeRoles: band.whoCanChangeRoles,
    }
  })

/**
 * Get a single member's detailed profile
 */
export const getMemberProfile = publicProcedure
  .input(z.object({
    bandId: z.string(),
    memberId: z.string(),
  }))
  .query(async ({ input }) => {
    const { bandId, memberId } = input

    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        bandId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            strengths: true,
            weaknesses: true,
            passions: true,
            developmentPath: true,
            zipcode: true,
            createdAt: true,
          }
        },
        band: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      }
    })

    if (!member) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Member not found'
      })
    }

    // Get detailed contribution stats
    const [
      tasksCompleted,
      tasksInProgress,
      tasksTotal,
      proposalsCreated,
      proposalsApproved,
      votesCount,
      projectsLed,
      recentTasks,
      recentProposals
    ] = await Promise.all([
      prisma.task.count({
        where: { bandId, assigneeId: member.userId, status: 'COMPLETED' }
      }),
      prisma.task.count({
        where: { bandId, assigneeId: member.userId, status: 'IN_PROGRESS' }
      }),
      prisma.task.count({
        where: { bandId, assigneeId: member.userId }
      }),
      prisma.proposal.count({
        where: { bandId, createdById: member.userId }
      }),
      prisma.proposal.count({
        where: { bandId, createdById: member.userId, status: 'APPROVED' }
      }),
      prisma.vote.count({
        where: { proposal: { bandId }, userId: member.userId }
      }),
      prisma.project.count({
        where: { bandId, leadId: member.userId }
      }),
      prisma.task.findMany({
        where: { bandId, assigneeId: member.userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
          project: { select: { id: true, name: true } }
        }
      }),
      prisma.proposal.findMany({
        where: { bandId, createdById: member.userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        }
      })
    ])

    return {
      member,
      stats: {
        tasksCompleted,
        tasksInProgress,
        tasksTotal,
        proposalsCreated,
        proposalsApproved,
        votesCount,
        projectsLed,
      },
      recentActivity: {
        tasks: recentTasks,
        proposals: recentProposals,
      }
    }
  })

/**
 * Change a member's role
 */
export const changeRole = publicProcedure
  .input(z.object({
    bandId: z.string(),
    memberId: z.string(),
    newRole: MemberRoleEnum,
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { bandId, memberId, newRole, userId } = input

    const band = await prisma.band.findUnique({
      where: { id: bandId },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: { user: true }
        }
      }
    })

    if (!band) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Band not found'
      })
    }

    const actingMember = band.members.find(m => m.userId === userId)
    if (!actingMember) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are not a member of this band'
      })
    }

    if (!band.whoCanChangeRoles.includes(actingMember.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to change roles'
      })
    }

    const targetMember = band.members.find(m => m.id === memberId)
    if (!targetMember) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Member not found'
      })
    }

    if (targetMember.role === 'FOUNDER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot change the founder\'s role. Founder must transfer ownership.'
      })
    }

    if (newRole === 'FOUNDER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot promote to Founder. Use transfer ownership instead.'
      })
    }

    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    })

    await notificationService.create({
      userId: targetMember.userId,
      type: 'BAND_STATUS_CHANGED',
      title: 'Your Role Changed',
      message: `Your role in ${band.name} has been changed to ${newRole.replace('_', ' ')}`,
      relatedId: bandId,
      relatedType: 'band',
      actionUrl: `/bands/${band.slug}/members`,
    })

    return { member: updatedMember }
  })

/**
 * Create a proposal to remove a member
 */
export const proposeRemoval = publicProcedure
  .input(z.object({
    bandId: z.string(),
    memberId: z.string(),
    reason: z.string().min(10, 'Please provide a reason for removal'),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { bandId, memberId, reason, userId } = input

    const band = await prisma.band.findUnique({
      where: { id: bandId },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: { user: true }
        }
      }
    })

    if (!band) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Band not found'
      })
    }

    const actingMember = band.members.find(m => m.userId === userId)
    if (!actingMember) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are not a member of this band'
      })
    }

    if (!band.whoCanCreateProposals.includes(actingMember.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to create proposals'
      })
    }

    const targetMember = band.members.find(m => m.id === memberId)
    if (!targetMember) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Member not found'
      })
    }

    if (targetMember.role === 'FOUNDER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot propose removal of the founder'
      })
    }

    if (targetMember.userId === userId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You cannot propose your own removal. Use "Leave Band" instead.'
      })
    }

    const votingEndsAt = new Date()
    votingEndsAt.setDate(votingEndsAt.getDate() + band.votingPeriodDays)

    const proposal = await prisma.proposal.create({
      data: {
        bandId,
        createdById: userId,
        title: `Remove Member: ${targetMember.user.name}`,
        description: `This proposal is to remove ${targetMember.user.name} from the band.\n\nReason for removal:\n${reason}`,
        type: 'MEMBERSHIP',
        priority: 'HIGH',
        problemStatement: reason,
        expectedOutcome: `${targetMember.user.name} will be removed from the band if this proposal is approved.`,
        votingEndsAt,
      }
    })

    for (const member of band.members) {
      if (member.userId !== userId) {
        await notificationService.create({
          userId: member.userId,
          type: 'PROPOSAL_VOTE_NEEDED',
          title: 'Member Removal Vote',
          message: `A proposal to remove ${targetMember.user.name} has been created. Your vote is needed.`,
          relatedId: proposal.id,
          relatedType: 'proposal',
          actionUrl: `/bands/${band.slug}/proposals/${proposal.id}`,
          priority: 'HIGH',
        })
      }
    }

    return { proposal }
  })