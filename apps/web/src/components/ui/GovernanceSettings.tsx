'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Stack,
  Text,
  Button,
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
    <div className="border border-gray-200 rounded-lg bg-white p-3">
      <div className="flex justify-between items-center mb-2">
        <Text weight="semibold">Governance Settings</Text>
        {canEdit && !isEditing && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
        )}
      </div>

      {!canEdit && (
        <Text variant="small" color="muted" className="mb-2">View only</Text>
      )}

      {isEditing ? (
        <Stack spacing="sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Voting Method</label>
              <Select value={votingMethod} onChange={(e) => setVotingMethod(e.target.value)}>
                {VOTING_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Voting Period (days)</label>
              <Input
                type="number"
                min={1}
                max={30}
                value={votingPeriodDays}
                onChange={(e) => setVotingPeriodDays(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Quorum %</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={quorumPercentage}
                onChange={(e) => setQuorumPercentage(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={requireProposalReview}
                  onChange={(e) => setRequireProposalReview(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                Require review
              </label>
            </div>
          </div>
          <Flex gap="sm" justify="end" className="pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={updateMutation.isPending}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </Flex>
        </Stack>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span><span className="text-gray-500">Method:</span> {VOTING_METHODS.find(m => m.value === settings.votingMethod)?.label.split(' ')[0]}</span>
          <span><span className="text-gray-500">Period:</span> {settings.votingPeriodDays}d</span>
          <span><span className="text-gray-500">Quorum:</span> {settings.quorumPercentage}%</span>
          <span><span className="text-gray-500">Review:</span> {settings.requireProposalReview ? 'Yes' : 'No'}</span>
        </div>
      )}
    </div>
  )
}
