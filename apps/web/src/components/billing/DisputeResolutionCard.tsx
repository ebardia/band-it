'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Stack,
  Flex,
  Text,
  Card,
  Badge,
  Button,
  Textarea,
  Modal,
  useToast,
} from '@/components/ui'

interface Payment {
  id: string
  amount: number
  paymentMethod: string
  paymentMethodOther?: string | null
  paymentDate: string | Date
  note?: string | null
  initiatedByRole: string
  disputeReason?: string | null
  disputedAt?: string | Date | null
  member: {
    user: {
      id: string
      name: string
    }
  }
  initiatedBy: {
    id: string
    name: string
  }
  disputedBy?: {
    id: string
    name: string
  } | null
  files?: Array<{
    id: string
    filename: string
    url: string
  }>
}

interface DisputeResolutionCardProps {
  payment: Payment
  userId: string
  onAction?: () => void
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ZELLE: 'Zelle',
  VENMO: 'Venmo',
  CASHAPP: 'Cash App',
  CASH: 'Cash',
  CHECK: 'Check',
  OTHER: 'Other',
}

export function DisputeResolutionCard({
  payment,
  userId,
  onAction,
}: DisputeResolutionCardProps) {
  const { showToast } = useToast()
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<'CONFIRMED' | 'REJECTED' | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [isResolving, setIsResolving] = useState(false)

  const resolveMutation = trpc.manualPayment.resolve.useMutation({
    onSuccess: (data) => {
      showToast(
        `Payment ${selectedOutcome === 'CONFIRMED' ? 'confirmed' : 'rejected'} successfully`,
        'success'
      )
      setShowResolveModal(false)
      setSelectedOutcome(null)
      setResolutionNote('')
      onAction?.()
    },
    onError: (error) => {
      showToast(error.message || 'Failed to resolve dispute', 'error')
    },
  })

  const handleResolve = async () => {
    if (!selectedOutcome) return

    setIsResolving(true)
    try {
      await resolveMutation.mutateAsync({
        paymentId: payment.id,
        userId,
        outcome: selectedOutcome,
        note: resolutionNote.trim() || undefined,
      })
    } finally {
      setIsResolving(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  return (
    <>
      <Card className="border-2 border-red-400 bg-red-50">
        <Stack spacing="md">
          <Flex justify="between" align="start">
            <Stack spacing="sm">
              <Flex gap="md" align="center">
                <Text weight="semibold" className="text-lg">
                  {payment.member.user.name}
                </Text>
                <Badge variant="danger">Disputed</Badge>
              </Flex>
              <Text variant="small" color="muted">
                Disputed by {payment.disputedBy?.name || 'Unknown'} on{' '}
                {payment.disputedAt
                  ? new Date(payment.disputedAt).toLocaleDateString()
                  : 'Unknown date'}
              </Text>
            </Stack>
            <Text className="text-2xl font-bold">{formatCurrency(payment.amount)}</Text>
          </Flex>

          {/* Dispute Reason */}
          <div className="bg-red-100 p-3 rounded-lg border border-red-200">
            <Text variant="small" weight="semibold" className="text-red-800 mb-1">
              Dispute Reason:
            </Text>
            <Text className="text-red-800">{payment.disputeReason || 'No reason provided'}</Text>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stack spacing="xs">
              <Text variant="small" color="muted">
                Payment Method
              </Text>
              <Text weight="semibold">
                {PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
                {payment.paymentMethodOther && ` (${payment.paymentMethodOther})`}
              </Text>
            </Stack>
            <Stack spacing="xs">
              <Text variant="small" color="muted">
                Payment Date
              </Text>
              <Text weight="semibold">
                {new Date(payment.paymentDate).toLocaleDateString()}
              </Text>
            </Stack>
            <Stack spacing="xs">
              <Text variant="small" color="muted">
                Initiated By
              </Text>
              <Text weight="semibold">
                {payment.initiatedBy.name} ({payment.initiatedByRole.toLowerCase()})
              </Text>
            </Stack>
            <Stack spacing="xs">
              <Text variant="small" color="muted">
                Payer
              </Text>
              <Text weight="semibold">{payment.member.user.name}</Text>
            </Stack>
          </div>

          {payment.note && (
            <div className="bg-white p-3 rounded-lg">
              <Text variant="small" color="muted" className="mb-1">
                Original Note:
              </Text>
              <Text>{payment.note}</Text>
            </div>
          )}

          {payment.files && payment.files.length > 0 && (
            <div>
              <Text variant="small" color="muted" className="mb-2">
                Receipts:
              </Text>
              <Flex gap="sm" wrap="wrap">
                {payment.files.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {file.filename}
                  </a>
                ))}
              </Flex>
            </div>
          )}

          <div className="pt-2 border-t">
            <Flex gap="md" justify="end">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setSelectedOutcome('REJECTED')
                  setShowResolveModal(true)
                }}
              >
                Reject Payment
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedOutcome('CONFIRMED')
                  setShowResolveModal(true)
                }}
              >
                Confirm Payment
              </Button>
            </Flex>
          </div>
        </Stack>
      </Card>

      {/* Resolution Modal */}
      <Modal isOpen={showResolveModal} onClose={() => setShowResolveModal(false)}>
        <Stack spacing="lg">
          <Text className="text-xl font-semibold">
            {selectedOutcome === 'CONFIRMED' ? 'Confirm Payment' : 'Reject Payment'}
          </Text>

          <div
            className={`p-3 rounded-lg ${
              selectedOutcome === 'CONFIRMED'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <Text
              className={selectedOutcome === 'CONFIRMED' ? 'text-green-800' : 'text-red-800'}
            >
              {selectedOutcome === 'CONFIRMED'
                ? 'Confirming this payment will credit the member\'s account and close the dispute.'
                : 'Rejecting this payment will close the dispute without crediting the member\'s account.'}
            </Text>
          </div>

          <Stack spacing="sm">
            <Text variant="small" weight="semibold">
              Payment Details:
            </Text>
            <Text>
              {payment.member.user.name} - {formatCurrency(payment.amount)} via{' '}
              {PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
            </Text>
          </Stack>

          <Textarea
            label="Resolution Note (optional)"
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder="Add any notes about your decision..."
            rows={3}
          />

          <Flex gap="md" justify="end">
            <Button
              variant="ghost"
              onClick={() => setShowResolveModal(false)}
              disabled={isResolving}
            >
              Cancel
            </Button>
            <Button
              variant={selectedOutcome === 'CONFIRMED' ? 'primary' : 'danger'}
              onClick={handleResolve}
              disabled={isResolving}
            >
              {isResolving
                ? 'Processing...'
                : selectedOutcome === 'CONFIRMED'
                ? 'Confirm Payment'
                : 'Reject Payment'}
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </>
  )
}
