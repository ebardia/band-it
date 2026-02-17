'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Text, Button, Flex, useToast } from '@/components/ui'
import { OnboardingCelebration } from './OnboardingCelebration'

interface OnboardingBannerProps {
  bandId: string
  bandSlug: string
  userId: string
}

// Key for storing last celebrated step in localStorage
const getLastCelebratedKey = (bandId: string) => `onboarding-last-celebrated-${bandId}`

export function OnboardingBanner({ bandId, bandSlug, userId }: OnboardingBannerProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [celebration, setCelebration] = useState<{
    message: string
    completedStep: number
    nextStep?: number
    isFullyComplete: boolean
  } | null>(null)

  const { data: onboarding, isLoading, refetch } = trpc.onboarding.getBandOnboarding.useQuery(
    { bandId, userId },
    {
      enabled: !!bandId && !!userId,
      // Refetch every 30 seconds to catch milestone completions
      refetchInterval: 30000,
    }
  )

  // Check for celebration when onboarding data changes
  useEffect(() => {
    if (!onboarding || onboarding.status !== 'ACTIVE') return

    // Get the last celebrated step from localStorage
    const lastCelebratedKey = getLastCelebratedKey(bandId)
    const lastCelebrated = parseInt(localStorage.getItem(lastCelebratedKey) || '0', 10)

    // Find any completed steps that haven't been celebrated yet
    const completedSteps = onboarding.completedSteps || []
    const newlyCompletedSteps = completedSteps.filter((step: number) => step > lastCelebrated)

    if (newlyCompletedSteps.length > 0) {
      // Get the most recently completed step
      const latestStep = Math.max(...newlyCompletedSteps)
      const milestone = onboarding.milestones.find((m: any) => m.step === latestStep)

      if (milestone && milestone.celebration) {
        setCelebration({
          message: milestone.celebration,
          completedStep: latestStep,
          nextStep: latestStep < 10 ? latestStep + 1 : undefined,
          isFullyComplete: latestStep === 10,
        })
      }

      // Update the last celebrated step
      localStorage.setItem(lastCelebratedKey, String(latestStep))
    }
  }, [onboarding, bandId])

  const handleCelebrationClose = useCallback(() => {
    setCelebration(null)
  }, [])

  const dismissMutation = trpc.onboarding.dismissOnboarding.useMutation({
    onSuccess: () => {
      showToast('Onboarding dismissed', 'success')
      refetch()
    },
  })

  // Don't show if loading, no onboarding, or not active
  if (isLoading || !onboarding || onboarding.status !== 'ACTIVE') {
    return null
  }

  const { currentMilestone, percentComplete, templateEmoji } = onboarding

  const handleAction = () => {
    if (!currentMilestone?.actionPath) return

    // Navigate to the action path
    if (currentMilestone.actionPath.startsWith('/')) {
      router.push(`/bands/${bandSlug}${currentMilestone.actionPath}`)
    }
  }

  const handleDismiss = () => {
    if (window.confirm('Are you sure you want to dismiss onboarding? You can always access setup guides in the band settings.')) {
      dismissMutation.mutate({ bandId, userId })
    }
  }

  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <Flex justify="between" align="center" gap="md" className="flex-wrap">
            {/* Progress indicator */}
            <Flex align="center" gap="md" className="flex-1 min-w-0">
              <span className="text-2xl">{templateEmoji}</span>
              <div className="flex-1 min-w-0">
                <Flex align="center" gap="sm" className="flex-wrap">
                  <Text weight="semibold" className="truncate">
                    {currentMilestone?.title || 'Getting Started'}
                  </Text>
                  <span className="text-sm text-gray-500">•</span>
                  <Text variant="small" color="muted">
                    {percentComplete}% complete
                  </Text>
                </Flex>
                {/* Progress bar */}
                <div className="h-1.5 bg-gray-200 rounded-full mt-1.5 max-w-xs">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
              </div>
            </Flex>

            {/* Actions */}
            <Flex gap="sm" className="flex-shrink-0">
              {currentMilestone?.actionPath && !currentMilestone.isComplete && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAction}
                >
                  {currentMilestone.actionLabel}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProgressModal(true)}
              >
                View Progress
              </Button>
              {onboarding.isFounder && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </Button>
              )}
            </Flex>
          </Flex>
        </div>
      </div>

      {/* Progress Modal */}
      {showProgressModal && (
        <OnboardingProgressModal
          onboarding={onboarding}
          bandSlug={bandSlug}
          onClose={() => setShowProgressModal(false)}
        />
      )}

      {/* Celebration Modal */}
      {celebration && (
        <OnboardingCelebration
          celebration={celebration.message}
          completedStep={celebration.completedStep}
          nextStep={celebration.nextStep}
          isFullyComplete={celebration.isFullyComplete}
          onClose={handleCelebrationClose}
        />
      )}
    </>
  )
}

interface OnboardingProgressModalProps {
  onboarding: any
  bandSlug: string
  onClose: () => void
}

function OnboardingProgressModal({ onboarding, bandSlug, onClose }: OnboardingProgressModalProps) {
  const router = useRouter()

  const handleMilestoneClick = (milestone: any) => {
    if (milestone.actionPath && !milestone.isComplete) {
      router.push(`/bands/${bandSlug}${milestone.actionPath}`)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <Flex justify="between" align="start">
            <div>
              <Flex align="center" gap="sm">
                <span className="text-3xl">{onboarding.templateEmoji}</span>
                <Text weight="bold" className="text-xl">{onboarding.templateName}</Text>
              </Flex>
              <Text color="muted" className="mt-1">
                {onboarding.percentComplete}% complete
              </Text>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </Flex>
          {/* Progress bar */}
          <div className="h-2 bg-gray-200 rounded-full mt-4">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${onboarding.percentComplete}%` }}
            />
          </div>
        </div>

        {/* Milestones list */}
        <div className="overflow-y-auto max-h-96 p-4">
          <div className="space-y-2">
            {onboarding.milestones.map((milestone: any) => (
              <button
                key={milestone.step}
                onClick={() => handleMilestoneClick(milestone)}
                disabled={milestone.isComplete}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  milestone.isCurrent
                    ? 'border-blue-300 bg-blue-50'
                    : milestone.isComplete
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Flex align="start" gap="md">
                  {/* Status icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    milestone.isComplete
                      ? 'bg-green-500 text-white'
                      : milestone.isCurrent
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {milestone.isComplete ? '✓' : milestone.step}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <Text weight="semibold" className={milestone.isComplete ? 'text-green-700' : ''}>
                      {milestone.title}
                    </Text>
                    <Text variant="small" color="muted" className="mt-0.5">
                      {milestone.description}
                    </Text>
                    {milestone.isCurrent && !milestone.isComplete && milestone.actionLabel && (
                      <div className="mt-2">
                        <span className="inline-block px-3 py-1 bg-blue-500 text-white text-sm rounded-full">
                          {milestone.actionLabel} →
                        </span>
                      </div>
                    )}
                  </div>
                </Flex>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <Flex justify="between" align="center">
            <Text variant="small" color="muted">
              {onboarding.currentMemberCount} member{onboarding.currentMemberCount !== 1 ? 's' : ''} • Goal: {onboarding.memberThreshold}+
            </Text>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </Flex>
        </div>
      </div>
    </div>
  )
}
