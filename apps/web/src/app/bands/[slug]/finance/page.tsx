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
          wide={true}
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
          wide={true}
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
        bandImageUrl={band.imageUrl}
        pageTitle="Finance"
        canApprove={canApprove}
        isMember={isMember}
        wide={true}
        bandId={band.id}
        userId={userId || undefined}
      >
        <Stack spacing="md">
          {/* Stripe Connect Section */}
          <div className="border border-gray-200 rounded-lg bg-white p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <Heading level={2}>Payment Processing</Heading>
                <Text variant="small" color="muted">Connect a Stripe account to receive payments directly</Text>
              </div>
              {stripeStatus?.connected && canManageStripe && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshStripe}
                  disabled={stripeLoading}
                >
                  Refresh
                </Button>
              )}
            </div>

            {stripeLoading ? (
              <Loading message="Loading Stripe status..." />
            ) : stripeStatus?.connected ? (
              <Stack spacing="sm">
                <Flex gap="sm" align="center" className="flex-wrap">
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

                <div className="flex items-center gap-4 text-sm text-gray-500 py-2 px-3 bg-gray-50 rounded">
                  <span>ID: <span className="font-mono">{stripeStatus.stripeAccountId}</span></span>
                  {stripeStatus.connectedAt && (
                    <>
                      <span>•</span>
                      <span>Connected: {new Date(stripeStatus.connectedAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>

                {!stripeStatus.chargesEnabled && (
                  <Alert variant="warning">
                    <Text variant="small">
                      Setup incomplete. Complete your account in the{' '}
                      <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Stripe Dashboard
                      </a>.
                    </Text>
                  </Alert>
                )}

                {canManageStripe && (
                  <div className="flex justify-end pt-2">
                    <Button variant="danger" size="sm" onClick={() => setShowDisconnectModal(true)}>
                      Disconnect
                    </Button>
                  </div>
                )}
              </Stack>
            ) : (
              <Stack spacing="sm">
                <Text variant="small" color="muted">
                  No Stripe account connected. Connect to receive payments directly.
                </Text>
                {canManageStripe ? (
                  <Button variant="primary" size="sm" onClick={handleConnectStripe} disabled={connectingStripe}>
                    {connectingStripe ? 'Connecting...' : 'Connect Stripe Account'}
                  </Button>
                ) : (
                  <Text variant="small" color="muted">Only Founders and Governors can connect Stripe.</Text>
                )}
              </Stack>
            )}
          </div>

          {/* Treasurers Section */}
          <div className="border border-gray-200 rounded-lg bg-white p-4">
            <div className="mb-2">
              <Heading level={2}>Treasurers</Heading>
              <Text variant="small" color="muted">Members responsible for managing band finances</Text>
            </div>

            {treasurers.length > 0 ? (
              <div className="border border-gray-100 rounded overflow-hidden mt-3">
                {treasurers.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between py-2 px-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <Text weight="semibold">{member.user.name}</Text>
                      <Badge variant="info">{member.role.replace('_', ' ')}</Badge>
                    </div>
                    <Badge variant="success">Treasurer</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded p-3 mt-3">
                <Text variant="small" color="muted">
                  No treasurers yet. Create a Governance proposal with "Add Treasurer" to assign one.
                </Text>
              </div>
            )}
          </div>

          {/* Buckets Section */}
          <div className="border border-gray-200 rounded-lg bg-white p-4">
            <div className="mb-2">
              <Heading level={2}>Buckets</Heading>
              <Text variant="small" color="muted">Virtual containers for organizing funds by purpose</Text>
            </div>

            {financeSettings && (
              <div className="flex items-center gap-2 text-sm py-2 px-3 bg-gray-50 rounded mt-3">
                <span className="font-medium">Policy:</span>
                <Badge variant={financeSettings.bucketManagementPolicy === 'TREASURER_ONLY' ? 'warning' : 'info'}>
                  {financeSettings.bucketManagementPolicy === 'TREASURER_ONLY' ? 'Treasurer Only' : 'Officer Tier'}
                </Badge>
              </div>
            )}

            {buckets.length > 0 ? (
              <div className="border border-gray-100 rounded overflow-hidden mt-3">
                {buckets.filter((b: any) => b.isActive).map((bucket: any) => (
                  <div key={bucket.id} className="py-2 px-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Text weight="semibold">{bucket.name}</Text>
                      {getBucketTypeBadge(bucket.type)}
                      {getVisibilityBadge(bucket.visibility)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded p-3 mt-3">
                <Text variant="small" color="muted" className="mb-2">
                  No buckets yet. Create via Governance proposal with "Create Bucket".
                </Text>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span><Badge variant="success">OPERATING</Badge></span>
                  <span><Badge variant="info">PROJECT</Badge></span>
                  <span><Badge variant="danger">RESTRICTED</Badge></span>
                  <span><Badge variant="neutral">UNRESTRICTED</Badge></span>
                  <span><Badge variant="warning">COMMITMENT</Badge></span>
                </div>
              </div>
            )}
          </div>

          {/* Finance Governance Info */}
          <div className="border border-blue-200 rounded-lg bg-blue-50 p-4">
            <Heading level={3}>How to Manage Finances</Heading>
            <Text variant="small" color="muted" className="mt-1">
              All changes require approval via governance proposals for transparency.
            </Text>

            <div className="mt-3 text-sm text-gray-600">
              <span className="font-medium">Actions: </span>
              Add/Remove Treasurer • Create/Update/Deactivate Bucket • Set Management Policy
            </div>

            {isMember && (
              <div className="mt-3">
                <Button variant="primary" size="sm" onClick={() => router.push(`/bands/${slug}/proposals/create`)}>
                  Create Finance Proposal
                </Button>
              </div>
            )}
          </div>
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
