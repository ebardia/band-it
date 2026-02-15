'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { MIN_MEMBERS_TO_ACTIVATE } from '@band-it/shared'
import {
  Stack,
  Text,
  Button,
  Textarea,
  Alert,
  Input,
  Flex,
  useToast,
} from '@/components/ui'

interface DissolveBandSectionProps {
  bandId: string
  bandSlug: string
  bandName: string
  userId: string
}

export function DissolveBandSection({ bandId, bandSlug, bandName, userId }: DissolveBandSectionProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)
  const [showProposalForm, setShowProposalForm] = useState(false)
  const [reason, setReason] = useState('')
  const [confirmText, setConfirmText] = useState('')

  // Check if band can be dissolved
  const { data: canDissolveData, isLoading } = trpc.band.canDissolve.useQuery(
    { bandId, userId },
    { enabled: !!bandId && !!userId }
  )

  // Direct dissolution mutation
  const dissolveMutation = trpc.band.dissolve.useMutation({
    onSuccess: () => {
      showToast('Band has been dissolved', 'success')
      router.push('/bands/my-bands')
    },
    onError: (error) => {
      showToast(error.message, 'error')
      setShowConfirm(false)
    },
  })

  // Create dissolution proposal mutation
  const createProposalMutation = trpc.band.createDissolutionProposal.useMutation({
    onSuccess: (data) => {
      showToast('Dissolution proposal created', 'success')
      router.push(`/bands/${bandSlug}/proposals/${data.proposalId}`)
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  // Don't show if loading
  if (isLoading) {
    return null
  }

  // Don't show if can't dissolve at all
  if (!canDissolveData?.canDissolve) {
    return null
  }

  const handleDirectDissolve = () => {
    if (confirmText !== 'DISSOLVE') {
      showToast('Please type DISSOLVE to confirm', 'error')
      return
    }
    if (reason.trim().length < 10) {
      showToast('Please provide a reason (at least 10 characters)', 'error')
      return
    }
    dissolveMutation.mutate({
      bandId,
      userId,
      reason: reason.trim(),
    })
  }

  const handleCreateProposal = () => {
    if (reason.trim().length < 10) {
      showToast('Please provide a reason (at least 10 characters)', 'error')
      return
    }
    createProposalMutation.mutate({
      bandId,
      userId,
      reason: reason.trim(),
    })
  }

  // Direct dissolution UI (below minimum members, founder only)
  if (canDissolveData.method === 'DIRECT') {
    return (
      <div className="border border-red-200 rounded-lg bg-red-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <Text weight="semibold" className="text-red-800">Dissolve Band</Text>
          {!showConfirm && (
            <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>Dissolve</Button>
          )}
        </div>

        {!showConfirm ? (
          <Text variant="small" color="muted">
            Band has &lt;{MIN_MEMBERS_TO_ACTIVATE} members. As founder, you can dissolve directly.
          </Text>
        ) : (
          <Stack spacing="sm">
            <Alert variant="danger">
              <Text variant="small">Dissolve "{bandName}"? This cannot be undone.</Text>
            </Alert>

            <Textarea
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why? (min 10 chars)"
              rows={2}
              required
            />

            <Input
              label='Type "DISSOLVE"'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="DISSOLVE"
            />

            <Flex gap="sm" justify="end">
              <Button variant="ghost" size="sm" onClick={() => { setShowConfirm(false); setConfirmText('') }} disabled={dissolveMutation.isPending}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleDirectDissolve} disabled={dissolveMutation.isPending || confirmText !== 'DISSOLVE' || reason.trim().length < 10}>
                {dissolveMutation.isPending ? 'Dissolving...' : 'Dissolve'}
              </Button>
            </Flex>
          </Stack>
        )}
      </div>
    )
  }

  // Proposal-based dissolution UI (minimum or more members)
  if (canDissolveData.method === 'PROPOSAL') {
    // Check if there's already an active dissolution proposal
    if (canDissolveData.hasActiveProposal) {
      return (
        <div className="border border-yellow-200 rounded-lg bg-yellow-50 p-3">
          <div className="flex items-center justify-between">
            <Text weight="semibold" className="text-yellow-800">Dissolution in Progress</Text>
            <Button variant="secondary" size="sm" onClick={() => router.push(`/bands/${bandSlug}/proposals`)}>View</Button>
          </div>
        </div>
      )
    }

    return (
      <div className="border border-red-200 rounded-lg bg-red-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <Text weight="semibold" className="text-red-800">Dissolve Band</Text>
          {!showProposalForm && (
            <Button variant="danger" size="sm" onClick={() => setShowProposalForm(true)}>Create Proposal</Button>
          )}
        </div>

        {!showProposalForm ? (
          <Text variant="small" color="muted">Requires unanimous approval from all voting members.</Text>
        ) : (
          <Stack spacing="sm">
            <Alert variant="warning">
              <Text variant="small">Unanimous approval required.</Text>
            </Alert>

            <Textarea
              label="Why dissolve?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why (min 10 chars)"
              rows={2}
              required
            />

            <Flex gap="sm" justify="end">
              <Button variant="ghost" size="sm" onClick={() => { setShowProposalForm(false); setReason('') }} disabled={createProposalMutation.isPending}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleCreateProposal} disabled={createProposalMutation.isPending || reason.trim().length < 10}>
                {createProposalMutation.isPending ? 'Creating...' : 'Submit'}
              </Button>
            </Flex>
          </Stack>
        )}
      </div>
    )
  }

  return null
}
