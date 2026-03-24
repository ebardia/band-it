import { prisma } from './prisma'

/** Roles that may vote on ordinary proposals */
const CAN_VOTE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER'] as const

/**
 * Eligible voter count for quorum / early-close "all voted" checks.
 * ADD_FOUNDER: only founders may vote, so denominator is active founders only.
 */
export async function getEligibleVoterCountForProposal(
  bandId: string,
  proposalType: string
): Promise<number> {
  if (proposalType === 'ADD_FOUNDER') {
    return prisma.member.count({
      where: { bandId, status: 'ACTIVE', role: 'FOUNDER' },
    })
  }

  return prisma.member.count({
    where: {
      bandId,
      status: 'ACTIVE',
      role: { in: [...CAN_VOTE] as any },
    },
  })
}
