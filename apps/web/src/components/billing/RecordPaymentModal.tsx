'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Stack,
  Flex,
  Text,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'

interface RecordPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  bandId: string
  userId: string
  isTreasurer: boolean
  onSuccess?: () => void
}

const PAYMENT_METHODS = [
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'VENMO', label: 'Venmo' },
  { value: 'CASHAPP', label: 'Cash App' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHECK', label: 'Check' },
  { value: 'OTHER', label: 'Other' },
]

export function RecordPaymentModal({
  isOpen,
  onClose,
  bandId,
  userId,
  isTreasurer,
  onSuccess,
}: RecordPaymentModalProps) {
  const { showToast } = useToast()
  const utils = trpc.useUtils()

  const [memberId, setMemberId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('ZELLE')
  const [paymentMethodOther, setPaymentMethodOther] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch band members
  const { data: membersData, isLoading: membersLoading } = trpc.manualPayment.getBandMembers.useQuery(
    { bandId, userId },
    { enabled: isOpen }
  )

  const createMutation = trpc.manualPayment.create.useMutation({
    onSuccess: () => {
      showToast('Payment recorded successfully!', 'success')
      utils.manualPayment.list.invalidate()
      utils.manualPayment.myPending.invalidate()
      onClose()
      resetForm()
      onSuccess?.()
    },
    onError: (error) => {
      showToast(error.message || 'Failed to record payment', 'error')
    },
  })

  const resetForm = () => {
    setMemberId('')
    setAmount('')
    setPaymentMethod('ZELLE')
    setPaymentMethodOther('')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setNote('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!memberId || !amount || !paymentDate) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    const amountCents = Math.round(parseFloat(amount) * 100)
    if (isNaN(amountCents) || amountCents <= 0) {
      showToast('Please enter a valid amount', 'error')
      return
    }

    if (paymentMethod === 'OTHER' && !paymentMethodOther.trim()) {
      showToast('Please specify the payment method', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      await createMutation.mutateAsync({
        bandId,
        userId,
        memberId,
        amount: amountCents,
        paymentMethod: paymentMethod as 'ZELLE' | 'VENMO' | 'CASHAPP' | 'CASH' | 'CHECK' | 'OTHER',
        paymentMethodOther: paymentMethod === 'OTHER' ? paymentMethodOther : undefined,
        paymentDate,
        note: note.trim() || undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const members = membersData?.members || []

  // For non-treasurers, auto-select their own member record
  const currentUserMember = members.find((m) => m.userId === userId)
  if (!isTreasurer && currentUserMember && !memberId) {
    setMemberId(currentUserMember.id)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Stack spacing="lg">
          <Text className="text-xl font-semibold">Record Manual Payment</Text>

          <Stack spacing="md">
            {/* Member Selection - only for treasurers */}
            {isTreasurer ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member who paid *
                </label>
                <Select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  required
                  disabled={membersLoading}
                >
                  <option value="">Select a member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                      {member.userId === userId ? ' (You)' : ''}
                      {member.isTreasurer ? ' - Treasurer' : ''}
                    </option>
                  ))}
                </Select>
                <Text variant="small" color="muted" className="mt-1">
                  Recording payment for another member requires their confirmation.
                </Text>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recording payment for
                </label>
                <Text weight="semibold">{currentUserMember?.name || 'You'}</Text>
                <Text variant="small" color="muted" className="mt-1">
                  The band treasurer will be notified to confirm this payment.
                </Text>
              </div>
            )}

            {/* Amount */}
            <Input
              label="Amount (USD) *"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="15.00"
              required
            />

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method *
              </label>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Other Payment Method */}
            {paymentMethod === 'OTHER' && (
              <Input
                label="Specify payment method *"
                value={paymentMethodOther}
                onChange={(e) => setPaymentMethodOther(e.target.value)}
                placeholder="e.g., Bank transfer, PayPal"
                required
              />
            )}

            {/* Payment Date */}
            <Input
              label="Payment Date *"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
            />

            {/* Note */}
            <Textarea
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any additional details about this payment..."
              rows={3}
            />
          </Stack>

          <div className="bg-blue-50 p-3 rounded-lg">
            <Text variant="small" color="muted">
              This payment will require confirmation from the other party. If not confirmed or
              disputed within 7 days, it will be automatically confirmed.
            </Text>
          </div>

          <Flex gap="md" justify="end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || membersLoading}
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </Flex>
        </Stack>
      </form>
    </Modal>
  )
}
