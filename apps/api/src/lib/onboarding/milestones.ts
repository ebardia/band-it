import { prisma } from '../prisma'
import { getTemplate, TOTAL_MILESTONES } from './templates'
import { notificationService } from '../../services/notification.service'

export interface BandMilestoneData {
  memberCount: number
  hasMessage: boolean
  governanceSettingsUpdated: boolean
  proposalCount: number
  hasPassedProposal: boolean
  projectCount: number
  hasCompletedTask: boolean
  documentCount: number
  mission: string | null
}

export async function getBandMilestoneData(bandId: string): Promise<BandMilestoneData> {
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: {
      mission: true,
      governanceSettingsUpdated: true,
      _count: {
        select: {
          members: { where: { status: 'ACTIVE' } },
          proposals: true,
          projects: true,
          documents: { where: { deletedAt: null } },
        },
      },
      proposals: {
        where: { status: 'APPROVED' },
        select: { id: true },
        take: 1,
      },
      tasks: {
        where: { status: 'COMPLETED' },
        select: { id: true },
        take: 1,
      },
      channels: {
        select: {
          _count: {
            select: { messages: true },
          },
        },
      },
    },
  })

  if (!band) {
    throw new Error('Band not found')
  }

  const hasMessage = band.channels.some(c => c._count.messages > 0)

  return {
    memberCount: band._count.members,
    hasMessage,
    governanceSettingsUpdated: band.governanceSettingsUpdated,
    proposalCount: band._count.proposals,
    hasPassedProposal: band.proposals.length > 0,
    projectCount: band._count.projects,
    hasCompletedTask: band.tasks.length > 0,
    documentCount: band._count.documents,
    mission: band.mission,
  }
}

export function checkMilestoneComplete(
  step: number,
  data: BandMilestoneData,
  memberThreshold: number
): boolean {
  switch (step) {
    case 1:
      return true // Band exists
    case 2:
      return !!data.mission?.trim()
    case 3:
      return data.memberCount >= memberThreshold
    case 4:
      return data.hasMessage
    case 5:
      return data.governanceSettingsUpdated
    case 6:
      return data.proposalCount >= 1
    case 7:
      return data.hasPassedProposal
    case 8:
      return data.projectCount >= 1
    case 9:
      return data.hasCompletedTask
    case 10:
      return data.documentCount >= 1
    default:
      return false
  }
}

export async function checkAndAdvanceOnboarding(bandId: string): Promise<{
  advanced: boolean
  completedStep?: number
  newStep?: number
  isFullyComplete?: boolean
}> {
  const onboarding = await prisma.bandOnboarding.findUnique({
    where: { bandId },
  })

  if (!onboarding || onboarding.status !== 'ACTIVE') {
    return { advanced: false }
  }

  const template = getTemplate(onboarding.templateId)
  const data = await getBandMilestoneData(bandId)
  const currentStep = onboarding.currentStep

  // Check if current milestone is complete
  const isComplete = checkMilestoneComplete(currentStep, data, template.memberThreshold)

  if (!isComplete) {
    return { advanced: false }
  }

  // Already completed this step
  if (onboarding.completedSteps.includes(currentStep)) {
    return { advanced: false }
  }

  const newCompletedSteps = [...onboarding.completedSteps, currentStep]
  const nextStep = currentStep + 1
  const isFullyComplete = currentStep >= TOTAL_MILESTONES

  // Update onboarding
  await prisma.bandOnboarding.update({
    where: { bandId },
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
      bandId,
      eventType: 'milestone_completed',
      milestoneStep: currentStep,
    },
  })

  // Get the band details and founder for notification
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: {
      name: true,
      slug: true,
      members: {
        where: { role: 'FOUNDER', status: 'ACTIVE' },
        select: { userId: true },
      },
    },
  })

  if (band) {
    const milestone = template.milestones[currentStep]
    const milestoneTitle = milestone?.title || `Step ${currentStep}`

    // Notify the founder(s)
    for (const founder of band.members) {
      await notificationService.create({
        userId: founder.userId,
        type: isFullyComplete ? 'ONBOARDING_COMPLETED' : 'ONBOARDING_MILESTONE_COMPLETED',
        title: isFullyComplete
          ? `🎉 ${band.name} onboarding complete!`
          : `✨ Milestone completed: ${milestoneTitle}`,
        message: isFullyComplete
          ? `Congratulations! Your band has completed all onboarding milestones.`
          : `Your band completed "${milestoneTitle}". ${nextStep ? `Next up: Step ${nextStep}.` : ''}`,
        actionUrl: `/bands/${band.slug}`,
        priority: 'MEDIUM',
        bandId,
        relatedType: 'BandOnboarding',
        relatedId: bandId,
      })
    }
  }

  return {
    advanced: true,
    completedStep: currentStep,
    newStep: isFullyComplete ? undefined : nextStep,
    isFullyComplete,
  }
}

export async function calculateProgress(bandId: string, templateId: string): Promise<{
  currentStep: number
  completedSteps: number[]
  percentComplete: number
  milestoneStatuses: Array<{
    step: number
    isComplete: boolean
    isCurrent: boolean
  }>
}> {
  const onboarding = await prisma.bandOnboarding.findUnique({
    where: { bandId },
  })

  if (!onboarding) {
    return {
      currentStep: 1,
      completedSteps: [],
      percentComplete: 0,
      milestoneStatuses: [],
    }
  }

  const template = getTemplate(templateId)
  const data = await getBandMilestoneData(bandId)

  const milestoneStatuses = []
  for (let step = 1; step <= TOTAL_MILESTONES; step++) {
    const isComplete = onboarding.completedSteps.includes(step) ||
      checkMilestoneComplete(step, data, template.memberThreshold)
    milestoneStatuses.push({
      step,
      isComplete,
      isCurrent: step === onboarding.currentStep,
    })
  }

  const completedCount = milestoneStatuses.filter(m => m.isComplete).length
  const percentComplete = Math.round((completedCount / TOTAL_MILESTONES) * 100)

  return {
    currentStep: onboarding.currentStep,
    completedSteps: onboarding.completedSteps,
    percentComplete,
    milestoneStatuses,
  }
}

export async function createOnboarding(bandId: string, templateId: string): Promise<void> {
  // Check if onboarding already exists
  const existing = await prisma.bandOnboarding.findUnique({
    where: { bandId },
  })

  if (existing) {
    return
  }

  await prisma.bandOnboarding.create({
    data: {
      bandId,
      templateId,
      currentStep: 2, // Step 1 is auto-completed (band exists)
      completedSteps: [1],
    },
  })

  // Log creation event
  await prisma.onboardingEvent.create({
    data: {
      bandId,
      eventType: 'milestone_completed',
      milestoneStep: 1,
    },
  })
}

export async function dismissOnboarding(bandId: string): Promise<void> {
  await prisma.bandOnboarding.update({
    where: { bandId },
    data: {
      status: 'DISMISSED',
      dismissedAt: new Date(),
    },
  })

  await prisma.onboardingEvent.create({
    data: {
      bandId,
      eventType: 'dismissed',
    },
  })
}
