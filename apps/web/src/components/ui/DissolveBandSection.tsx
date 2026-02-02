'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { MIN_MEMBERS_TO_ACTIVATE } from '@band-it/shared'
import {
  Stack,
  Heading,
  Text,
  Button,
  Textarea,
  Alert,
  Card,
  Input,
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
      <Card className="border-red-200 bg-red-50">
        <Stack spacing="md">
          <Heading level={3} className="text-red-800">Dissolve Band</Heading>

          {!showConfirm ? (
            <>
              <Alert variant="warning">
                <Text>This band has fewer than {MIN_MEMBERS_TO_ACTIVATE} active member{MIN_MEMBERS_TO_ACTIVATE === 1 ? '' : 's'}.</Text>
              </Alert>

              <Text color="muted">
                As founder, you can dissolve this band directly since it has fewer than {MIN_MEMBERS_TO_ACTIVATE} member{MIN_MEMBERS_TO_ACTIVATE === 1 ? '' : 's'}.
              </Text>

              <Text variant="small" color="muted">
                This will:
              </Text>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Cancel the Band It subscription (if any)</li>
                <li>Cancel all member dues subscriptions</li>
                <li>Delete all band content (proposals, projects, tasks, events)</li>
                <li>Invalidate pending invitations</li>
                <li>Notify all current members</li>
              </ul>

              <Button
                variant="danger"
                onClick={() => setShowConfirm(true)}
              >
                Dissolve Band
              </Button>
            </>
          ) : (
            <>
              <Alert variant="danger">
                <Text weight="semibold">Are you sure you want to dissolve "{bandName}"?</Text>
                <Text variant="small">This action cannot be undone.</Text>
              </Alert>

              <Textarea
                label="Reason (required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you dissolving this band? (minimum 10 characters)"
                rows={3}
                required
              />

              <Input
                label='Type "DISSOLVE" to confirm'
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="DISSOLVE"
              />

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowConfirm(false)
                    setConfirmText('')
                  }}
                  disabled={dissolveMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDirectDissolve}
                  disabled={dissolveMutation.isPending || confirmText !== 'DISSOLVE' || reason.trim().length < 10}
                >
                  {dissolveMutation.isPending ? 'Dissolving...' : 'Dissolve Band'}
                </Button>
              </div>
            </>
          )}
        </Stack>
      </Card>
    )
  }

  // Proposal-based dissolution UI (minimum or more members)
  if (canDissolveData.method === 'PROPOSAL') {
    // Check if there's already an active dissolution proposal
    if (canDissolveData.hasActiveProposal) {
      return (
        <Card className="border-yellow-200 bg-yellow-50">
          <Stack spacing="md">
            <Heading level={3} className="text-yellow-800">Dissolution in Progress</Heading>
            <Alert variant="warning">
              <Text>A dissolution proposal is already in progress for this band.</Text>
            </Alert>
            <Button
              variant="secondary"
              onClick={() => router.push(`/bands/${bandSlug}/proposals`)}
            >
              View Proposals
            </Button>
          </Stack>
        </Card>
      )
    }

    return (
      <Card className="border-red-200 bg-red-50">
        <Stack spacing="md">
          <Heading level={3} className="text-red-800">Dissolve Band</Heading>

          {!showProposalForm ? (
            <>
              <Text color="muted">
                To dissolve this band, you must create a dissolution proposal.
                The proposal requires unanimous approval — every voting member must vote YES for it to pass.
              </Text>

              <Text variant="small" color="muted">
                If approved:
              </Text>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Band It subscription will be canceled</li>
                <li>All member dues subscriptions will be canceled</li>
                <li>All band content will be deleted</li>
                <li>Pending invitations will be invalidated</li>
              </ul>

              <Button
                variant="danger"
                onClick={() => setShowProposalForm(true)}
              >
                Create Dissolution Proposal
              </Button>
            </>
          ) : (
            <>
              <Alert variant="warning">
                <Text weight="semibold">Create Dissolution Proposal</Text>
                <Text variant="small">This requires unanimous approval from all voting members.</Text>
              </Alert>

              <Textarea
                label="Why should this band be dissolved?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you're proposing to dissolve this band (minimum 10 characters)"
                rows={4}
                required
              />

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowProposalForm(false)
                    setReason('')
                  }}
                  disabled={createProposalMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleCreateProposal}
                  disabled={createProposalMutation.isPending || reason.trim().length < 10}
                >
                  {createProposalMutation.isPending ? 'Creating...' : 'Submit Proposal'}
                </Button>
              </div>
            </>
          )}
        </Stack>
      </Card>
    )
  }

  return null
}
