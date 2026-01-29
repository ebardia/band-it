import { prisma } from './prisma'
import { MemberRole } from '@prisma/client'

// Roles that can review proposals (CONDUCTOR cannot review)
const REVIEWER_ROLES: MemberRole[] = ['MODERATOR', 'GOVERNOR', 'FOUNDER']

// Role hierarchy for determining who can review whom
const ROLE_RANK: Record<MemberRole, number> = {
  'FOUNDER': 4,
  'GOVERNOR': 3,
  'MODERATOR': 2,
  'CONDUCTOR': 1,
  'VOTING_MEMBER': 0,
  'OBSERVER': 0,
}

/**
 * Check if a reviewer can review a proposal by a given author.
 * Rules:
 * - Cannot review own proposal
 * - Only MODERATOR, GOVERNOR, FOUNDER can review
 * - Reviewer must be >= author's rank
 * - Exception: Founder can be reviewed by Governor or Moderator
 */
export function canReviewProposal(
  reviewerRole: MemberRole,
  authorRole: MemberRole,
  reviewerUserId: string,
  authorUserId: string
): boolean {
  // Cannot review own proposal
  if (reviewerUserId === authorUserId) {
    return false
  }

  // Only MODERATOR, GOVERNOR, FOUNDER can review
  if (!REVIEWER_ROLES.includes(reviewerRole)) {
    return false
  }

  const reviewerRank = ROLE_RANK[reviewerRole] || 0
  const authorRank = ROLE_RANK[authorRole] || 0

  // Special case: Founder can be reviewed by Governor or Moderator (peer review)
  if (authorRole === 'FOUNDER') {
    return reviewerRank >= ROLE_RANK['MODERATOR']
  }

  // Reviewer must be >= author's rank
  return reviewerRank >= authorRank
}

/**
 * Get all users who can review a proposal by a given author.
 */
export async function getEligibleReviewers(
  bandId: string,
  authorUserId: string,
  authorRole: MemberRole
): Promise<{ userId: string; role: MemberRole; name: string }[]> {
  // Get all MODERATOR, GOVERNOR, FOUNDER except author
  const reviewers = await prisma.member.findMany({
    where: {
      bandId,
      status: 'ACTIVE',
      role: { in: REVIEWER_ROLES },
      userId: { not: authorUserId },
    },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  })

  // Filter by eligibility
  return reviewers
    .filter(m => canReviewProposal(m.role, authorRole, m.userId, authorUserId))
    .map(m => ({
      userId: m.userId,
      role: m.role,
      name: m.user.name,
    }))
}

/**
 * Check if a user can review any proposals in a band.
 */
export function isReviewer(role: MemberRole): boolean {
  return REVIEWER_ROLES.includes(role)
}

/**
 * Maximum number of times a proposal can be resubmitted.
 */
export const MAX_RESUBMISSIONS = 3
