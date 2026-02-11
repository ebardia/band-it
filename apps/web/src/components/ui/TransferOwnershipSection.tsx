'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Stack,
  Heading,
  Text,
  Button,
  Alert,
  Card,
  Input,
  useToast,
} from '@/components/ui'

interface TransferOwnershipSectionProps {
  bandId: string
  bandSlug: string
  bandName: string
  userId: string
  userRole: string
}

export function TransferOwnershipSection({ bandId, bandSlug, bandName, userId, userRole }: TransferOwnershipSectionProps) {
  const { showToast } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const utils = trpc.useUtils()

  // Only show for FOUNDER
  if (userRole !== 'FOUNDER') {
    return null
  }

  // Fetch band members
  const { data: membersData, isLoading } = trpc.band.getMembers.useQuery(
    { bandId },
    { enabled: !!bandId }
  )

  // Transfer ownership mutation
  const transferMutation = trpc.band.transferOwnership.useMutation({
    onSuccess: (data) => {
      showToast(`Ownership transferred to ${data.newFounderName}`, 'success')
      setShowConfirm(false)
      setSelectedMemberId('')
      setConfirmText('')
      // Invalidate to refresh data
      utils.band.getBySlug.invalidate({ slug: bandSlug })
      utils.band.getMembers.invalidate({ bandId })
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  if (isLoading) {
    return null
  }

  // Filter out the current founder from the list
  const eligibleMembers = membersData?.members?.filter(m => m.userId !== userId) || []

  if (eligibleMembers.length === 0) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <Stack spacing="md">
          <Heading level={3} className="text-blue-800">Transfer Ownership</Heading>
          <Alert variant="info">
            <Text>There are no other active members to transfer ownership to.</Text>
          </Alert>
        </Stack>
      </Card>
    )
  }

  const selectedMember = eligibleMembers.find(m => m.userId === selectedMemberId)

  const handleTransfer = () => {
    if (confirmText !== 'TRANSFER') {
      showToast('Please type TRANSFER to confirm', 'error')
      return
    }
    if (!selectedMemberId) {
      showToast('Please select a member', 'error')
      return
    }
    transferMutation.mutate({
      bandId,
      newFounderUserId: selectedMemberId,
      userId,
    })
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <Stack spacing="md">
        <Heading level={3} className="text-blue-800">Transfer Ownership</Heading>

        {!showConfirm ? (
          <>
            <Text color="muted">
              As the founder, you can transfer ownership of this band to another active member.
              After transfer, you will become a Governor and the new owner will become the Founder.
            </Text>

            <Text variant="small" color="muted">
              This action:
            </Text>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Cannot be undone without the new founder&apos;s consent</li>
              <li>Gives full control of the band to the new founder</li>
              <li>Changes your role from Founder to Governor</li>
            </ul>

            <Button
              variant="secondary"
              onClick={() => setShowConfirm(true)}
            >
              Transfer Ownership
            </Button>
          </>
        ) : (
          <>
            <Alert variant="warning">
              <Text weight="semibold">Transfer ownership of &quot;{bandName}&quot;</Text>
              <Text variant="small">You will become a Governor after this transfer.</Text>
            </Alert>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select new Founder
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a member...</option>
                {eligibleMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name} ({member.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            {selectedMember && (
              <Alert variant="info">
                <Text variant="small">
                  <strong>{selectedMember.user.name}</strong> will become the new Founder of this band.
                </Text>
              </Alert>
            )}

            <Input
              label='Type "TRANSFER" to confirm'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="TRANSFER"
            />

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowConfirm(false)
                  setSelectedMemberId('')
                  setConfirmText('')
                }}
                disabled={transferMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleTransfer}
                disabled={transferMutation.isPending || confirmText !== 'TRANSFER' || !selectedMemberId}
              >
                {transferMutation.isPending ? 'Transferring...' : 'Transfer Ownership'}
              </Button>
            </div>
          </>
        )}
      </Stack>
    </Card>
  )
}
