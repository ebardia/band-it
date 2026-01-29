'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Stack,
  Heading,
  Text,
  Button,
  Card,
  Alert,
  Loading,
  Select,
  Input,
  Flex,
  useToast,
} from '@/components/ui'

interface GovernanceSettingsProps {
  bandId: string
  userId: string
}

const VOTING_METHODS = [
  { value: 'SIMPLE_MAJORITY', label: 'Simple Majority (>50%)' },
  { value: 'SUPERMAJORITY_66', label: 'Supermajority (>66%)' },
  { value: 'SUPERMAJORITY_75', label: 'Supermajority (>75%)' },
  { value: 'UNANIMOUS', label: 'Unanimous (100%)' },
]

export function GovernanceSettings({ bandId, userId }: GovernanceSettingsProps) {
  const { showToast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [votingMethod, setVotingMethod] = useState('')
  const [votingPeriodDays, setVotingPeriodDays] = useState(7)
  const [quorumPercentage, setQuorumPercentage] = useState(50)
  const [requireProposalReview, setRequireProposalReview] = useState(false)

  const utils = trpc.useUtils()

  const { data, isLoading, error } = trpc.band.getGovernanceSettings.useQuery(
    { bandId, userId },
    { enabled: !!bandId && !!userId }
  )

  const updateMutation = trpc.band.updateGovernanceSettings.useMutation({
    onSuccess: () => {
      showToast('Governance settings updated', 'success')
      setIsEditing(false)
      utils.band.getGovernanceSettings.invalidate({ bandId, userId })
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  // Initialize form values when data loads
  useEffect(() => {
    if (data?.settings) {
      setVotingMethod(data.settings.votingMethod)
      setVotingPeriodDays(data.settings.votingPeriodDays)
      setQuorumPercentage(data.settings.quorumPercentage)
      setRequireProposalReview(data.settings.requireProposalReview)
    }
  }, [data?.settings])

  const handleSave = () => {
    updateMutation.mutate({
      bandId,
      userId,
      votingMethod: votingMethod as any,
      votingPeriodDays,
      quorumPercentage,
      requireProposalReview,
    })
  }

  const handleCancel = () => {
    // Reset to original values
    if (data?.settings) {
      setVotingMethod(data.settings.votingMethod)
      setVotingPeriodDays(data.settings.votingPeriodDays)
      setQuorumPercentage(data.settings.quorumPercentage)
      setRequireProposalReview(data.settings.requireProposalReview)
    }
    setIsEditing(false)
  }

  if (isLoading) {
    return <Loading message="Loading governance settings..." />
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Text>Failed to load governance settings</Text>
      </Alert>
    )
  }

  if (!data) return null

  const { settings, canEdit } = data

  return (
    <Card>
      <Stack spacing="md">
        <Flex justify="between" align="center">
          <Heading level={3}>Governance Settings</Heading>
          {canEdit && !isEditing && (
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </Flex>

        {!canEdit && (
          <Alert variant="info">
            <Text variant="small">Only founders and governors can edit governance settings.</Text>
          </Alert>
        )}

        {isEditing ? (
          <Stack spacing="md">
            {/* Voting Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voting Method
              </label>
              <Select
                value={votingMethod}
                onChange={(e) => setVotingMethod(e.target.value)}
              >
                {VOTING_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </Select>
              <Text variant="small" color="muted" className="mt-1">
                How votes are counted to determine if a proposal passes.
              </Text>
            </div>

            {/* Voting Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voting Period (days)
              </label>
              <Input
                type="number"
                min={1}
                max={30}
                value={votingPeriodDays}
                onChange={(e) => setVotingPeriodDays(parseInt(e.target.value) || 1)}
              />
              <Text variant="small" color="muted" className="mt-1">
                How long members have to vote on proposals (1-30 days).
              </Text>
            </div>

            {/* Quorum Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quorum Percentage
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={quorumPercentage}
                onChange={(e) => setQuorumPercentage(parseInt(e.target.value) || 0)}
              />
              <Text variant="small" color="muted" className="mt-1">
                Minimum percentage of eligible voters that must participate for a vote to be valid.
              </Text>
            </div>

            {/* Require Proposal Review */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireProposalReview}
                  onChange={(e) => setRequireProposalReview(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Require proposal review before voting
                </span>
              </label>
              <Text variant="small" color="muted" className="mt-1 ml-6">
                When enabled, proposals must be approved by a moderator before they go to vote.
              </Text>
            </div>

            {/* Action Buttons */}
            <Flex gap="sm" className="pt-2">
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </Flex>
          </Stack>
        ) : (
          <Stack spacing="sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text variant="small" color="muted">Voting Method</Text>
                <Text weight="medium">
                  {VOTING_METHODS.find(m => m.value === settings.votingMethod)?.label || settings.votingMethod}
                </Text>
              </div>
              <div>
                <Text variant="small" color="muted">Voting Period</Text>
                <Text weight="medium">{settings.votingPeriodDays} days</Text>
              </div>
              <div>
                <Text variant="small" color="muted">Quorum</Text>
                <Text weight="medium">{settings.quorumPercentage}%</Text>
              </div>
              <div>
                <Text variant="small" color="muted">Proposal Review</Text>
                <Text weight="medium">{settings.requireProposalReview ? 'Required' : 'Not required'}</Text>
              </div>
            </div>
          </Stack>
        )}
      </Stack>
    </Card>
  )
}
