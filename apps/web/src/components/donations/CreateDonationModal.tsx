'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Modal,
  Text,
  Stack,
  Input,
  Button,
  Flex,
  useToast,
  Alert,
} from '@/components/ui'

interface CreateDonationModalProps {
  isOpen: boolean
  onClose: () => void
  bandId: string
  userId: string
  paymentInfo?: Record<string, string> | null
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

const FREQUENCIES = [
  { value: 'ONE_TIME', label: 'One-time' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
]

export function CreateDonationModal({
  isOpen,
  onClose,
  bandId,
  userId,
  paymentInfo,
  onSuccess,
}: CreateDonationModalProps) {
  const { showToast } = useToast()
  const utils = trpc.useUtils()

  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('ZELLE')
  const [paymentMethodOther, setPaymentMethodOther] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [note, setNote] = useState('')
  const [frequency, setFrequency] = useState<string>('ONE_TIME')
  const [startDate, setStartDate] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('')

  const createOneTimeMutation = trpc.donation.createOneTime.useMutation({
    onSuccess: () => {
      showToast('Donation submitted successfully!', 'success')
      utils.donation.list.invalidate()
      utils.donation.getMyDonations.invalidate()
      resetForm()
      onClose()
      onSuccess?.()
    },
    onError: (error) => {
      showToast(error.message || 'Failed to create donation', 'error')
    },
  })

  const createRecurringMutation = trpc.donation.createRecurring.useMutation({
    onSuccess: () => {
      showToast('Recurring donation created successfully!', 'success')
      utils.donation.list.invalidate()
      utils.donation.listRecurring.invalidate()
      utils.donation.getMyDonations.invalidate()
      resetForm()
      onClose()
      onSuccess?.()
    },
    onError: (error) => {
      showToast(error.message || 'Failed to create recurring donation', 'error')
    },
  })

  const resetForm = () => {
    setAmount('')
    setPaymentMethod('ZELLE')
    setPaymentMethodOther('')
    setReferenceNumber('')
    setNote('')
    setFrequency('ONE_TIME')
    setStartDate('')
    setDayOfMonth('')
  }

  const handleSubmit = () => {
    const amountCents = Math.round(parseFloat(amount) * 100)
    if (isNaN(amountCents) || amountCents < 100) {
      showToast('Amount must be at least $1.00', 'error')
      return
    }

    if (frequency === 'ONE_TIME') {
      createOneTimeMutation.mutate({
        bandId,
        userId,
        amount: amountCents,
        paymentMethod: paymentMethod as any,
        paymentMethodOther: paymentMethod === 'OTHER' ? paymentMethodOther : undefined,
        referenceNumber: referenceNumber || undefined,
        note: note || undefined,
      })
    } else {
      if (!startDate) {
        showToast('Please select a start date', 'error')
        return
      }

      createRecurringMutation.mutate({
        bandId,
        userId,
        amount: amountCents,
        frequency: frequency as 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
        paymentMethod: paymentMethod as any,
        paymentMethodOther: paymentMethod === 'OTHER' ? paymentMethodOther : undefined,
        startDate,
        dayOfMonth: dayOfMonth ? parseInt(dayOfMonth) : undefined,
        note: note || undefined,
      })
    }
  }

  const isLoading = createOneTimeMutation.isPending || createRecurringMutation.isPending
  const isValid = amount && parseFloat(amount) >= 1 && (frequency === 'ONE_TIME' || startDate)

  // Get payment info for selected method
  const selectedPaymentInfo = paymentInfo?.[paymentMethod.toLowerCase()]

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Stack spacing="md">
        <Text weight="semibold" className="text-lg">Make a Donation</Text>

        <Input
          label="Amount (USD)"
          type="number"
          min="1.00"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="25.00"
          helperText="Minimum $1.00"
        />

        <div>
          <Text variant="small" weight="semibold" className="mb-1">Frequency</Text>
          <Flex gap="xs" className="flex-wrap">
            {FREQUENCIES.map((f) => (
              <Button
                key={f.value}
                type="button"
                variant={frequency === f.value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFrequency(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </Flex>
        </div>

        {frequency !== 'ONE_TIME' && (
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        )}

        {['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(frequency) && (
          <Input
            label="Day of Month"
            type="number"
            min="1"
            max="28"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            placeholder="15"
            helperText="1-28 (to avoid month-end issues)"
          />
        )}

        <div>
          <Text variant="small" weight="semibold" className="mb-1">Payment Method</Text>
          <Flex gap="xs" className="flex-wrap">
            {PAYMENT_METHODS.map((pm) => (
              <Button
                key={pm.value}
                type="button"
                variant={paymentMethod === pm.value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPaymentMethod(pm.value)}
              >
                {pm.label}
              </Button>
            ))}
          </Flex>
        </div>

        {paymentMethod === 'OTHER' && (
          <Input
            label="Payment Method Description"
            value={paymentMethodOther}
            onChange={(e) => setPaymentMethodOther(e.target.value)}
            placeholder="e.g., PayPal, Wire Transfer"
          />
        )}

        {selectedPaymentInfo && (
          <Alert variant="info">
            <Text variant="small">
              <strong>Send payment to:</strong> {selectedPaymentInfo}
            </Text>
          </Alert>
        )}

        {frequency === 'ONE_TIME' && (
          <Input
            label="Reference Number (Optional)"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="Transaction ID or confirmation number"
          />
        )}

        <Input
          label="Note (Optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Any message for the treasurer"
        />

        <Flex gap="sm" justify="end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isLoading || !isValid}
          >
            {isLoading ? 'Submitting...' : frequency === 'ONE_TIME' ? 'Submit Donation' : 'Create Recurring Donation'}
          </Button>
        </Flex>
      </Stack>
    </Modal>
  )
}

export default CreateDonationModal
