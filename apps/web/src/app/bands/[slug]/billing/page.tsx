'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Button,
  useToast,
  Flex,
  Badge,
  Loading,
  Alert,
  BandLayout,
  Modal,
  Input,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import {
  ManualPaymentsList,
  RecordPaymentModal,
  PendingConfirmationsBanner,
} from '@/components/billing'

// Roles that can manage dues
const CAN_MANAGE_DUES = ['FOUNDER', 'GOVERNOR']
const CAN_VIEW_ALL_BILLING = ['FOUNDER', 'GOVERNOR']

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/trpc', '') || 'http://localhost:3001'

interface DuesPlan {
  id?: string
  amountCents: number
  currency: string
  interval: string
  isActive: boolean
}

interface MemberBilling {
  userId: string
  displayName: string
  status: string
  currentPeriodEnd: string | null
}

interface BillingSummary {
  total: number
  active: number
  unpaid: number
  pastDue: number
  canceled: number
}

interface MyBillingStatus {
  status: string
  currentPeriodEnd: string | null
  lastPaymentAt: string | null
}

export default function BillingPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const { showToast } = useToast()

  const [userId, setUserId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'manual'>('overview')

  // Manual payment modal state
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false)

  // Dues plan state
  const [duesPlan, setDuesPlan] = useState<DuesPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(true)

  // Plan editing state
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [planAmount, setPlanAmount] = useState('')
  const [planInterval, setPlanInterval] = useState<'month' | 'year'>('month')
  const [savingPlan, setSavingPlan] = useState(false)

  // My billing status
  const [myBilling, setMyBilling] = useState<MyBillingStatus | null>(null)
  const [myBillingLoading, setMyBillingLoading] = useState(true)

  // All members billing (for admins)
  const [membersBilling, setMembersBilling] = useState<MemberBilling[]>([])
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null)
  const [membersBillingLoading, setMembersBillingLoading] = useState(true)

  // Checkout state
  const [startingCheckout, setStartingCheckout] = useState(false)

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken')
    if (storedToken) {
      try {
        const decoded: any = jwtDecode(storedToken)
        setUserId(decoded.userId)
        setToken(storedToken)
      } catch (error) {
        console.error('Invalid token:', error)
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  // Handle URL params for success/error messages and tab
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    const tab = searchParams.get('tab')

    if (tab === 'manual') {
      setActiveTab('manual')
    }

    if (success === 'true') {
      showToast('Payment successful! Your dues are now active.', 'success')
      router.replace(`/bands/${slug}/billing`)
    } else if (canceled === 'true') {
      showToast('Payment was canceled.', 'info')
      router.replace(`/bands/${slug}/billing`)
    }
  }, [searchParams, showToast, router, slug])

  const { data: bandData, isLoading: bandLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  // Fetch dues plan
  const fetchDuesPlan = useCallback(async (bandId: string) => {
    if (!token) return

    try {
      setPlanLoading(true)
      const response = await fetch(`${API_URL}/api/bands/${bandId}/dues-plan`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setDuesPlan(data)
        if (data.amountCents) {
          setPlanAmount((data.amountCents / 100).toString())
          setPlanInterval(data.interval || 'month')
        }
      }
    } catch (error) {
      console.error('Error fetching dues plan:', error)
    } finally {
      setPlanLoading(false)
    }
  }, [token])

  // Fetch my billing status
  const fetchMyBilling = useCallback(async (bandId: string) => {
    if (!token || !userId) return

    try {
      setMyBillingLoading(true)
      const response = await fetch(`${API_URL}/api/bands/${bandId}/members/${userId}/billing`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setMyBilling(data)
      }
    } catch (error) {
      console.error('Error fetching my billing:', error)
    } finally {
      setMyBillingLoading(false)
    }
  }, [token, userId])

  // Fetch all members billing (for admins)
  const fetchMembersBilling = useCallback(async (bandId: string) => {
    if (!token) return

    try {
      setMembersBillingLoading(true)
      const response = await fetch(`${API_URL}/api/bands/${bandId}/billing`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setMembersBilling(data.members)
        setBillingSummary(data.summary)
      }
    } catch (error) {
      // Non-admins will get 403, which is fine
      console.log('Cannot fetch all members billing (may not have permission)')
    } finally {
      setMembersBillingLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (bandData?.band?.id && token && userId) {
      fetchDuesPlan(bandData.band.id)
      fetchMyBilling(bandData.band.id)
      fetchMembersBilling(bandData.band.id)
    }
  }, [bandData?.band?.id, token, userId, fetchDuesPlan, fetchMyBilling, fetchMembersBilling])

  // Save dues plan
  const handleSavePlan = async () => {
    if (!bandData?.band?.id || !token) return

    const amountCents = Math.round(parseFloat(planAmount) * 100)
    if (isNaN(amountCents) || amountCents < 50) {
      showToast('Amount must be at least $0.50', 'error')
      return
    }

    try {
      setSavingPlan(true)
      const response = await fetch(`${API_URL}/api/bands/${bandData.band.id}/dues-plan`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amountCents,
          currency: 'usd',
          interval: planInterval,
          isActive: true,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDuesPlan(data)
        setShowPlanModal(false)
        showToast('Dues plan saved successfully!', 'success')
      } else {
        const error = await response.json()
        showToast(error.message || 'Failed to save dues plan', 'error')
      }
    } catch (error) {
      console.error('Error saving dues plan:', error)
      showToast('Failed to save dues plan', 'error')
    } finally {
      setSavingPlan(false)
    }
  }

  // Start checkout
  const handlePayDues = async () => {
    if (!bandData?.band?.id || !token) return

    try {
      setStartingCheckout(true)
      const response = await fetch(`${API_URL}/api/bands/${bandData.band.id}/dues-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl
      } else {
        const error = await response.json()
        showToast(error.message || 'Failed to start checkout', 'error')
      }
    } catch (error) {
      console.error('Error starting checkout:', error)
      showToast('Failed to start checkout', 'error')
    } finally {
      setStartingCheckout(false)
    }
  }

  if (bandLoading) {
    return (
      <>
        <AppNav />
        <BandLayout bandSlug={slug} bandName="Loading..." pageTitle="Billing" isMember={false} wide={true}>
          <Loading message="Loading billing..." />
        </BandLayout>
      </>
    )
  }

  if (!bandData?.band) {
    return (
      <>
        <AppNav />
        <BandLayout bandSlug={slug} bandName="" pageTitle="Billing" isMember={false} wide={true}>
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const band = bandData.band
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const canManageDues = currentMember && CAN_MANAGE_DUES.includes(currentMember.role)
  const canViewAllBilling = currentMember && (CAN_VIEW_ALL_BILLING.includes(currentMember.role) || currentMember.isTreasurer)
  const isGovernor = currentMember && CAN_VIEW_ALL_BILLING.includes(currentMember.role)
  const isTreasurer = currentMember?.isTreasurer || (isGovernor && !band.members.some((m: any) => m.isTreasurer && m.status === 'ACTIVE'))

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
      ACTIVE: 'success',
      UNPAID: 'neutral',
      PAST_DUE: 'warning',
      CANCELED: 'danger',
    }
    return <Badge variant={variants[status] || 'neutral'}>{status.replace('_', ' ')}</Badge>
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="Billing"
        canApprove={canApprove}
        isMember={isMember}
        wide={true}
        bandId={band.id}
        userId={userId || undefined}
      >
        <Stack spacing="md">
          {/* Tab Navigation */}
          <Flex gap="sm" className="border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'manual'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Manual Payments
            </button>
          </Flex>

          {/* Pending Confirmations Banner - show on both tabs */}
          {userId && (
            <PendingConfirmationsBanner
              bandId={band.id}
              userId={userId}
              onViewClick={() => setActiveTab('manual')}
            />
          )}

          {/* Overview Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Dues Plan Section */}
              <div className="border border-gray-200 rounded-lg bg-white p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <Heading level={2}>Membership Dues</Heading>
                    <Text variant="small" color="muted">Paid directly to the band's Stripe account</Text>
                  </div>
                  {canManageDues && duesPlan?.isActive && (
                    <Button variant="ghost" size="sm" onClick={() => setShowPlanModal(true)}>
                      Edit
                    </Button>
                  )}
                </div>

                {planLoading ? (
                  <Loading message="Loading dues plan..." />
                ) : duesPlan?.isActive ? (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <Text variant="small" color="muted">Current Dues</Text>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-blue-600">{formatCurrency(duesPlan.amountCents)}</span>
                      <Text color="muted">/ {duesPlan.interval}</Text>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Text variant="small" color="muted">No dues plan set up yet.</Text>
                    {canManageDues && (
                      <Button variant="primary" size="sm" onClick={() => setShowPlanModal(true)} className="mt-2">
                        Set Up Dues Plan
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* My Billing Status */}
              <div className="border border-gray-200 rounded-lg bg-white p-4">
                <Heading level={2}>My Billing Status</Heading>

                {myBillingLoading ? (
                  <Loading message="Loading your billing status..." />
                ) : (
                  <div className="mt-3">
                    <div className="flex items-center gap-4 flex-wrap text-sm">
                      <div>
                        <span className="text-gray-500">Status: </span>
                        {getStatusBadge(myBilling?.status || 'UNPAID')}
                      </div>
                      {myBilling?.currentPeriodEnd && (
                        <div>
                          <span className="text-gray-500">Ends: </span>
                          <span className="font-medium">{new Date(myBilling.currentPeriodEnd).toLocaleDateString()}</span>
                        </div>
                      )}
                      {myBilling?.lastPaymentAt && (
                        <div>
                          <span className="text-gray-500">Last: </span>
                          <span className="font-medium">{new Date(myBilling.lastPaymentAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {duesPlan?.isActive && myBilling?.status !== 'ACTIVE' && (
                      <div className="mt-3">
                        {myBilling?.status === 'PAST_DUE' && (
                          <Alert variant="warning" className="mb-2">
                            <Text variant="small">Your payment is past due.</Text>
                          </Alert>
                        )}
                        <Button variant="primary" onClick={handlePayDues} disabled={startingCheckout}>
                          {startingCheckout ? 'Starting...' : `Pay Dues (${formatCurrency(duesPlan.amountCents)}/${duesPlan.interval})`}
                        </Button>
                      </div>
                    )}

                    {myBilling?.status === 'ACTIVE' && (
                      <div className="mt-2 text-sm text-green-600">Your dues are current.</div>
                    )}
                  </div>
                )}
              </div>

              {/* All Members Billing (Admin View) */}
              {canViewAllBilling && (
                <div className="border border-gray-200 rounded-lg bg-white p-4">
                  <Heading level={2}>Member Billing Overview</Heading>

                  {membersBillingLoading ? (
                    <Loading message="Loading members billing..." />
                  ) : (
                    <div className="mt-3">
                      {/* Summary Stats */}
                      {billingSummary && (
                        <div className="flex gap-2 md:gap-4 flex-wrap mb-4">
                          <div className="flex-1 min-w-[60px] bg-gray-50 border border-gray-200 rounded p-2 text-center">
                            <div className="text-xs text-gray-500">Total</div>
                            <div className="text-lg font-bold">{billingSummary.total}</div>
                          </div>
                          <div className="flex-1 min-w-[60px] bg-green-50 border border-green-200 rounded p-2 text-center">
                            <div className="text-xs text-gray-500">Active</div>
                            <div className="text-lg font-bold text-green-600">{billingSummary.active}</div>
                          </div>
                          <div className="flex-1 min-w-[60px] bg-gray-50 border border-gray-200 rounded p-2 text-center">
                            <div className="text-xs text-gray-500">Unpaid</div>
                            <div className="text-lg font-bold text-gray-600">{billingSummary.unpaid}</div>
                          </div>
                          <div className="flex-1 min-w-[60px] bg-yellow-50 border border-yellow-200 rounded p-2 text-center">
                            <div className="text-xs text-gray-500">Past Due</div>
                            <div className="text-lg font-bold text-yellow-600">{billingSummary.pastDue}</div>
                          </div>
                          <div className="flex-1 min-w-[60px] bg-red-50 border border-red-200 rounded p-2 text-center">
                            <div className="text-xs text-gray-500">Canceled</div>
                            <div className="text-lg font-bold text-red-600">{billingSummary.canceled}</div>
                          </div>
                        </div>
                      )}

                      {/* Members List */}
                      {membersBilling.length > 0 ? (
                        <div className="border rounded overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left p-2 font-medium">Member</th>
                                <th className="text-left p-2 font-medium">Status</th>
                                <th className="text-left p-2 font-medium">Ends</th>
                              </tr>
                            </thead>
                            <tbody>
                              {membersBilling.map((member) => (
                                <tr key={member.userId} className="border-t">
                                  <td className="p-2">{member.displayName}</td>
                                  <td className="p-2">{getStatusBadge(member.status)}</td>
                                  <td className="p-2 text-gray-500">
                                    {member.currentPeriodEnd ? new Date(member.currentPeriodEnd).toLocaleDateString() : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <Text variant="small" color="muted">No billing records yet.</Text>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Info Card */}
              <div className="border border-blue-200 rounded-lg bg-blue-50 p-3">
                <Text variant="small">
                  Dues go directly to the band's Stripe account. Band-It takes no fees. Cancel anytime via Stripe.
                </Text>
              </div>
            </>
          )}

          {/* Manual Payments Tab Content */}
          {activeTab === 'manual' && userId && (
            <>
              <div className="border border-gray-200 rounded-lg bg-white p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <Heading level={2}>Manual Payments</Heading>
                    <Text variant="small" color="muted">Zelle, Venmo, Cash, etc.</Text>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => setShowRecordPaymentModal(true)}>
                    Record Payment
                  </Button>
                </div>

                <ManualPaymentsList
                  bandId={band.id}
                  userId={userId}
                  canViewAll={canViewAllBilling || false}
                  isGovernor={isGovernor || false}
                  isTreasurer={isTreasurer || false}
                  bandSlug={slug}
                />
              </div>

              {/* Manual Payments Info */}
              <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
                <Text variant="small" color="muted">
                  Manual payments require two-party confirmation. Auto-confirm after 7 days if not disputed.
                </Text>
              </div>
            </>
          )}
        </Stack>

        {/* Edit Dues Plan Modal */}
        <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)}>
          <Stack spacing="md">
            <Heading level={2}>{duesPlan?.isActive ? 'Edit' : 'Create'} Dues Plan</Heading>

            <Input
              label="Amount (USD)"
              type="number"
              min="0.50"
              step="0.01"
              value={planAmount}
              onChange={(e) => setPlanAmount(e.target.value)}
              placeholder="15.00"
              helperText="Minimum $0.50"
            />

            <div>
              <Text variant="small" weight="semibold" className="mb-2">Billing Interval</Text>
              <Flex gap="sm">
                <Button type="button" variant={planInterval === 'month' ? 'primary' : 'secondary'} size="sm" onClick={() => setPlanInterval('month')}>
                  Monthly
                </Button>
                <Button type="button" variant={planInterval === 'year' ? 'primary' : 'secondary'} size="sm" onClick={() => setPlanInterval('year')}>
                  Yearly
                </Button>
              </Flex>
            </div>

            {planAmount && parseFloat(planAmount) >= 0.5 && (
              <div className="bg-gray-50 rounded p-2 text-sm">
                Charge: <strong>{formatCurrency(Math.round(parseFloat(planAmount) * 100))}</strong> / <strong>{planInterval}</strong>
              </div>
            )}

            <Flex gap="md" justify="end">
              <Button variant="ghost" onClick={() => setShowPlanModal(false)} disabled={savingPlan}>Cancel</Button>
              <Button variant="primary" onClick={handleSavePlan} disabled={savingPlan || !planAmount || parseFloat(planAmount) < 0.5}>
                {savingPlan ? 'Saving...' : 'Save'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Record Manual Payment Modal */}
        {userId && (
          <RecordPaymentModal
            isOpen={showRecordPaymentModal}
            onClose={() => setShowRecordPaymentModal(false)}
            bandId={band.id}
            userId={userId}
            isTreasurer={isTreasurer || false}
          />
        )}
      </BandLayout>
    </>
  )
}
