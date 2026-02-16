'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { Text, Button, Flex } from '@/components/ui'

interface OnboardingHintProps {
  bandId: string
  userId: string
  /** Which milestone steps this hint is relevant for */
  relevantSteps: number[]
}

export function OnboardingHint({ bandId, userId, relevantSteps }: OnboardingHintProps) {
  const [dismissed, setDismissed] = useState(false)

  const { data: onboarding, isLoading } = trpc.onboarding.getBandOnboarding.useQuery(
    { bandId, userId },
    { enabled: !!bandId && !!userId }
  )

  // Check localStorage for permanent dismissal
  useEffect(() => {
    const dismissedHints = localStorage.getItem(`onboarding-hints-${bandId}`)
    if (dismissedHints) {
      const dismissed = JSON.parse(dismissedHints)
      if (dismissed.includes(onboarding?.currentStep)) {
        setDismissed(true)
      }
    }
  }, [bandId, onboarding?.currentStep])

  // Don't show if loading, no onboarding, not active, or dismissed
  if (isLoading || !onboarding || onboarding.status !== 'ACTIVE' || dismissed) {
    return null
  }

  // Don't show if current step is not relevant to this page
  if (!relevantSteps.includes(onboarding.currentStep)) {
    return null
  }

  // Don't show if current milestone is already complete
  if (onboarding.currentMilestone?.isComplete) {
    return null
  }

  const currentMilestone = onboarding.currentMilestone

  if (!currentMilestone) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    // Save to localStorage to persist dismissal
    const dismissedHints = localStorage.getItem(`onboarding-hints-${bandId}`)
    const dismissed = dismissedHints ? JSON.parse(dismissedHints) : []
    if (!dismissed.includes(currentMilestone.step)) {
      dismissed.push(currentMilestone.step)
      localStorage.setItem(`onboarding-hints-${bandId}`, JSON.stringify(dismissed))
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <Flex justify="between" align="start" gap="md">
        <div className="flex-1">
          <Flex align="center" gap="sm" className="mb-1">
            <span className="text-lg">💡</span>
            <Text weight="semibold" className="text-blue-800">
              Step {currentMilestone.step}: {currentMilestone.title}
            </Text>
          </Flex>
          <Text variant="small" className="text-blue-700">
            {currentMilestone.description}
          </Text>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-blue-400 hover:text-blue-600 flex-shrink-0"
        >
          Got it
        </Button>
      </Flex>
    </div>
  )
}
