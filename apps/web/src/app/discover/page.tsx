'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import {
  QuickLayout,
  QuickCard,
  QuickButton,
  QuickDivider,
  QuickBadge,
} from '@/components/quick'

const TIER_LABELS: Record<number, string> = {
  1: 'Strong Match',
  2: 'Good Match',
  3: 'Fair Match',
  4: 'Partial Match',
  5: 'Popular',
}

const TIER_VARIANTS: Record<number, 'success' | 'info' | 'warning' | 'default'> = {
  1: 'success',
  2: 'success',
  3: 'info',
  4: 'warning',
  5: 'default',
}

export default function DiscoverPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  // Check for authentication
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
        router.push('/login?returnTo=/discover')
      }
    } else {
      router.push('/login?returnTo=/discover')
    }
  }, [router])

  // Fetch invitations
  const {
    data: invitationsData,
    isLoading: invitationsLoading,
  } = trpc.band.getMyInvitations.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  // Fetch recommended bands
  const {
    data: recommendationsData,
    isLoading: recommendationsLoading,
  } = trpc.band.getRecommendedBands.useQuery(
    { userId: userId!, limit: 10 },
    { enabled: !!userId }
  )

  // Accept invitation mutation
  const acceptMutation = trpc.band.acceptInvitation.useMutation({
    onSuccess: () => {
      invitationsData // refetch handled by trpc invalidation
    },
  })

  // Decline invitation mutation
  const declineMutation = trpc.band.declineInvitation.useMutation()

  const utils = trpc.useUtils()

  const handleAccept = async (membershipId: string) => {
    if (!userId) return
    await acceptMutation.mutateAsync({ membershipId, userId })
    utils.band.getMyInvitations.invalidate({ userId })
    utils.band.getMyBands.invalidate({ userId })
    utils.band.getRecommendedBands.invalidate({ userId })
  }

  const handleDecline = async (membershipId: string) => {
    if (!userId) return
    await declineMutation.mutateAsync({ membershipId, userId })
    utils.band.getMyInvitations.invalidate({ userId })
  }

  const isLoading = invitationsLoading || recommendationsLoading || !userId

  if (isLoading) {
    return (
      <QuickLayout
        title="Discover Bands"
        isLoading={true}
      />
    )
  }

  const invitations = invitationsData?.invitations || []
  const recommendations = recommendationsData?.recommendations || []
  const hasProfile = recommendationsData?.hasProfile ?? false

  return (
    <QuickLayout
      title="Discover Bands"
      subtitle="Find bands that match your skills and interests"
    >
      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Pending Invitations
          </h2>
          <div className="space-y-3">
            {invitations.map((inv: any) => (
              <QuickCard key={inv.id}>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{inv.band.name}</h3>
                    {inv.band.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                        {inv.band.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <QuickButton
                      variant="success"
                      fullWidth
                      onClick={() => handleAccept(inv.id)}
                      disabled={acceptMutation.isPending}
                    >
                      {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
                    </QuickButton>
                    <QuickButton
                      variant="secondary"
                      fullWidth
                      onClick={() => handleDecline(inv.id)}
                      disabled={declineMutation.isPending}
                    >
                      Decline
                    </QuickButton>
                  </div>
                  <button
                    onClick={() => router.push(`/quick/band/${inv.band.slug}`)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Band Details
                  </button>
                </div>
              </QuickCard>
            ))}
          </div>
          <QuickDivider />
        </div>
      )}

      {/* Profile prompt */}
      {!hasProfile && (
        <QuickCard className="mb-4 bg-blue-50 border-blue-200">
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Complete Your Profile</h3>
            <p className="text-sm text-gray-600">
              Add your skills, interests, and location to get personalized band recommendations.
            </p>
            <QuickButton
              variant="primary"
              onClick={() => router.push('/profile')}
            >
              Update Profile
            </QuickButton>
          </div>
        </QuickCard>
      )}

      {/* Recommended Bands Section */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          {hasProfile ? 'Recommended for You' : 'Popular Bands'}
        </h2>

        {recommendationsData?.message && (
          <p className="text-sm text-gray-500 mb-3">{recommendationsData.message}</p>
        )}

        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec: any) => (
              <QuickCard key={rec.band.id}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{rec.band.name}</h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {rec.matchScore > 0 && (
                        <QuickBadge variant={TIER_VARIANTS[rec.matchTier] || 'default'}>
                          {rec.matchScore}% match
                        </QuickBadge>
                      )}
                      {rec.matchTier && rec.matchTier <= 4 && (
                        <QuickBadge variant={TIER_VARIANTS[rec.matchTier] || 'default'}>
                          {TIER_LABELS[rec.matchTier]}
                        </QuickBadge>
                      )}
                    </div>
                  </div>

                  {rec.band.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {rec.band.description}
                    </p>
                  )}

                  {/* Match reasons */}
                  {rec.matchReasons && rec.matchReasons.length > 0 && (
                    <div className="space-y-1">
                      {rec.matchReasons.map((reason: string, idx: number) => (
                        <p key={idx} className="text-xs text-green-700">
                          {reason}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-500">
                      {rec.band.memberCount} member{rec.band.memberCount !== 1 ? 's' : ''}
                    </span>
                    <QuickButton
                      variant="secondary"
                      onClick={() => router.push(`/quick/band/${rec.band.slug}`)}
                    >
                      View
                    </QuickButton>
                  </div>
                </div>
              </QuickCard>
            ))}
          </div>
        ) : (
          <QuickCard>
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No band recommendations available.</p>
              <p className="text-gray-400 text-xs mt-1">
                You may already be a member of all available bands.
              </p>
            </div>
          </QuickCard>
        )}
      </div>
    </QuickLayout>
  )
}
