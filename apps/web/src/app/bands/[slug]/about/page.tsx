'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import { MIN_MEMBERS_TO_ACTIVATE } from '@band-it/shared'
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
  BillingBanner
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

// Expandable text component
function ExpandableText({ text, maxLength = 150 }: { text: string; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > maxLength

  if (!isLong) return <Text color="muted">{text}</Text>

  return (
    <div>
      <Text color="muted" className={!expanded ? 'line-clamp-2' : ''}>
        {text}
      </Text>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-blue-600 hover:underline mt-1"
      >
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  )
}

// Expandable section component
function ExpandableSection({ title, children, defaultExpanded = false }: {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-3 text-left hover:bg-gray-50 -mx-4 px-4"
      >
        <Text weight="semibold">{title}</Text>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && <div className="pb-3">{children}</div>}
    </div>
  )
}

export default function BandAboutPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showMoreDetails, setShowMoreDetails] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
      }
    }
  }, [])

  const { data: bandData, isLoading, refetch } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const leaveBandMutation = trpc.band.leaveBand.useMutation({
    onSuccess: () => {
      showToast('You have left the band', 'success')
      router.push('/bands/my-bands')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleLeaveBand = () => {
    if (!userId || !bandData?.band) return
    leaveBandMutation.mutate({
      bandId: bandData.band.id,
      userId,
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>
      case 'INACTIVE':
        return <Badge variant="neutral">Inactive</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="About"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading band..." />
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
          pageTitle="Band Not Found"
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
  const isFounder = currentMember?.role === 'FOUNDER'
  const canLeave = isMember && !isFounder
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="About"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        action={
          canLeave ? (
            <Button variant="danger" size="md" onClick={() => setShowLeaveModal(true)}>
              Leave Band
            </Button>
          ) : undefined
        }
      >
        <Stack spacing="md">
          {/* Status Alert */}
          {band.status === 'PENDING' && (
            <Alert variant="warning">
              <Text variant="small">This band needs {MIN_MEMBERS_TO_ACTIVATE - band.members.length} more active member(s) to become active.</Text>
            </Alert>
          )}

          {/* Billing Banner */}
          {isMember && userId && (
            <BillingBanner bandId={band.id} bandSlug={slug} userId={userId} />
          )}

          {/* Main Info Card - Compact */}
          <Card>
            {/* Header Row: Status + Member Count + Location */}
            <Flex gap="sm" align="center" className="mb-3">
              {getStatusBadge(band.status)}
              <Badge variant="info">{band.members.length} members</Badge>
              {band.zipcode && <Badge variant="neutral">📍 {band.zipcode}</Badge>}
            </Flex>

            {/* Description */}
            {band.description && (
              <div className="mb-3">
                <ExpandableText text={band.description} maxLength={200} />
              </div>
            )}

            {/* Mission - inline if short */}
            {band.mission && (
              <div className="mb-3">
                <Text variant="small" weight="semibold" className="text-gray-500 mb-1">Mission</Text>
                <ExpandableText text={band.mission} maxLength={150} />
              </div>
            )}

            {/* Values - as tags */}
            {band.values && band.values.length > 0 && (
              <div className="mb-3">
                <Text variant="small" weight="semibold" className="text-gray-500 mb-1">Values</Text>
                <Flex gap="sm" wrap="wrap">
                  {band.values.map((value: string, index: number) => (
                    <span key={index} className="text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {value}
                    </span>
                  ))}
                </Flex>
              </div>
            )}

            {/* More Details - Expandable */}
            <button
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
            >
              {showMoreDetails ? 'Hide details' : 'More details'}
              <svg
                className={`w-4 h-4 transition-transform ${showMoreDetails ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showMoreDetails && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Stack spacing="md">
                  {/* Skills Looking For */}
                  {band.skillsLookingFor && band.skillsLookingFor.length > 0 && (
                    <div>
                      <Text variant="small" weight="semibold" className="text-gray-500 mb-1">Skills We're Looking For</Text>
                      <Flex gap="sm" wrap="wrap">
                        {band.skillsLookingFor.map((skill: string, index: number) => (
                          <span key={index} className="text-sm bg-green-50 text-green-700 px-2 py-0.5 rounded">
                            {skill}
                          </span>
                        ))}
                      </Flex>
                    </div>
                  )}

                  {/* What Members Will Learn */}
                  {band.whatMembersWillLearn && band.whatMembersWillLearn.length > 0 && (
                    <div>
                      <Text variant="small" weight="semibold" className="text-gray-500 mb-1">What You'll Learn</Text>
                      <Flex gap="sm" wrap="wrap">
                        {band.whatMembersWillLearn.map((item: string, index: number) => (
                          <span key={index} className="text-sm bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                            {item}
                          </span>
                        ))}
                      </Flex>
                    </div>
                  )}

                  {/* Membership Requirements */}
                  {band.membershipRequirements && (
                    <div>
                      <Text variant="small" weight="semibold" className="text-gray-500 mb-1">Membership Requirements</Text>
                      <Text variant="small" color="muted">{band.membershipRequirements}</Text>
                    </div>
                  )}

                  {/* Who Can Approve */}
                  {band.whoCanApprove && band.whoCanApprove.length > 0 && (
                    <div>
                      <Text variant="small" weight="semibold" className="text-gray-500 mb-1">Who Can Approve Members</Text>
                      <Flex gap="sm" wrap="wrap">
                        {band.whoCanApprove.map((role: string, index: number) => (
                          <Badge key={index} variant="neutral">{role.replace('_', ' ')}</Badge>
                        ))}
                      </Flex>
                    </div>
                  )}
                </Stack>
              </div>
            )}
          </Card>

          {/* Members Card - Compact */}
          <Card>
            <Flex justify="between" align="center" className="mb-2">
              <Text weight="semibold">Members ({band.members.length})</Text>
              <Button variant="ghost" size="sm" onClick={() => router.push(`/bands/${slug}/members`)}>
                View all
              </Button>
            </Flex>
            <Stack spacing="xs">
              {band.members.slice(0, 5).map((member: any) => (
                <Flex key={member.id} justify="between" align="center" className="py-1">
                  <Text variant="small">{member.user.name}</Text>
                  <Badge variant="info" className="text-xs">{member.role.replace('_', ' ')}</Badge>
                </Flex>
              ))}
              {band.members.length > 5 && (
                <Text variant="small" color="muted" className="text-center py-1">
                  +{band.members.length - 5} more members
                </Text>
              )}
            </Stack>
          </Card>
        </Stack>

        <Modal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)}>
          <Stack spacing="lg">
            <Heading level={2}>Leave {band.name}?</Heading>
            <Alert variant="warning">
              <Text variant="small" weight="bold">Are you sure?</Text>
              <Text variant="small">You will need to apply or be invited again to rejoin.</Text>
            </Alert>
            <Flex gap="md" justify="end">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowLeaveModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleLeaveBand}
                disabled={leaveBandMutation.isPending}
              >
                {leaveBandMutation.isPending ? 'Leaving...' : 'Leave Band'}
              </Button>
            </Flex>
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}
