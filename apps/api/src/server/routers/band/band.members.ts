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
        user: { select: { id: true, name: true } }
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

/**
 * Transfer band ownership from current founder to another member
 * - Only the current FOUNDER can transfer ownership
 * - Target must be an ACTIVE member of the band
 * - Current founder becomes GOVERNOR after transfer
 * - Band's createdById is updated to new founder
 */
export const transferOwnership = publicProcedure
  .input(z.object({
    bandId: z.string(),
    newFounderUserId: z.string(),
    userId: z.string(), // Current user (must be founder)
  }))
  .mutation(async ({ input }) => {
    const { bandId, newFounderUserId, userId } = input

    // Get the band with members
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: { user: { select: { id: true, name: true } } }
        }
      }
    })

    if (!band) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Band not found'
      })
    }

    // Verify the acting user is the current FOUNDER
    const currentFounder = band.members.find(m => m.userId === userId)
    if (!currentFounder || currentFounder.role !== 'FOUNDER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the current founder can transfer ownership'
      })
    }

    // Verify the target is an active member
    const newFounder = band.members.find(m => m.userId === newFounderUserId)
    if (!newFounder) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Target user is not an active member of this band'
      })
    }

    // Cannot transfer to yourself
    if (newFounderUserId === userId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You are already the founder'
      })
    }

    // Perform the transfer in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the new founder's role to FOUNDER
      await tx.member.update({
        where: { id: newFounder.id },
        data: { role: 'FOUNDER' }
      })

      // Update the current founder's role to GOVERNOR
      await tx.member.update({
        where: { id: currentFounder.id },
        data: { role: 'GOVERNOR' }
      })

      // Update the band's createdById to the new founder
      await tx.band.update({
        where: { id: bandId },
        data: { createdById: newFounderUserId }
      })
    })

    // Notify the new founder
    await notificationService.create({
      userId: newFounderUserId,
      type: 'BAND_STATUS_CHANGED',
      title: 'You are now the Founder',
      message: `${currentFounder.user.name} has transferred ownership of ${band.name} to you. You are now the Founder.`,
      relatedId: bandId,
      relatedType: 'band',
      actionUrl: `/bands/${band.slug}`,
      priority: 'HIGH',
    })

    // Notify the former founder
    await notificationService.create({
      userId: userId,
      type: 'BAND_STATUS_CHANGED',
      title: 'Ownership Transferred',
      message: `You have transferred ownership of ${band.name} to ${newFounder.user.name}. You are now a Governor.`,
      relatedId: bandId,
      relatedType: 'band',
      actionUrl: `/bands/${band.slug}`,
    })

    return {
      success: true,
      newFounderName: newFounder.user.name,
    }
  })

/**
 * Nominate an active member to become a co-founder
 * - Only FOUNDERS can nominate
 * - Target must be an active member, not self, not already a founder
 * - Creates an ADD_FOUNDER proposal requiring unanimous approval from all founders
 */
export const nominateAsFounder = publicProcedure
  .input(z.object({
    bandId: z.string(),
    targetMemberId: z.string(),
    userId: z.string(),
    reason: z.string().min(10, 'Please provide a reason for the nomination'),
  }))
  .mutation(async ({ input }) => {
    const { bandId, targetMemberId, userId, reason } = input

    // Get the band with members
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: { user: { select: { id: true, name: true } } }
        }
      }
    })

    if (!band) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Band not found'
      })
    }

    // Verify the acting user is a FOUNDER
    const actingMember = band.members.find(m => m.userId === userId)
    if (!actingMember || actingMember.role !== 'FOUNDER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only founders can nominate new co-founders'
      })
    }

    // Find the target member
    const targetMember = band.members.find(m => m.id === targetMemberId)
    if (!targetMember) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Target member not found or not active'
      })
    }

    // Cannot nominate yourself
    if (targetMember.userId === userId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You cannot nominate yourself as a co-founder'
      })
    }

    // Cannot nominate someone who is already a founder
    if (targetMember.role === 'FOUNDER') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This member is already a founder'
      })
    }

    // Check for existing pending ADD_FOUNDER proposal for this member
    const existingProposal = await prisma.proposal.findFirst({
      where: {
        bandId,
        type: 'ADD_FOUNDER',
        status: 'OPEN',
        effects: {
          path: ['0', 'payload', 'targetMemberId'],
          equals: targetMemberId
        }
      }
    })

    if (existingProposal) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'There is already a pending founder nomination for this member'
      })
    }

    // Calculate voting end date
    const votingEndsAt = new Date()
    votingEndsAt.setDate(votingEndsAt.getDate() + band.votingPeriodDays)

    // Determine initial status based on band settings
    const initialStatus = band.requireProposalReview ? 'PENDING_REVIEW' : 'OPEN'

    // Create the proposal
    const proposal = await prisma.proposal.create({
      data: {
        bandId,
        createdById: userId,
        title: `Nominate ${targetMember.user.name} as Co-Founder`,
        description: `This proposal nominates ${targetMember.user.name} to become a co-founder of ${band.name}.\n\n**Reason for nomination:**\n${reason}\n\n**Important:** This nomination requires unanimous YES votes from ALL current founders to pass. Any NO vote will reject the nomination.`,
        type: 'ADD_FOUNDER',
        executionType: 'GOVERNANCE',
        priority: 'HIGH',
        problemStatement: reason,
        expectedOutcome: `${targetMember.user.name} will become a co-founder with full founder privileges.`,
        status: initialStatus,
        votingEndsAt: initialStatus === 'OPEN' ? votingEndsAt : null,
        votingStartedAt: initialStatus === 'OPEN' ? new Date() : null,
        effects: [{
          type: 'PROMOTE_TO_FOUNDER',
          payload: {
            targetMemberId: targetMember.id,
            targetUserId: targetMember.userId,
            targetUserName: targetMember.user.name,
          }
        }],
      }
    })

    // Get all founders to notify
    const founders = band.members.filter(m => m.role === 'FOUNDER')

    // Notify other founders
    for (const founder of founders) {
      if (founder.userId !== userId) {
        await notificationService.create({
          userId: founder.userId,
          type: 'PROPOSAL_VOTE_NEEDED',
          title: 'Founder Nomination Vote',
          message: `${actingMember.user.name} has nominated ${targetMember.user.name} to become a co-founder. Your vote is required.`,
          relatedId: proposal.id,
          relatedType: 'proposal',
          actionUrl: `/bands/${band.slug}/proposals/${proposal.id}`,
          priority: 'HIGH',
        })
      }
    }

    // Notify the nominee
    await notificationService.create({
      userId: targetMember.userId,
      type: 'PROPOSAL_CREATED',
      title: 'You Have Been Nominated',
      message: `${actingMember.user.name} has nominated you to become a co-founder of ${band.name}. The founders will vote on this nomination.`,
      relatedId: proposal.id,
      relatedType: 'proposal',
      actionUrl: `/bands/${band.slug}/proposals/${proposal.id}`,
      priority: 'HIGH',
    })

    return {
      success: true,
      proposalId: proposal.id,
      message: `Founder nomination proposal created for ${targetMember.user.name}`,
    }
  })