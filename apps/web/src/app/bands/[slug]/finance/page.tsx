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
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

// Roles that can manage Stripe
const CAN_MANAGE_STRIPE = ['FOUNDER', 'GOVERNOR']

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/trpc', '') || 'http://localhost:3001'

interface StripeStatus {
  connected: boolean
  stripeAccountId?: string
  chargesEnabled?: boolean
  detailsSubmitted?: boolean
  connectedAt?: string
}

export default function FinancePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const { showToast } = useToast()

  const [userId, setUserId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const [stripeLoading, setStripeLoading] = useState(true)
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [disconnectingStripe, setDisconnectingStripe] = useState(false)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)

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

  // Handle URL params for success/error messages
  useEffect(() => {
    const stripeParam = searchParams.get('stripe')
    const errorParam = searchParams.get('error')

    if (stripeParam === 'connected') {
      showToast('Stripe account connected successfully!', 'success')
      // Clean up URL
      router.replace(`/bands/${slug}/finance`)
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        access_denied: 'Stripe connection was cancelled',
        already_connected: 'Band already has a connected Stripe account',
        invalid_state: 'Invalid or expired connection request. Please try again.',
        stripe_error: 'An error occurred with Stripe. Please try again.',
        server_error: 'A server error occurred. Please try again.',
        account_in_use: 'This Stripe account is already connected to another band. Each band must have its own unique Stripe account.',
      }
      showToast(errorMessages[errorParam] || 'An error occurred', 'error')
      router.replace(`/bands/${slug}/finance`)
    }
  }, [searchParams, showToast, router, slug])

  const { data: bandData, isLoading: bandLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  // Fetch Stripe status (and auto-refresh from Stripe if connected but incomplete)
  const fetchStripeStatus = useCallback(async (bandId: string, canRefresh: boolean) => {
    if (!token) return

    try {
      setStripeLoading(true)

      // First get current status from our database
      const response = await fetch(`${API_URL}/api/bands/${bandId}/stripe/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()

        // If connected but charges not enabled, and user can refresh, auto-refresh from Stripe
        if (data.connected && !data.chargesEnabled && canRefresh) {
          const refreshResponse = await fetch(`${API_URL}/api/bands/${bandId}/stripe/refresh`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (refreshResponse.ok) {
            const refreshedData = await refreshResponse.json()
            setStripeStatus(refreshedData)
            return
          }
        }

        setStripeStatus(data)
      } else {
        console.error('Failed to fetch Stripe status:', response.status)
        setStripeStatus({ connected: false })
      }
    } catch (error) {
      console.error('Error fetching Stripe status:', error)
      setStripeStatus({ connected: false })
    } finally {
      setStripeLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (bandData?.band?.id && token && userId) {
      // Check if user can refresh (is founder/governor)
      const member = bandData.band.members.find((m: any) => m.user.id === userId)
      const canRefresh = member && CAN_MANAGE_STRIPE.includes(member.role)
      fetchStripeStatus(bandData.band.id, canRefresh || false)
    }
  }, [bandData?.band?.id, token, userId, fetchStripeStatus])

  // Connect Stripe
  const handleConnectStripe = async () => {
    if (!bandData?.band?.id || !token) return

    try {
      setConnectingStripe(true)
      const response = await fetch(`${API_URL}/api/bands/${bandData.band.id}/stripe/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to Stripe OAuth
        window.location.href = data.url
      } else {
        const error = await response.json()
        showToast(error.message || 'Failed to start Stripe connection', 'error')
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error)
      showToast('Failed to connect Stripe', 'error')
    } finally {
      setConnectingStripe(false)
    }
  }

  // Disconnect Stripe
  const handleDisconnectStripe = async () => {
    if (!bandData?.band?.id || !token) return

    try {
      setDisconnectingStripe(true)
      const response = await fetch(`${API_URL}/api/bands/${bandData.band.id}/stripe/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        showToast('Stripe account disconnected', 'success')
        setStripeStatus({ connected: false })
        setShowDisconnectModal(false)
      } else {
        const error = await response.json()
        showToast(error.message || 'Failed to disconnect Stripe', 'error')
      }
    } catch (error) {
      console.error('Error disconnecting Stripe:', error)
      showToast('Failed to disconnect Stripe', 'error')
    } finally {
      setDisconnectingStripe(false)
    }
  }

  // Refresh Stripe status
  const handleRefreshStripe = async () => {
    if (!bandData?.band?.id || !token) return

    try {
      setStripeLoading(true)
      const response = await fetch(`${API_URL}/api/bands/${bandData.band.id}/stripe/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStripeStatus(data)
        showToast('Stripe status refreshed', 'success')
      } else {
        const error = await response.json()
        showToast(error.message || 'Failed to refresh Stripe status', 'error')
      }
    } catch (error) {
      console.error('Error refreshing Stripe:', error)
      showToast('Failed to refresh Stripe status', 'error')
    } finally {
      setStripeLoading(false)
    }
  }

  if (bandLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Finance"
          isMember={false}
        >
          <Loading message="Loading finance..." />
        </BandLayout>
      </>
    )
  }

  if (!bandData?.band) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Finance"
          isMember={false}
        >
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
  const canManageStripe = currentMember && CAN_MANAGE_STRIPE.includes(currentMember.role)

  // Get treasurers from members
  const treasurers = band.members.filter((m: any) => m.isTreasurer && m.status === 'ACTIVE')

  // Get buckets (we'll need to add this to the band query or create a separate query)
  const buckets = (band as any).buckets || []

  // Get finance settings
  const financeSettings = (band as any).financeSettings

  const getBucketTypeBadge = (type: string) => {
    const colors: Record<string, 'success' | 'info' | 'warning' | 'neutral' | 'danger'> = {
      OPERATING: 'success',
      PROJECT: 'info',
      RESTRICTED: 'danger',
      UNRESTRICTED: 'neutral',
      COMMITMENT: 'warning',
    }
    return <Badge variant={colors[type] || 'neutral'}>{type.replace('_', ' ')}</Badge>
  }

  const getBucketTypeDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      OPERATING: 'Day-to-day operational expenses like supplies, utilities, recurring costs',
      PROJECT: 'Funds allocated to specific approved projects',
      RESTRICTED: 'Funds with specific usage restrictions (e.g., grants, donations with conditions)',
      UNRESTRICTED: 'General purpose funds available for any band-approved use',
      COMMITMENT: 'Funds reserved for future obligations or planned expenses',
    }
    return descriptions[type] || 'General fund category'
  }

  const getVisibilityBadge = (visibility: string) => {
    return visibility === 'OFFICERS_ONLY'
      ? <Badge variant="warning">Officers Only</Badge>
      : <Badge variant="neutral">All Members</Badge>
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        pageTitle="Finance"
        canApprove={canApprove}
        isMember={isMember}
      >
        <Stack spacing="xl">
          {/* Stripe Connect Section */}
          <Card>
            <Stack spacing="lg">
              <Flex justify="between" align="center">
                <Stack spacing="sm">
                  <Heading level={2}>Payment Processing</Heading>
                  <Text color="muted">Connect a Stripe account to receive payments directly</Text>
                </Stack>
                {stripeStatus?.connected && canManageStripe && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshStripe}
                    disabled={stripeLoading}
                  >
                    Refresh Status
                  </Button>
                )}
              </Flex>

              {stripeLoading ? (
                <Loading message="Loading Stripe status..." />
              ) : stripeStatus?.connected ? (
                <Stack spacing="md">
                  <Flex gap="md" align="center" className="flex-wrap">
                    <Badge variant="success">Connected</Badge>
                    {stripeStatus.chargesEnabled ? (
                      <Badge variant="success">Charges Enabled</Badge>
                    ) : (
                      <Badge variant="warning">Charges Not Enabled</Badge>
                    )}
                    {stripeStatus.detailsSubmitted ? (
                      <Badge variant="success">Details Complete</Badge>
                    ) : (
                      <Badge variant="warning">Details Incomplete</Badge>
                    )}
                  </Flex>

                  <Card className="bg-gray-50">
                    <Stack spacing="sm">
                      <Flex justify="between">
                        <Text variant="small" color="muted">Stripe Account ID</Text>
                        <Text variant="small" className="font-mono">{stripeStatus.stripeAccountId}</Text>
                      </Flex>
                      {stripeStatus.connectedAt && (
                        <Flex justify="between">
                          <Text variant="small" color="muted">Connected</Text>
                          <Text variant="small">{new Date(stripeStatus.connectedAt).toLocaleDateString()}</Text>
                        </Flex>
                      )}
                    </Stack>
                  </Card>

                  {!stripeStatus.chargesEnabled && (
                    <Alert variant="warning">
                      <Text>
                        Your Stripe account setup is incomplete. Please complete your account setup in the{' '}
                        <a
                          href="https://dashboard.stripe.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Stripe Dashboard
                        </a>{' '}
                        to start accepting payments.
                      </Text>
                    </Alert>
                  )}

                  {canManageStripe && (
                    <Flex justify="end">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setShowDisconnectModal(true)}
                      >
                        Disconnect Stripe
                      </Button>
                    </Flex>
                  )}
                </Stack>
              ) : (
                <Stack spacing="md">
                  <Alert variant="info">
                    <Text>
                      No Stripe account connected. Connect a Stripe account to allow the band to receive
                      payments directly. Band-It never touches your funds - payments go straight to your account.
                    </Text>
                  </Alert>

                  {canManageStripe ? (
                    <Button
                      variant="primary"
                      onClick={handleConnectStripe}
                      disabled={connectingStripe}
                    >
                      {connectingStripe ? 'Connecting...' : 'Connect Stripe Account'}
                    </Button>
                  ) : (
                    <Text variant="small" color="muted">
                      Only Founders and Governors can connect Stripe accounts.
                    </Text>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>

          {/* Treasurers Section */}
          <Card>
            <Stack spacing="lg">
              <Stack spacing="sm">
                <Heading level={2}>Treasurers</Heading>
                <Text color="muted">
                  Treasurers are trusted members responsible for managing the band's finances.
                  They can view all financial information, manage buckets (depending on policy),
                  and oversee fund allocations. This is a responsibility flag, not a role change.
                </Text>
              </Stack>

              {treasurers.length > 0 ? (
                <Stack spacing="sm">
                  {treasurers.map((member: any) => (
                    <Flex key={member.id} justify="between" align="center" className="py-2 border-b border-gray-100 last:border-0">
                      <Flex gap="sm" align="center">
                        <Text weight="semibold">{member.user.name}</Text>
                        <Badge variant="info">{member.role.replace('_', ' ')}</Badge>
                      </Flex>
                      <Badge variant="success">Treasurer</Badge>
                    </Flex>
                  ))}
                </Stack>
              ) : (
                <Card className="bg-gray-50 border-dashed">
                  <Stack spacing="sm">
                    <Text weight="semibold">No treasurers assigned yet</Text>
                    <Text variant="small" color="muted">
                      To add a treasurer, create a Governance proposal with the "Add Treasurer" effect.
                      Once approved by the band, the member will gain treasurer responsibilities.
                    </Text>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Card>

          {/* Buckets Section */}
          <Card>
            <Stack spacing="lg">
              <Stack spacing="sm">
                <Heading level={2}>Buckets</Heading>
                <Text color="muted">
                  Buckets are virtual containers for organizing and tracking the band's funds by purpose.
                  They help ensure money is allocated appropriately and spent according to band decisions.
                  Think of them like separate "accounts" within your overall treasury.
                </Text>
              </Stack>

              {financeSettings && (
                <Card className="bg-gray-50">
                  <Flex gap="sm" align="center">
                    <Text variant="small" weight="semibold">Management Policy:</Text>
                    <Badge variant={financeSettings.bucketManagementPolicy === 'TREASURER_ONLY' ? 'warning' : 'info'}>
                      {financeSettings.bucketManagementPolicy === 'TREASURER_ONLY' ? 'Treasurer Only' : 'Officer Tier'}
                    </Badge>
                    <Text variant="small" color="muted">
                      {financeSettings.bucketManagementPolicy === 'TREASURER_ONLY'
                        ? '— Only treasurers can manage bucket funds'
                        : '— Officers (Conductor+) can manage bucket funds'}
                    </Text>
                  </Flex>
                </Card>
              )}

              {buckets.length > 0 ? (
                <Stack spacing="sm">
                  {buckets.filter((b: any) => b.isActive).map((bucket: any) => (
                    <Card key={bucket.id} className="bg-gray-50">
                      <Flex justify="between" align="start">
                        <Stack spacing="sm">
                          <Text weight="semibold">{bucket.name}</Text>
                          <Flex gap="sm">
                            {getBucketTypeBadge(bucket.type)}
                            {getVisibilityBadge(bucket.visibility)}
                          </Flex>
                          <Text variant="small" color="muted">
                            {getBucketTypeDescription(bucket.type)}
                          </Text>
                        </Stack>
                      </Flex>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Card className="bg-gray-50 border-dashed">
                  <Stack spacing="md">
                    <Text weight="semibold">No buckets created yet</Text>
                    <Text variant="small" color="muted">
                      To create buckets, submit a Governance proposal with "Create Bucket" effects.
                      Once approved, the buckets will appear here.
                    </Text>
                    <Stack spacing="sm">
                      <Text variant="small" weight="semibold">Bucket Types:</Text>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div><Badge variant="success">OPERATING</Badge> — Day-to-day expenses</div>
                        <div><Badge variant="info">PROJECT</Badge> — Funds for specific projects</div>
                        <div><Badge variant="danger">RESTRICTED</Badge> — Specific usage restrictions</div>
                        <div><Badge variant="neutral">UNRESTRICTED</Badge> — General purpose funds</div>
                        <div><Badge variant="warning">COMMITMENT</Badge> — Future obligations</div>
                      </div>
                    </Stack>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Card>

          {/* Finance Governance Info */}
          <Card className="bg-blue-50 border-blue-200">
            <Stack spacing="md">
              <Heading level={3}>How to Manage Band Finances</Heading>
              <Text variant="small">
                All finance changes require band approval through governance proposals. This ensures
                transparency and democratic control over the band's money.
              </Text>

              <Stack spacing="sm">
                <Text variant="small" weight="semibold">Available Finance Actions:</Text>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li><strong>Add/Remove Treasurer</strong> — Assign or remove treasurer responsibilities from a member</li>
                  <li><strong>Create Bucket</strong> — Create a new fund category for organizing money</li>
                  <li><strong>Update Bucket</strong> — Change a bucket's name, type, or visibility</li>
                  <li><strong>Deactivate Bucket</strong> — Archive a bucket that's no longer needed</li>
                  <li><strong>Set Management Policy</strong> — Control who can manage bucket funds</li>
                </ul>
              </Stack>

              <Text variant="small" color="muted">
                To make changes, create a new proposal, select "Governance" as the execution type,
                and choose "Finance Bucket Governance" as the subtype.
              </Text>

              {isMember && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(`/bands/${slug}/proposals/create`)}
                >
                  Create Finance Proposal
                </Button>
              )}
            </Stack>
          </Card>
        </Stack>

        {/* Disconnect Confirmation Modal */}
        <Modal isOpen={showDisconnectModal} onClose={() => setShowDisconnectModal(false)}>
          <Stack spacing="lg">
            <Heading level={2}>Disconnect Stripe Account?</Heading>
            <Text>
              Are you sure you want to disconnect the Stripe account? The band will no longer
              be able to receive payments until a new account is connected.
            </Text>
            <Text variant="small" color="muted">
              This action does not affect your Stripe account itself - you can reconnect
              the same account or a different one at any time.
            </Text>
            <Flex gap="md" justify="end">
              <Button
                variant="ghost"
                onClick={() => setShowDisconnectModal(false)}
                disabled={disconnectingStripe}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDisconnectStripe}
                disabled={disconnectingStripe}
              >
                {disconnectingStripe ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </Flex>
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}
