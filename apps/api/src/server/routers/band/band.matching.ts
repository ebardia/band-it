import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'

export const bandMatchingRouter = router({
  /**
   * Get recommended users for a band based on matching
   */
  getRecommendedUsers: publicProcedure
    .input(
      z.object({
        bandId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Get band details
      const band = await prisma.band.findUnique({
        where: { id: input.bandId },
        select: {
          skillsLookingFor: true,
          whatMembersWillLearn: true,
          values: true,
        },
      })

      if (!band) {
        throw new Error('Band not found')
      }

      // Get all users
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          strengths: true,
          passions: true,
          developmentPath: true,
        },
      })

      // Get existing members to filter out
      const existingMembers = await prisma.member.findMany({
        where: { bandId: input.bandId },
        select: { userId: true },
      })

      const existingMemberIds = new Set(existingMembers.map(m => m.userId))

      // Calculate match scores for each user
      const scoredUsers = users
        .filter(user => !existingMemberIds.has(user.id))
        .map(user => {
          let score = 0
          const matches: string[] = []

          // Match skills: band.skillsLookingFor vs user.strengths
          band.skillsLookingFor.forEach(skill => {
            if (user.strengths.some(strength => 
              strength.toLowerCase().includes(skill.toLowerCase()) ||
              skill.toLowerCase().includes(strength.toLowerCase())
            )) {
              score += 3 // High weight for skill matches
              matches.push(`Has skill: ${skill}`)
            }
          })

          // Match learning: band.whatMembersWillLearn vs user.developmentPath
          band.whatMembersWillLearn.forEach(learning => {
            if (user.developmentPath.some(goal => 
              goal.toLowerCase().includes(learning.toLowerCase()) ||
              learning.toLowerCase().includes(goal.toLowerCase())
            )) {
              score += 2 // Medium weight for learning matches
              matches.push(`Wants to learn: ${learning}`)
            }
          })

          // Match values: band.values vs user.passions
          band.values.forEach(value => {
            if (user.passions.some(passion => 
              passion.toLowerCase().includes(value.toLowerCase()) ||
              value.toLowerCase().includes(passion.toLowerCase())
            )) {
              score += 1 // Lower weight for values/passions
              matches.push(`Shares value: ${value}`)
            }
          })

          return {
            ...user,
            matchScore: score,
            matches,
          }
        })
        .filter(user => user.matchScore > 0) // Only show users with at least one match
        .sort((a, b) => b.matchScore - a.matchScore) // Sort by score descending
        .slice(0, 10) // Top 10 matches

      return {
        success: true,
        users: scoredUsers,
      }
    }),
})