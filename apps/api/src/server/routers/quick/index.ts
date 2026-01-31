import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { checkGoodStanding } from '../../../lib/dues-enforcement'

// Roles that can vote
const CAN_VOTE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER']

/**
 * Quick router - provides context for mobile-first micro landing pages
 * These are minimal endpoints that return just the data needed for quick actions
 */
export const quickRouter = router({
  /**
   * Get context for voting on a proposal
   * Returns: proposal info, band name, voting deadline, user's current vote,
   * voting status, membership status, dues status
   */
  getVoteContext: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { proposalId, userId } = input

      // Get proposal with band info
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
          band: {
            select: {
              id: true,
              name: true,
              slug: true,
              votingMethod: true,
              quorumPercentage: true,
            },
          },
          votes: {
            where: { userId },
            select: { id: true, vote: true, comment: true, createdAt: true },
          },
        },
      })

      if (!proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found',
        })
      }

      // Check user's membership
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId, bandId: proposal.bandId },
        },
        select: { role: true, status: true },
      })

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a member of this band',
        })
      }

      if (membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your membership is not active',
        })
      }

      // Check if user can vote (has voting role)
      const canVote = CAN_VOTE.includes(membership.role)

      // Check dues standing
      const duesStatus = await checkGoodStanding(proposal.bandId, userId)

      // Get vote counts for summary
      const allVotes = await prisma.vote.findMany({
        where: { proposalId },
        select: { vote: true },
      })

      const yesVotes = allVotes.filter((v) => v.vote === 'YES').length
      const noVotes = allVotes.filter((v) => v.vote === 'NO').length
      const abstainVotes = allVotes.filter((v) => v.vote === 'ABSTAIN').length
      const totalVotes = allVotes.length

      // Get eligible voters count
      const eligibleVoters = await prisma.member.count({
        where: {
          bandId: proposal.bandId,
          status: 'ACTIVE',
          role: { in: CAN_VOTE as any },
        },
      })

      // Calculate quorum
      const participationPercentage = eligibleVoters > 0 ? (totalVotes / eligibleVoters) * 100 : 0
      const quorumMet = participationPercentage >= proposal.band.quorumPercentage

      // Check if voting is still open
      const now = new Date()
      const votingOpen = proposal.status === 'OPEN' && proposal.votingEndsAt && proposal.votingEndsAt > now
      const votingExpired = proposal.votingEndsAt && proposal.votingEndsAt <= now

      // User's existing vote (if any)
      const userVote = proposal.votes[0] || null

      return {
        proposal: {
          id: proposal.id,
          title: proposal.title,
          description: proposal.description,
          type: proposal.type,
          status: proposal.status,
          createdBy: proposal.createdBy,
          votingEndsAt: proposal.votingEndsAt,
          createdAt: proposal.createdAt,
        },
        band: {
          id: proposal.band.id,
          name: proposal.band.name,
          slug: proposal.band.slug,
          votingMethod: proposal.band.votingMethod,
        },
        userVote: userVote
          ? {
              vote: userVote.vote,
              comment: userVote.comment,
              createdAt: userVote.createdAt,
            }
          : null,
        voteSummary: {
          yes: yesVotes,
          no: noVotes,
          abstain: abstainVotes,
          total: totalVotes,
          eligibleVoters,
          quorumMet,
          quorumRequired: proposal.band.quorumPercentage,
        },
        permissions: {
          canVote: canVote && votingOpen && duesStatus.inGoodStanding,
          hasVoted: !!userVote,
          votingOpen,
          votingExpired,
          inGoodStanding: duesStatus.inGoodStanding,
          duesReason: duesStatus.reason,
          membershipRole: membership.role,
        },
      }
    }),

  /**
   * Get context for reading a post
   * Returns: post info, author, band name, response count
   */
  getReadContext: publicProcedure
    .input(
      z.object({
        postId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { postId, userId } = input

      // Get post with author and band info
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          author: {
            select: { id: true, name: true },
          },
          band: {
            select: { id: true, name: true, slug: true },
          },
          category: {
            select: { id: true, name: true, slug: true, visibility: true },
          },
        },
      })

      if (!post || post.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        })
      }

      // Check user's membership
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: { userId, bandId: post.bandId },
        },
        select: { role: true, status: true },
      })

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a member of this band',
        })
      }

      if (membership.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your membership is not active',
        })
      }

      // Check category visibility
      const canAccessCategory =
        post.category.visibility === 'PUBLIC' ||
        (post.category.visibility === 'MODERATOR' &&
          ['FOUNDER', 'GOVERNOR', 'MODERATOR'].includes(membership.role)) ||
        (post.category.visibility === 'GOVERNANCE' && ['FOUNDER', 'GOVERNOR'].includes(membership.role))

      if (!canAccessCategory) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this category',
        })
      }

      // Check dues standing
      const duesStatus = await checkGoodStanding(post.bandId, userId)

      return {
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          isPinned: post.isPinned,
          isLocked: post.isLocked,
          isEdited: post.isEdited,
          responseCount: post.responseCount,
          author: post.author,
          createdAt: post.createdAt,
          editedAt: post.editedAt,
        },
        band: {
          id: post.band.id,
          name: post.band.name,
          slug: post.band.slug,
        },
        category: {
          id: post.category.id,
          name: post.category.name,
          slug: post.category.slug,
        },
        permissions: {
          canRespond: !post.isLocked && duesStatus.inGoodStanding,
          canEdit: post.author.id === userId,
          inGoodStanding: duesStatus.inGoodStanding,
          duesReason: duesStatus.reason,
          membershipRole: membership.role,
        },
      }
    }),

  /**
   * Get context for replying to content (message or post response)
   * Returns: original content, author, channel/band context
   */
  getReplyContext: publicProcedure
    .input(
      z.object({
        contentId: z.string(),
        contentType: z.enum(['message', 'post_response']),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { contentId, contentType, userId } = input

      if (contentType === 'message') {
        // Get message with channel and band info
        const message = await prisma.message.findUnique({
          where: { id: contentId },
          include: {
            author: {
              select: { id: true, name: true },
            },
            channel: {
              select: {
                id: true,
                name: true,
                band: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
          },
        })

        if (!message || message.deletedAt) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Message not found',
          })
        }

        const bandId = message.channel.band.id

        // Check user's membership
        const membership = await prisma.member.findUnique({
          where: {
            userId_bandId: { userId, bandId },
          },
          select: { role: true, status: true },
        })

        if (!membership) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not a member of this band',
          })
        }

        if (membership.status !== 'ACTIVE') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Your membership is not active',
          })
        }

        // Check dues standing
        const duesStatus = await checkGoodStanding(bandId, userId)

        return {
          content: {
            id: message.id,
            type: 'message' as const,
            text: message.content,
            author: message.author,
            createdAt: message.createdAt,
          },
          channel: {
            id: message.channel.id,
            name: message.channel.name,
          },
          band: {
            id: message.channel.band.id,
            name: message.channel.band.name,
            slug: message.channel.band.slug,
          },
          permissions: {
            canReply: duesStatus.inGoodStanding,
            inGoodStanding: duesStatus.inGoodStanding,
            duesReason: duesStatus.reason,
            membershipRole: membership.role,
          },
        }
      } else {
        // Get post response with post and band info
        const response = await prisma.postResponse.findUnique({
          where: { id: contentId },
          include: {
            author: {
              select: { id: true, name: true },
            },
            post: {
              select: {
                id: true,
                title: true,
                slug: true,
                isLocked: true,
                band: {
                  select: { id: true, name: true, slug: true },
                },
                category: {
                  select: { id: true, name: true, slug: true, isArchived: true },
                },
              },
            },
          },
        })

        if (!response || response.deletedAt) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Response not found',
          })
        }

        const bandId = response.post.band.id

        // Check user's membership
        const membership = await prisma.member.findUnique({
          where: {
            userId_bandId: { userId, bandId },
          },
          select: { role: true, status: true },
        })

        if (!membership) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not a member of this band',
          })
        }

        if (membership.status !== 'ACTIVE') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Your membership is not active',
          })
        }

        // Check dues standing
        const duesStatus = await checkGoodStanding(bandId, userId)

        // Check if replies are allowed (max depth, not locked, not archived)
        const canReplyToThread =
          response.depth < 3 && !response.post.isLocked && !response.post.category.isArchived

        return {
          content: {
            id: response.id,
            type: 'post_response' as const,
            text: response.content,
            author: response.author,
            createdAt: response.createdAt,
            depth: response.depth,
          },
          post: {
            id: response.post.id,
            title: response.post.title,
            slug: response.post.slug,
            isLocked: response.post.isLocked,
          },
          category: {
            id: response.post.category.id,
            name: response.post.category.name,
            slug: response.post.category.slug,
            isArchived: response.post.category.isArchived,
          },
          band: {
            id: response.post.band.id,
            name: response.post.band.name,
            slug: response.post.band.slug,
          },
          permissions: {
            canReply: canReplyToThread && duesStatus.inGoodStanding,
            maxDepthReached: response.depth >= 3,
            inGoodStanding: duesStatus.inGoodStanding,
            duesReason: duesStatus.reason,
            membershipRole: membership.role,
          },
        }
      }
    }),

  /**
   * Get context for confirming a manual payment
   * Returns: payment details, who recorded it, band name
   * Uses confirmationToken for secure access without requiring login
   */
  getPaymentContext: publicProcedure
    .input(
      z.object({
        paymentId: z.string(),
        token: z.string(), // confirmationToken for secure access
      })
    )
    .query(async ({ input }) => {
      const { paymentId, token } = input

      // Get payment by ID and validate token
      const payment = await prisma.manualPayment.findUnique({
        where: { id: paymentId },
        include: {
          band: {
            select: { id: true, name: true, slug: true },
          },
          member: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          initiatedBy: {
            select: { id: true, name: true },
          },
        },
      })

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment not found',
        })
      }

      // Validate the confirmation token
      if (!payment.confirmationToken || payment.confirmationToken !== token) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired confirmation link',
        })
      }

      // Check if payment is still pending
      if (payment.status !== 'PENDING') {
        return {
          payment: {
            id: payment.id,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            paymentMethodOther: payment.paymentMethodOther,
            paymentDate: payment.paymentDate,
            note: payment.note,
          },
          band: {
            id: payment.band.id,
            name: payment.band.name,
            slug: payment.band.slug,
          },
          member: {
            id: payment.member.id,
            userId: payment.member.userId,
            name: payment.member.user.name,
          },
          initiatedBy: payment.initiatedBy,
          permissions: {
            canConfirm: false,
            reason: `This payment has already been ${payment.status.toLowerCase().replace('_', ' ')}`,
            isPending: false,
          },
        }
      }

      // Payment is pending and token is valid
      // Determine who can confirm: if treasurer initiated, member confirms
      // Since we have token access, we assume the correct party is accessing
      const treasurerInitiated = payment.initiatedByRole === 'TREASURER'

      return {
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
          paymentMethodOther: payment.paymentMethodOther,
          paymentDate: payment.paymentDate,
          note: payment.note,
          autoConfirmAt: payment.autoConfirmAt,
        },
        band: {
          id: payment.band.id,
          name: payment.band.name,
          slug: payment.band.slug,
        },
        member: {
          id: payment.member.id,
          userId: payment.member.userId,
          name: payment.member.user.name,
        },
        initiatedBy: payment.initiatedBy,
        permissions: {
          canConfirm: true,
          isPending: true,
          treasurerInitiated,
        },
      }
    }),

  /**
   * Confirm a payment using the confirmation token
   * This allows confirmation without full authentication
   */
  confirmPaymentWithToken: publicProcedure
    .input(
      z.object({
        paymentId: z.string(),
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { paymentId, token } = input

      // Get payment and validate
      const payment = await prisma.manualPayment.findUnique({
        where: { id: paymentId },
        include: {
          band: { select: { id: true, name: true, slug: true } },
          member: { include: { user: { select: { id: true, name: true } } } },
          initiatedBy: { select: { id: true, name: true } },
        },
      })

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment not found',
        })
      }

      // Validate token
      if (!payment.confirmationToken || payment.confirmationToken !== token) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired confirmation link',
        })
      }

      // Check if still pending
      if (payment.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `This payment has already been ${payment.status.toLowerCase().replace('_', ' ')}`,
        })
      }

      // Determine confirming user based on who initiated
      // If treasurer initiated, member confirms (memberUserId)
      // If member initiated, treasurer confirms (we don't have treasurer ID, so use memberUserId for now)
      const confirmingUserId =
        payment.initiatedByRole === 'TREASURER' ? payment.memberUserId : payment.memberUserId

      // Update payment status
      const updatedPayment = await prisma.manualPayment.update({
        where: { id: paymentId },
        data: {
          status: 'CONFIRMED',
          confirmedById: confirmingUserId,
          confirmedAt: new Date(),
          // Clear the token after use for security
          confirmationToken: null,
        },
      })

      // Update BandMemberBilling
      await prisma.bandMemberBilling.upsert({
        where: {
          bandId_memberUserId: {
            bandId: payment.bandId,
            memberUserId: payment.memberUserId,
          },
        },
        create: {
          bandId: payment.bandId,
          memberUserId: payment.memberUserId,
          status: 'ACTIVE',
          lastPaymentAt: payment.paymentDate,
        },
        update: {
          status: 'ACTIVE',
          lastPaymentAt: payment.paymentDate,
        },
      })

      return {
        success: true,
        payment: {
          id: updatedPayment.id,
          status: updatedPayment.status,
          confirmedAt: updatedPayment.confirmedAt,
        },
      }
    }),
})
