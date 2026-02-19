'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Stack,
  Text,
  Button,
  Flex,
  useToast,
  Box,
} from '@/components/ui'
import { TemplateSelector } from '@/components/onboarding'

interface OnboardingSettingsProps {
  bandId: string
  userId: string
  userRole?: string
}

export function OnboardingSettings({ bandId, userId, userRole }: OnboardingSettingsProps) {
  const { showToast } = useToast()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const utils = trpc.useUtils()

  // Check if onboarding already exists
  const { data: onboarding, isLoading } = trpc.onboarding.getBandOnboarding.useQuery(
    { bandId, userId },
    { enabled: !!bandId && !!userId }
  )

  // Initialize onboarding mutation
  const initializeMutation = trpc.onboarding.initializeOnboarding.useMutation({
    onSuccess: () => {
      showToast('Onboarding guide activated!', 'success')
      utils.onboarding.getBandOnboarding.invalidate({ bandId, userId })
      setShowTemplateSelector(false)
      setSelectedTemplate(null)
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  // Only founders can initialize onboarding
  if (userRole !== 'FOUNDER') {
    return null
  }

  // Don't show if loading
  if (isLoading) {
    return null
  }

  // If onboarding already exists and is active or completed, show status
  if (onboarding) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <Flex justify="between" align="center">
          <div>
            <Text weight="semibold">Onboarding Guide</Text>
            <Text variant="small" color="muted">
              {onboarding.status === 'ACTIVE'
                ? `${onboarding.templateEmoji} ${onboarding.templateName} - ${onboarding.percentComplete}% complete`
                : onboarding.status === 'COMPLETED'
                  ? `${onboarding.templateEmoji} ${onboarding.templateName} - Completed!`
                  : `${onboarding.templateEmoji} ${onboarding.templateName} - Dismissed`
              }
            </Text>
          </div>
          {onboarding.status === 'DISMISSED' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTemplateSelector(true)}
            >
              Restart
            </Button>
          )}
        </Flex>

        {showTemplateSelector && (
          <Box className="mt-4 pt-4 border-t border-gray-200">
            <Stack spacing="md">
              <Text variant="small" weight="semibold">Select a new template:</Text>
              <TemplateSelector
                selectedTemplate={selectedTemplate}
                onSelect={setSelectedTemplate}
              />
              <Flex gap="sm" justify="end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowTemplateSelector(false)
                    setSelectedTemplate(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedTemplate || initializeMutation.isPending}
                  onClick={() => {
                    if (selectedTemplate) {
                      initializeMutation.mutate({ bandId, userId, templateId: selectedTemplate })
                    }
                  }}
                >
                  {initializeMutation.isPending ? 'Activating...' : 'Activate Guide'}
                </Button>
              </Flex>
            </Stack>
          </Box>
        )}
      </div>
    )
  }

  // No onboarding exists - show option to initialize
  return (
    <div className="border border-blue-200 rounded-lg bg-blue-50 p-4">
      <Flex justify="between" align="start" className="mb-3">
        <div>
          <Text weight="semibold" className="text-blue-800">Setup Guide</Text>
          <Text variant="small" color="muted">
            Get step-by-step guidance to set up your band with milestones and celebrations.
          </Text>
        </div>
        {!showTemplateSelector && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowTemplateSelector(true)}
          >
            Activate
          </Button>
        )}
      </Flex>

      {showTemplateSelector && (
        <Stack spacing="md">
          <Text variant="small" weight="semibold">What kind of group are you organizing?</Text>
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onSelect={setSelectedTemplate}
          />
          <Flex gap="sm" justify="end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowTemplateSelector(false)
                setSelectedTemplate(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedTemplate || initializeMutation.isPending}
              onClick={() => {
                if (selectedTemplate) {
                  initializeMutation.mutate({ bandId, userId, templateId: selectedTemplate })
                }
              }}
            >
              {initializeMutation.isPending ? 'Activating...' : 'Activate Guide'}
            </Button>
          </Flex>
        </Stack>
      )}
    </div>
  )
}
