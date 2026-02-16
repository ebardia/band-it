import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../../lib/prisma'
import { TRPCError } from '@trpc/server'
import { getTemplate, getTemplateList, TOTAL_MILESTONES } from '../../lib/onboarding/templates'
import {
  createOnboarding,
  dismissOnboarding,
  calculateProgress,
  getBandMilestoneData,
  checkMilestoneComplete,
} from '../../lib/onboarding/milestones'

export const onboardingRouter = router({
  /**
   * Get user welcome state - for redirect logic
   */
  getUserWelcomeState: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          hasCompletedWelcome: true,
          memberships: {
            where: { status: 'ACTIVE' },
            select: { id: true },
            take: 1,
          },
        },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      const pendingInvitations = await prisma.pendingInvite.count({
        where: {
          email: (await prisma.user.findUnique({
            where: { id: input.userId },
            select: { email: true },
          }))?.email,
          expiresAt: { gt: new Date() },
          invalidatedAt: null,
        },
      })

      return {
        hasCompletedWelcome: user.hasCompletedWelcome,
        hasBands: user.memberships.length > 0,
        pendingInvitationCount: pendingInvitations,
      }
    }),

  /**
   * Mark welcome as complete
   */
  completeWelcome: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.user.update({
        where: { id: input.userId },
        data: { hasCompletedWelcome: true },
      })

      return { success: true }
    }),

  /**
   * Get available templates
   */
  getTemplates: publicProcedure.query(() => {
    return { templates: getTemplateList() }
  }),

  /**
   * Get template defaults for band creation
   */
  getTemplateDefaults: publicProcedure
    .input(z.object({ templateId: z.string() }))
    .query(({ input }) => {
      const template = getTemplate(input.templateId)
      return {
        suggestedMission: template.suggestedMission,
        suggestedValues: template.suggestedValues,
        suggestedVotingMethod: template.suggestedVotingMethod,
        suggestedVotingPeriodDays: template.suggestedVotingPeriodDays,
      }
    }),

  /**
   * Get band onboarding state
   */
  getBandOnboarding: publicProcedure
    .input(z.object({
      bandId: z.string(),
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      // Verify user is a member
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
        select: { status: true, role: true },
      })

      if (!membership || membership.status !== 'ACTIVE') {
        return null
      }

      const onboarding = await prisma.bandOnboarding.findUnique({
        where: { bandId: input.bandId },
      })

      if (!onboarding) {
        return null
      }

      const template = getTemplate(onboarding.templateId)
      const progress = await calculateProgress(input.bandId, onboarding.templateId)
      const milestoneData = await getBandMilestoneData(input.bandId)

      // Get current milestone details
      const currentMilestone = template.milestones[onboarding.currentStep]
      const isCurrentComplete = checkMilestoneComplete(
        onboarding.currentStep,
        milestoneData,
        template.memberThreshold
      )

      // Build milestone progress info
      const milestonesWithDetails = []
      for (let step = 1; step <= TOTAL_MILESTONES; step++) {
        const milestone = template.milestones[step]
        const isComplete = progress.completedSteps.includes(step) ||
          checkMilestoneComplete(step, milestoneData, template.memberThreshold)

        milestonesWithDetails.push({
          step,
          title: milestone.title,
          description: milestone.description,
          whyItMatters: milestone.whyItMatters,
          actionLabel: milestone.actionLabel,
          actionPath: milestone.actionPath,
          isComplete,
          isCurrent: step === onboarding.currentStep,
          celebration: milestone.celebration,
        })
      }

      return {
        id: onboarding.id,
        templateId: onboarding.templateId,
        templateName: template.name,
        templateEmoji: template.emoji,
        status: onboarding.status,
        currentStep: onboarding.currentStep,
        completedSteps: onboarding.completedSteps,
        percentComplete: progress.percentComplete,
        currentMilestone: currentMilestone
          ? {
              step: onboarding.currentStep,
              title: currentMilestone.title,
              description: currentMilestone.description,
              actionLabel: currentMilestone.actionLabel,
              actionPath: currentMilestone.actionPath,
              isComplete: isCurrentComplete,
            }
          : null,
        milestones: milestonesWithDetails,
        isFounder: membership.role === 'FOUNDER',
        memberThreshold: template.memberThreshold,
        currentMemberCount: milestoneData.memberCount,
      }
    }),

  /**
   * Initialize onboarding for a band
   */
  initializeOnboarding: publicProcedure
    .input(z.object({
      bandId: z.string(),
      templateId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Verify user is founder
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
        select: { role: true },
      })

      if (!membership || membership.role !== 'FOUNDER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only founders can initialize onboarding',
        })
      }

      await createOnboarding(input.bandId, input.templateId)

      return { success: true }
    }),

  /**
   * Dismiss onboarding
   */
  dismissOnboarding: publicProcedure
    .input(z.object({
      bandId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Verify user is founder
      const membership = await prisma.member.findUnique({
        where: {
          userId_bandId: {
            userId: input.userId,
            bandId: input.bandId,
          },
        },
        select: { role: true },
      })

      if (!membership || membership.role !== 'FOUNDER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only founders can dismiss onboarding',
        })
      }

      await dismissOnboarding(input.bandId)

      return { success: true }
    }),

  /**
   * Check and advance onboarding (called after relevant actions)
   */
  checkProgress: publicProcedure
    .input(z.object({ bandId: z.string() }))
    .mutation(async ({ input }) => {
      const onboarding = await prisma.bandOnboarding.findUnique({
        where: { bandId: input.bandId },
      })

      if (!onboarding || onboarding.status !== 'ACTIVE') {
        return { advanced: false }
      }

      const template = getTemplate(onboarding.templateId)
      const data = await getBandMilestoneData(input.bandId)
      const currentStep = onboarding.currentStep

      // Check if current milestone is complete
      const isComplete = checkMilestoneComplete(currentStep, data, template.memberThreshold)

      if (!isComplete || onboarding.completedSteps.includes(currentStep)) {
        return { advanced: false }
      }

      const newCompletedSteps = [...onboarding.completedSteps, currentStep]
      const nextStep = currentStep + 1
      const isFullyComplete = currentStep >= TOTAL_MILESTONES

      // Update onboarding
      await prisma.bandOnboarding.update({
        where: { bandId: input.bandId },
        data: {
          completedSteps: newCompletedSteps,
          currentStep: isFullyComplete ? currentStep : nextStep,
          ...(isFullyComplete
            ? {
                status: 'COMPLETED',
                completedAt: new Date(),
              }
            : {}),
        },
      })

      // Log the event
      await prisma.onboardingEvent.create({
        data: {
          bandId: input.bandId,
          eventType: 'milestone_completed',
          milestoneStep: currentStep,
        },
      })

      // Get celebration message
      const milestone = template.milestones[currentStep]

      return {
        advanced: true,
        completedStep: currentStep,
        celebration: milestone?.celebration,
        newStep: isFullyComplete ? undefined : nextStep,
        isFullyComplete,
      }
    }),
})
