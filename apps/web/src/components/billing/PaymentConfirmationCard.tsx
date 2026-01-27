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
  autoConfirmAt?: string | Date | null
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
  files?: Array<{
    id: string
    filename: string
    url: string
  }>
}

interface PaymentConfirmationCardProps {
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

export function PaymentConfirmationCard({
  payment,
  userId,
  onAction,
}: PaymentConfirmationCardProps) {
  const { showToast } = useToast()
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDisputing, setIsDisputing] = useState(false)

  const confirmMutation = trpc.manualPayment.confirm.useMutation({
    onSuccess: () => {
      showToast('Payment confirmed!', 'success')
      onAction?.()
    },
    onError: (error) => {
      showToast(error.message || 'Failed to confirm payment', 'error')
    },
  })

  const disputeMutation = trpc.manualPayment.dispute.useMutation({
    onSuccess: () => {
      showToast('Payment disputed. Governors will review.', 'info')
      setShowDisputeModal(false)
      setDisputeReason('')
      onAction?.()
    },
    onError: (error) => {
      showToast(error.message || 'Failed to dispute payment', 'error')
    },
  })

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await confirmMutation.mutateAsync({
        paymentId: payment.id,
        userId,
      })
    } finally {
      setIsConfirming(false)
    }
  }

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      showToast('Please provide a reason for the dispute', 'error')
      return
    }

    setIsDisputing(true)
    try {
      await disputeMutation.mutateAsync({
        paymentId: payment.id,
        userId,
        reason: disputeReason.trim(),
      })
    } finally {
      setIsDisputing(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const autoConfirmDate = payment.autoConfirmAt
    ? new Date(payment.autoConfirmAt).toLocaleDateString()
    : null

  return (
    <>
      <Card className="border-2 border-yellow-400 bg-yellow-50">
        <Stack spacing="md">
          <Flex justify="between" align="start">
            <Stack spacing="sm">
              <Flex gap="md" align="center">
                <Text weight="semibold" className="text-lg">
                  {payment.member.user.name}
                </Text>
                <Badge variant="warning">Action Required</Badge>
              </Flex>
              <Text variant="small" color="muted">
                {payment.initiatedByRole === 'MEMBER'
                  ? `Recorded by ${payment.member.user.name} (member)`
                  : `Recorded by ${payment.initiatedBy.name} (treasurer)`}
              </Text>
            </Stack>
            <Text className="text-2xl font-bold text-green-600">
              {formatCurrency(payment.amount)}
            </Text>
          </Flex>

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
              <Text weight="semibold">{payment.initiatedBy.name}</Text>
            </Stack>
            {autoConfirmDate && (
              <Stack spacing="xs">
                <Text variant="small" color="muted">
                  Auto-confirms
                </Text>
                <Text weight="semibold" className="text-orange-600">
                  {autoConfirmDate}
                </Text>
              </Stack>
            )}
          </div>

          {payment.note && (
            <div className="bg-white p-3 rounded-lg">
              <Text variant="small" color="muted" className="mb-1">
                Note:
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
                onClick={() => setShowDisputeModal(true)}
                disabled={isConfirming}
              >
                Dispute
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? 'Confirming...' : 'Confirm Payment'}
              </Button>
            </Flex>
          </div>
        </Stack>
      </Card>

      {/* Dispute Modal */}
      <Modal isOpen={showDisputeModal} onClose={() => setShowDisputeModal(false)}>
        <Stack spacing="lg">
          <Text className="text-xl font-semibold">Dispute Payment</Text>
          <Text color="muted">
            Disputing this payment will flag it for review by band governors. Please provide a
            reason for the dispute.
          </Text>

          <Textarea
            label="Reason for dispute *"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="e.g., Payment was not received, amount is incorrect..."
            rows={4}
            required
          />

          <Flex gap="md" justify="end">
            <Button
              variant="ghost"
              onClick={() => setShowDisputeModal(false)}
              disabled={isDisputing}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDispute}
              disabled={isDisputing || !disputeReason.trim()}
            >
              {isDisputing ? 'Submitting...' : 'Submit Dispute'}
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </>
  )
}
