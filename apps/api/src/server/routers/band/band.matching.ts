import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { prisma } from '../../../lib/prisma'

// Types for matching
interface MatchResult {
  bandId: string
  score: number
  matchReasons: string[]
}

interface UserProfile {
  zipcode: string | null
  strengths: string[]
  passions: string[]
  developmentPath: string[]
}

interface BandProfile {
  id: string
  zipcode: string | null
  values: string[]
  skillsLookingFor: string[]
  whatMembersWillLearn: string[]
}

// Helper: normalize string for comparison
const normalize = (s: string) => s.toLowerCase().trim()

// Helper: check if two strings match (exact or word-level)
const stringsMatch = (a: string, b: string): boolean => {
  const normA = normalize(a)
  const normB = normalize(b)

  // Exact match
  if (normA === normB) return true

  // Word-level match (any word in common)
  const wordsA = normA.split(/\s+/)
  const wordsB = normB.split(/\s+/)
  return wordsA.some(wordA =>
    wordsB.some(wordB => wordA === wordB && wordA.length > 2)
  )
}

// Helper: check if arrays have matching items
const findMatches = (userItems: string[], bandItems: string[]): string[] => {
  const matches: string[] = []
  for (const userItem of userItems) {
    for (const bandItem of bandItems) {
      if (stringsMatch(userItem, bandItem)) {
        matches.push(bandItem)
        break // Only count each band item once
      }
    }
  }
  return matches
}

// Helper: check if zipcodes are in the same region (first 3 digits)
const sameRegion = (zip1: string, zip2: string): boolean => {
  return zip1.substring(0, 3) === zip2.substring(0, 3)
}

// Main matching function
function calculateMatchScore(user: UserProfile, band: BandProfile): MatchResult {
  const scores = {
    location: 0,
    skills: 0,
    learning: 0,
    values: 0
  }
  const matchReasons: string[] = []

  // 1. Location match (exact or nearby) - 25% weight
  if (user.zipcode && band.zipcode) {
    if (user.zipcode === band.zipcode) {
      scores.location = 100
      matchReasons.push('📍 In your area')
    } else if (sameRegion(user.zipcode, band.zipcode)) {
      scores.location = 50
      matchReasons.push('📍 Near your area')
    }
  }

  // 2. Skills match (user has skills band needs) - 30% weight
  if (user.strengths?.length && band.skillsLookingFor?.length) {
    const matchedSkills = findMatches(user.strengths, band.skillsLookingFor)
    if (matchedSkills.length > 0) {
      scores.skills = (matchedSkills.length / band.skillsLookingFor.length) * 100
      matchReasons.push(`🎯 Needs your skills: ${matchedSkills.slice(0, 2).join(', ')}`)
    }
  }

  // 3. Learning match (band offers what user wants to learn) - 25% weight
  if (user.developmentPath?.length && band.whatMembersWillLearn?.length) {
    const matchedLearning = findMatches(user.developmentPath, band.whatMembersWillLearn)
    if (matchedLearning.length > 0) {
      scores.learning = (matchedLearning.length / user.developmentPath.length) * 100
      matchReasons.push(`📚 Learn: ${matchedLearning.slice(0, 2).join(', ')}`)
    }
  }

  // 4. Values/Passions match - 20% weight
  if (user.passions?.length && band.values?.length) {
    const matchedValues = findMatches(user.passions, band.values)
    if (matchedValues.length > 0) {
      scores.values = (matchedValues.length / Math.max(user.passions.length, band.values.length)) * 100
      matchReasons.push(`❤️ Shared values: ${matchedValues.slice(0, 2).join(', ')}`)
    }
  }

  // Calculate weighted total
  const totalScore =
    (scores.location * 0.25) +
    (scores.skills * 0.30) +
    (scores.learning * 0.25) +
    (scores.values * 0.20)

  return {
    bandId: band.id,
    score: Math.round(totalScore),
    matchReasons
  }
}

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

  /**
   * Get recommended bands for a user based on profile matching
   */
  getRecommendedBands: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(20).default(6),
      })
    )
    .query(async ({ input }) => {
      // Get user profile
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          zipcode: true,
          strengths: true,
          passions: true,
          developmentPath: true,
        },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Check if user has filled out their profile
      const hasProfile = user.zipcode ||
        user.strengths.length > 0 ||
        user.passions.length > 0 ||
        user.developmentPath.length > 0

      // Get user's current band memberships
      const userMemberships = await prisma.member.findMany({
        where: { userId: input.userId },
        select: { bandId: true },
      })
      const userBandIds = userMemberships.map(m => m.bandId)

      // Get user's pending applications
      const pendingApplications = await prisma.member.findMany({
        where: {
          userId: input.userId,
          status: 'PENDING',
        },
        select: { bandId: true },
      })
      const pendingBandIds = pendingApplications.map(m => m.bandId)

      // Combine all bands to exclude
      const excludeBandIds = [...userBandIds, ...pendingBandIds]

      // Get eligible bands
      const bands = await prisma.band.findMany({
        where: {
          id: { notIn: excludeBandIds.length > 0 ? excludeBandIds : undefined },
          status: 'ACTIVE',
          dissolvedAt: null,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          zipcode: true,
          values: true,
          skillsLookingFor: true,
          whatMembersWillLearn: true,
          status: true,
          _count: {
            select: { members: true },
          },
        },
      })

      // If user has no profile, return top bands by member count as fallback
      if (!hasProfile) {
        const fallbackBands = bands
          .sort((a, b) => b._count.members - a._count.members)
          .slice(0, input.limit)
          .map(band => ({
            band: {
              id: band.id,
              name: band.name,
              slug: band.slug,
              description: band.description,
              memberCount: band._count.members,
              status: band.status,
            },
            matchScore: 0,
            matchReasons: [] as string[],
          }))

        return {
          recommendations: fallbackBands,
          hasProfile: false,
          message: 'Complete your profile (zipcode, strengths, passions, learning goals) to get personalized recommendations.',
        }
      }

      // Score and rank bands
      const scoredBands = bands
        .map(band => {
          const result = calculateMatchScore(user, {
            id: band.id,
            zipcode: band.zipcode,
            values: band.values,
            skillsLookingFor: band.skillsLookingFor,
            whatMembersWillLearn: band.whatMembersWillLearn,
          })
          return {
            band: {
              id: band.id,
              name: band.name,
              slug: band.slug,
              description: band.description,
              memberCount: band._count.members,
              status: band.status,
            },
            matchScore: result.score,
            matchReasons: result.matchReasons,
          }
        })
        .filter(result => result.matchScore >= 15) // Minimum 15% match
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, input.limit)

      // If no matches found, return top bands by member count
      if (scoredBands.length === 0) {
        const fallbackBands = bands
          .sort((a, b) => b._count.members - a._count.members)
          .slice(0, input.limit)
          .map(band => ({
            band: {
              id: band.id,
              name: band.name,
              slug: band.slug,
              description: band.description,
              memberCount: band._count.members,
              status: band.status,
            },
            matchScore: 0,
            matchReasons: [] as string[],
          }))

        return {
          recommendations: fallbackBands,
          hasProfile: true,
          message: 'No strong matches found based on your location, skills, learning goals, and passions. Showing popular bands instead.',
        }
      }

      return {
        recommendations: scoredBands,
        hasProfile: true,
        message: null,
      }
    }),
})