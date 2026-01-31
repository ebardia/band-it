'use client'

import { useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import {
  QuickLayout,
  QuickCard,
  QuickButton,
  QuickDivider,
  QuickInfo,
  QuickBadge,
} from '@/components/quick'

const PAYMENT_METHODS: Record<string, string> = {
  ZELLE: 'Zelle',
  VENMO: 'Venmo',
  CASHAPP: 'Cash App',
  CASH: 'Cash',
  CHECK: 'Check',
  OTHER: 'Other',
}

export default function QuickConfirmPaymentPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  const paymentId = params.paymentId as string
  const token = searchParams.get('token')

  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  // Fetch payment context using token
  const {
    data: context,
    isLoading,
    error,
  } = trpc.quick.getPaymentContext.useQuery(
    { paymentId, token: token || '' },
    { enabled: !!paymentId && !!token }
  )

  // Confirm payment mutation
  const confirmMutation = trpc.quick.confirmPaymentWithToken.useMutation({
    onSuccess: () => {
      setConfirmed(true)
      setIsConfirming(false)
    },
    onError: (err) => {
      setConfirmError(err.message)
      setIsConfirming(false)
    },
  })

  const handleConfirm = () => {
    if (!token) return
    setIsConfirming(true)
    setConfirmError(null)
    confirmMutation.mutate({ paymentId, token })
  }

  // Format currency
  const formatCurrency = (amountCents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountCents / 100)
  }

  // Format date
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // No token provided
  if (!token) {
    return (
      <QuickLayout
        title="Confirm Payment"
        error="Invalid confirmation link. Please use the link from your notification."
      />
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <QuickLayout
        title="Loading..."
        isLoading={true}
      />
    )
  }

  // Show error state
  if (error) {
    return (
      <QuickLayout
        title="Confirm Payment"
        error={error.message}
      />
    )
  }

  // No context
  if (!context) {
    return (
      <QuickLayout
        title="Confirm Payment"
        error="Unable to load payment details"
      />
    )
  }

  const { payment, band, member, initiatedBy, permissions } = context

  // Show success state after confirming
  if (confirmed) {
    return (
      <QuickLayout
        bandName={band.name}
        title="Done!"
      >
        <QuickCard>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Payment Confirmed
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              The payment of {formatCurrency(payment.amount, payment.currency)} has been confirmed.
            </p>
            <QuickBadge variant="success">Confirmed</QuickBadge>
          </div>
        </QuickCard>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            You can close this page now.
          </p>
        </div>
      </QuickLayout>
    )
  }

  // Payment already processed (not pending)
  if (!permissions.isPending) {
    const statusVariant =
      payment.status === 'CONFIRMED' || payment.status === 'AUTO_CONFIRMED'
        ? 'success'
        : payment.status === 'REJECTED' || payment.status === 'DISPUTED'
        ? 'danger'
        : 'default'

    // Get reason from permissions if available
    const reason = 'reason' in permissions ? permissions.reason : `Payment is ${payment.status.toLowerCase().replace('_', ' ')}`

    return (
      <QuickLayout
        bandName={band.name}
        title="Payment Status"
      >
        <QuickCard>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">
              {payment.status === 'CONFIRMED' || payment.status === 'AUTO_CONFIRMED' ? '✅' : '⚠️'}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {reason}
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {formatCurrency(payment.amount, payment.currency)} via {PAYMENT_METHODS[payment.paymentMethod] || payment.paymentMethod}
            </p>
            <QuickBadge variant={statusVariant}>
              {payment.status.replace('_', ' ')}
            </QuickBadge>
          </div>
        </QuickCard>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            You can close this page now.
          </p>
        </div>
      </QuickLayout>
    )
  }

  // Check for pending-specific properties
  const autoConfirmAt = 'autoConfirmAt' in payment ? payment.autoConfirmAt : null
  const treasurerInitiated = 'treasurerInitiated' in permissions ? permissions.treasurerInitiated : false

  // Main confirmation UI
  return (
    <QuickLayout
      bandName={band.name}
      title="Confirm Payment"
    >
      {/* Payment details */}
      <QuickCard>
        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold text-gray-900">
            {formatCurrency(payment.amount, payment.currency)}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            via {PAYMENT_METHODS[payment.paymentMethod] || payment.paymentMethod}
            {payment.paymentMethodOther && ` (${payment.paymentMethodOther})`}
          </p>
        </div>

        <QuickDivider />

        <div className="space-y-1">
          <QuickInfo
            label="Payer"
            value={member.name}
          />
          <QuickInfo
            label="Recorded by"
            value={initiatedBy.name}
          />
          <QuickInfo
            label="Payment date"
            value={formatDate(payment.paymentDate)}
          />
          {payment.note && (
            <>
              <QuickDivider />
              <div className="py-2">
                <p className="text-sm text-gray-500 mb-1">Note</p>
                <p className="text-sm text-gray-900">{payment.note}</p>
              </div>
            </>
          )}
        </div>
      </QuickCard>

      {/* Auto-confirm notice */}
      {autoConfirmAt && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            This payment will be automatically confirmed on{' '}
            <strong>{formatDate(autoConfirmAt)}</strong>{' '}
            if no action is taken.
          </p>
        </div>
      )}

      {/* Error message */}
      {confirmError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{confirmError}</p>
        </div>
      )}

      {/* Explanation */}
      <QuickCard className="mt-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            {treasurerInitiated
              ? 'A treasurer has recorded this payment on your behalf. Please confirm if this is accurate.'
              : 'This payment was recorded by a member. Please confirm receipt.'}
          </p>
        </div>
      </QuickCard>

      {/* Action buttons */}
      <div className="mt-6 space-y-3">
        <QuickButton
          variant="success"
          fullWidth
          onClick={handleConfirm}
          disabled={isConfirming}
        >
          {isConfirming ? 'Confirming...' : 'Confirm Payment'}
        </QuickButton>
      </div>

      {/* Dispute notice */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          If this payment is incorrect, please dispute it on the full site.
        </p>
      </div>
    </QuickLayout>
  )
}
