'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import {
  Stack,
  Heading,
  Text,
  Button,
  Textarea,
  Alert,
  Card,
  useToast,
} from '@/components/ui'

interface DissolveBandSectionProps {
  bandId: string
  bandName: string
  userId: string
}

export function DissolveBandSection({ bandId, bandName, userId }: DissolveBandSectionProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)
  const [reason, setReason] = useState('')

  // Check if band can be dissolved
  const { data: canDissolveData, isLoading } = trpc.band.canDissolve.useQuery(
    { bandId, userId },
    { enabled: !!bandId && !!userId }
  )

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

  // Don't show if loading or can't dissolve
  if (isLoading) {
    return null
  }

  if (!canDissolveData?.canDissolve) {
    return null
  }

  const handleDissolve = () => {
    dissolveMutation.mutate({
      bandId,
      userId,
      reason: reason.trim() || undefined,
    })
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <Stack spacing="md">
        <Heading level={3} className="text-red-800">Dissolve Band</Heading>

        {!showConfirm ? (
          <>
            <Alert variant="warning">
              <Text>This band hasn't reached 3 members yet.</Text>
            </Alert>

            <Text color="muted">
              You can dissolve this band if you no longer wish to continue recruiting members.
            </Text>

            <Text variant="small" color="muted">
              This will:
            </Text>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Notify all current members</li>
              <li>Invalidate pending invitations</li>
              <li>Reject pending applications</li>
              <li>Permanently close the band</li>
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
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you dissolving this band?"
              rows={3}
            />

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowConfirm(false)}
                disabled={dissolveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDissolve}
                disabled={dissolveMutation.isPending}
              >
                {dissolveMutation.isPending ? 'Dissolving...' : 'Yes, Dissolve Band'}
              </Button>
            </div>
          </>
        )}
      </Stack>
    </Card>
  )
}
