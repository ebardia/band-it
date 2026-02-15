'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Stack,
  Text,
  Button,
  Alert,
  Input,
  Flex,
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
      const newFounderName = data?.newFounderName || 'the new founder'
      showToast(`Ownership transferred to ${newFounderName}`, 'success')
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

  // Filter out the current founder from the list, and ensure user data exists
  const eligibleMembers = (membersData?.members || [])
    .filter(m => m.userId !== userId && m.user?.name)

  if (eligibleMembers.length === 0) {
    return (
      <div className="border border-blue-200 rounded-lg bg-blue-50 p-3">
        <Text weight="semibold" className="text-blue-800">Transfer Ownership</Text>
        <Text variant="small" color="muted">No other active members to transfer to.</Text>
      </div>
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
    <div className="border border-blue-200 rounded-lg bg-blue-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <Text weight="semibold" className="text-blue-800">Transfer Ownership</Text>
        {!showConfirm && (
          <Button variant="secondary" size="sm" onClick={() => setShowConfirm(true)}>Transfer</Button>
        )}
      </div>

      {!showConfirm ? (
        <Text variant="small" color="muted">Transfer founder role to another member. You'll become Governor.</Text>
      ) : (
        <Stack spacing="sm">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">New Founder</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Choose a member...</option>
              {eligibleMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {String(member.user?.name || 'Unknown')} ({String(member.role || '').replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          {selectedMember?.user?.name && (
            <Text variant="small" className="text-blue-700">
              <strong>{String(selectedMember.user.name)}</strong> will become Founder
            </Text>
          )}

          <Input
            label='Type "TRANSFER" to confirm'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="TRANSFER"
          />

          <Flex gap="sm" justify="end">
            <Button variant="ghost" size="sm" onClick={() => { setShowConfirm(false); setSelectedMemberId(''); setConfirmText('') }} disabled={transferMutation.isPending}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleTransfer} disabled={transferMutation.isPending || confirmText !== 'TRANSFER' || !selectedMemberId}>
              {transferMutation.isPending ? 'Transferring...' : 'Transfer'}
            </Button>
          </Flex>
        </Stack>
      )}
    </div>
  )
}
