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
  Card,
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
        pageTitle="Billing"
        canApprove={canApprove}
        isMember={isMember}
        wide={true}
        bandId={band.id}
        userId={userId || undefined}
      >
        <Stack spacing="xl">
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
          <Card>
            <Stack spacing="lg">
              <Flex justify="between" align="center">
                <Stack spacing="sm">
                  <Heading level={2}>Membership Dues</Heading>
                  <Text color="muted">
                    Band membership dues are paid directly to the band's Stripe account.
                  </Text>
                </Stack>
                {canManageDues && duesPlan?.isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPlanModal(true)}
                  >
                    Edit Plan
                  </Button>
                )}
              </Flex>

              {planLoading ? (
                <Loading message="Loading dues plan..." />
              ) : duesPlan?.isActive ? (
                <Stack spacing="md">
                  <Card className="bg-blue-50 border-blue-200">
                    <Flex justify="between" align="center">
                      <Stack spacing="sm">
                        <Text variant="small" color="muted">Current Dues</Text>
                        <Flex gap="sm" align="baseline">
                          <Text className="text-3xl font-bold text-blue-600">
                            {formatCurrency(duesPlan.amountCents)}
                          </Text>
                          <Text color="muted">/ {duesPlan.interval}</Text>
                        </Flex>
                      </Stack>
                    </Flex>
                  </Card>
                </Stack>
              ) : (
                <Stack spacing="md">
                  <Alert variant="info">
                    <Text>This band has not set up membership dues yet.</Text>
                  </Alert>

                  {canManageDues && (
                    <Button
                      variant="primary"
                      onClick={() => setShowPlanModal(true)}
                    >
                      Set Up Dues Plan
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>

          {/* My Billing Status */}
          <Card>
            <Stack spacing="lg">
              <Heading level={2}>My Billing Status</Heading>

              {myBillingLoading ? (
                <Loading message="Loading your billing status..." />
              ) : (
                <Stack spacing="md">
                  <Flex gap="lg" align="center">
                    <Stack spacing="sm">
                      <Text variant="small" color="muted">Status</Text>
                      {getStatusBadge(myBilling?.status || 'UNPAID')}
                    </Stack>

                    {myBilling?.currentPeriodEnd && (
                      <Stack spacing="sm">
                        <Text variant="small" color="muted">Current Period Ends</Text>
                        <Text weight="semibold">
                          {new Date(myBilling.currentPeriodEnd).toLocaleDateString()}
                        </Text>
                      </Stack>
                    )}

                    {myBilling?.lastPaymentAt && (
                      <Stack spacing="sm">
                        <Text variant="small" color="muted">Last Payment</Text>
                        <Text weight="semibold">
                          {new Date(myBilling.lastPaymentAt).toLocaleDateString()}
                        </Text>
                      </Stack>
                    )}
                  </Flex>

                  {duesPlan?.isActive && myBilling?.status !== 'ACTIVE' && (
                    <Stack spacing="sm">
                      {myBilling?.status === 'PAST_DUE' && (
                        <Alert variant="warning">
                          <Text>Your payment is past due. Please update your payment method.</Text>
                        </Alert>
                      )}

                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handlePayDues}
                        disabled={startingCheckout}
                      >
                        {startingCheckout ? 'Starting checkout...' : `Pay Dues (${formatCurrency(duesPlan.amountCents)}/${duesPlan.interval})`}
                      </Button>
                    </Stack>
                  )}

                  {myBilling?.status === 'ACTIVE' && (
                    <Alert variant="success">
                      <Text>Your membership dues are current. Thank you for your support!</Text>
                    </Alert>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>

          {/* All Members Billing (Admin View) */}
          {canViewAllBilling && (
            <Card>
              <Stack spacing="lg">
                <Heading level={2}>Member Billing Overview</Heading>

                {membersBillingLoading ? (
                  <Loading message="Loading members billing..." />
                ) : (
                  <Stack spacing="md">
                    {/* Summary Cards */}
                    {billingSummary && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Card className="bg-gray-50 text-center">
                          <Stack spacing="sm">
                            <Text variant="small" color="muted">Total</Text>
                            <Text className="text-2xl font-bold">{billingSummary.total}</Text>
                          </Stack>
                        </Card>
                        <Card className="bg-green-50 text-center">
                          <Stack spacing="sm">
                            <Text variant="small" color="muted">Active</Text>
                            <Text className="text-2xl font-bold text-green-600">{billingSummary.active}</Text>
                          </Stack>
                        </Card>
                        <Card className="bg-gray-50 text-center">
                          <Stack spacing="sm">
                            <Text variant="small" color="muted">Unpaid</Text>
                            <Text className="text-2xl font-bold text-gray-600">{billingSummary.unpaid}</Text>
                          </Stack>
                        </Card>
                        <Card className="bg-yellow-50 text-center">
                          <Stack spacing="sm">
                            <Text variant="small" color="muted">Past Due</Text>
                            <Text className="text-2xl font-bold text-yellow-600">{billingSummary.pastDue}</Text>
                          </Stack>
                        </Card>
                        <Card className="bg-red-50 text-center">
                          <Stack spacing="sm">
                            <Text variant="small" color="muted">Canceled</Text>
                            <Text className="text-2xl font-bold text-red-600">{billingSummary.canceled}</Text>
                          </Stack>
                        </Card>
                      </div>
                    )}

                    {/* Members List */}
                    {membersBilling.length > 0 ? (
                      <Stack spacing="sm">
                        <Text variant="small" weight="semibold" color="muted">All Members</Text>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left p-3 font-medium">Member</th>
                                <th className="text-left p-3 font-medium">Status</th>
                                <th className="text-left p-3 font-medium">Period End</th>
                              </tr>
                            </thead>
                            <tbody>
                              {membersBilling.map((member) => (
                                <tr key={member.userId} className="border-t">
                                  <td className="p-3">{member.displayName}</td>
                                  <td className="p-3">{getStatusBadge(member.status)}</td>
                                  <td className="p-3 text-gray-500">
                                    {member.currentPeriodEnd
                                      ? new Date(member.currentPeriodEnd).toLocaleDateString()
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Stack>
                    ) : (
                      <Alert variant="info">
                        <Text>No billing records yet. Members will appear here after they pay dues.</Text>
                      </Alert>
                    )}
                  </Stack>
                )}
              </Stack>
            </Card>
          )}

              {/* Info Card */}
              <Card className="bg-blue-50 border-blue-200">
                <Stack spacing="sm">
                  <Heading level={3}>About Band Dues</Heading>
                  <Text variant="small">
                    Membership dues are paid directly to the band's connected Stripe account.
                    Band-It does not take any fees from dues payments. All funds go directly to your band.
                  </Text>
                  <Text variant="small" color="muted">
                    Subscriptions are managed by Stripe. You can cancel anytime from your Stripe customer portal.
                  </Text>
                </Stack>
              </Card>
            </>
          )}

          {/* Manual Payments Tab Content */}
          {activeTab === 'manual' && userId && (
            <>
              <Card>
                <Stack spacing="lg">
                  <Flex justify="between" align="center">
                    <Stack spacing="sm">
                      <Heading level={2}>Manual Payments</Heading>
                      <Text color="muted">
                        Track payments made outside of Stripe (Zelle, Venmo, Cash, etc.)
                      </Text>
                    </Stack>
                    <Button
                      variant="primary"
                      onClick={() => setShowRecordPaymentModal(true)}
                    >
                      Record Payment
                    </Button>
                  </Flex>

                  <ManualPaymentsList
                    bandId={band.id}
                    userId={userId}
                    canViewAll={canViewAllBilling || false}
                    isGovernor={isGovernor || false}
                    isTreasurer={isTreasurer || false}
                    bandSlug={slug}
                  />
                </Stack>
              </Card>

              {/* Manual Payments Info Card */}
              <Card className="bg-gray-50">
                <Stack spacing="sm">
                  <Heading level={3}>How Manual Payments Work</Heading>
                  <Text variant="small">
                    Manual payments require two-party confirmation to prevent fraud:
                  </Text>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    <li>If a member records a payment, the treasurer must confirm it</li>
                    <li>If the treasurer records a payment for a member, the member must confirm it</li>
                    <li>Payments auto-confirm after 7 days if not disputed</li>
                    <li>Disputed payments are reviewed by band governors</li>
                  </ul>
                </Stack>
              </Card>
            </>
          )}
        </Stack>

        {/* Edit Dues Plan Modal */}
        <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)}>
          <Stack spacing="lg">
            <Heading level={2}>{duesPlan?.isActive ? 'Edit' : 'Create'} Dues Plan</Heading>

            <Stack spacing="md">
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

              <Stack spacing="sm">
                <Text variant="small" weight="semibold">Billing Interval</Text>
                <Flex gap="sm">
                  <Button
                    type="button"
                    variant={planInterval === 'month' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setPlanInterval('month')}
                  >
                    Monthly
                  </Button>
                  <Button
                    type="button"
                    variant={planInterval === 'year' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setPlanInterval('year')}
                  >
                    Yearly
                  </Button>
                </Flex>
              </Stack>

              {planAmount && parseFloat(planAmount) >= 0.5 && (
                <Card className="bg-gray-50">
                  <Text>
                    Members will be charged <strong>{formatCurrency(Math.round(parseFloat(planAmount) * 100))}</strong> per <strong>{planInterval}</strong>.
                  </Text>
                </Card>
              )}
            </Stack>

            <Flex gap="md" justify="end">
              <Button
                variant="ghost"
                onClick={() => setShowPlanModal(false)}
                disabled={savingPlan}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSavePlan}
                disabled={savingPlan || !planAmount || parseFloat(planAmount) < 0.5}
              >
                {savingPlan ? 'Saving...' : 'Save Plan'}
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
