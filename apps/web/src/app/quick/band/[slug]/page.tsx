'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import {
  QuickLayout,
  QuickCard,
  QuickButton,
  QuickDivider,
  QuickInfo,
  QuickBadge,
} from '@/components/quick'

// Desktop breakpoint (matches Tailwind's md:)
const DESKTOP_BREAKPOINT = 768

export default function QuickBandPreviewPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [userId, setUserId] = useState<string | null>(null)
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [applicationNotes, setApplicationNotes] = useState('')
  const [actionCompleted, setActionCompleted] = useState<'accepted' | 'declined' | 'applied' | null>(null)

  // Redirect desktop users to full band page
  useEffect(() => {
    if (typeof window !== 'undefined' && slug) {
      if (window.innerWidth >= DESKTOP_BREAKPOINT) {
        router.replace(`/bands/${slug}`)
        return
      }
    }
  }, [router, slug])

  // Check for authentication
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
        router.push(`/login?returnTo=/quick/band/${slug}`)
      }
    } else {
      router.push(`/login?returnTo=/quick/band/${slug}`)
    }
  }, [router, slug])

  // Fetch band preview context
  const {
    data: context,
    isLoading,
    error,
  } = trpc.quick.getBandPreviewContext.useQuery(
    { bandSlug: slug, userId: userId! },
    { enabled: !!userId && !!slug }
  )

  const utils = trpc.useUtils()

  // Accept invitation mutation
  const acceptMutation = trpc.band.acceptInvitation.useMutation({
    onSuccess: () => {
      setActionCompleted('accepted')
      utils.quick.getBandPreviewContext.invalidate({ bandSlug: slug, userId: userId! })
      utils.band.getMyInvitations.invalidate({ userId: userId! })
    },
  })

  // Decline invitation mutation
  const declineMutation = trpc.band.declineInvitation.useMutation({
    onSuccess: () => {
      setActionCompleted('declined')
      utils.quick.getBandPreviewContext.invalidate({ bandSlug: slug, userId: userId! })
      utils.band.getMyInvitations.invalidate({ userId: userId! })
    },
  })

  // Apply to join mutation
  const applyMutation = trpc.band.applyToJoin.useMutation({
    onSuccess: () => {
      setActionCompleted('applied')
      utils.quick.getBandPreviewContext.invalidate({ bandSlug: slug, userId: userId! })
    },
  })

  const handleAccept = () => {
    if (!userId || !context?.membershipId) return
    acceptMutation.mutate({ membershipId: context.membershipId, userId })
  }

  const handleDecline = () => {
    if (!userId || !context?.membershipId) return
    declineMutation.mutate({ membershipId: context.membershipId, userId })
  }

  const handleApply = () => {
    if (!userId || !context?.band.id) return
    applyMutation.mutate({
      userId,
      bandId: context.band.id,
      notes: applicationNotes,
    })
  }

  // Loading state
  if (isLoading || !userId) {
    return (
      <QuickLayout
        title="Loading..."
        isLoading={true}
      />
    )
  }

  // Error state
  if (error) {
    return (
      <QuickLayout
        title="Band Preview"
        error={error.message}
      />
    )
  }

  if (!context) {
    return (
      <QuickLayout
        title="Band Preview"
        error="Unable to load band details"
      />
    )
  }

  const { band, match, userStatus } = context

  // Success states
  if (actionCompleted === 'accepted') {
    return (
      <QuickLayout title="Invitation Accepted!">
        <QuickCard>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to {band.name}!
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              You're now an active member of this band.
            </p>
            <QuickButton
              variant="primary"
              fullWidth
              onClick={() => router.push(`/bands/${band.slug}`)}
            >
              Go to Band
            </QuickButton>
          </div>
        </QuickCard>
      </QuickLayout>
    )
  }

  if (actionCompleted === 'declined') {
    return (
      <QuickLayout title="Invitation Declined">
        <QuickCard>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">👋</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invitation Declined
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              You've declined the invitation to {band.name}.
            </p>
            <QuickButton
              variant="secondary"
              fullWidth
              onClick={() => router.push('/discover')}
            >
              Back to Discover
            </QuickButton>
          </div>
        </QuickCard>
      </QuickLayout>
    )
  }

  if (actionCompleted === 'applied') {
    return (
      <QuickLayout title="Application Sent!">
        <QuickCard>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">📩</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Application Submitted
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Your application to join {band.name} has been sent. A band leader will review it.
            </p>
            <QuickButton
              variant="secondary"
              fullWidth
              onClick={() => router.push('/discover')}
            >
              Back to Discover
            </QuickButton>
          </div>
        </QuickCard>
      </QuickLayout>
    )
  }

  return (
    <QuickLayout
      title={band.name}
    >
      {/* Band Details */}
      <QuickCard>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{band.name}</h2>
            <QuickBadge variant={band.status === 'ACTIVE' ? 'success' : 'default'}>
              {band.status}
            </QuickBadge>
          </div>

          {band.description && (
            <p className="text-sm text-gray-600">{band.description}</p>
          )}

          <QuickDivider />

          <QuickInfo
            label="Members"
            value={`${band.memberCount} active`}
          />

          {/* Values */}
          {band.values.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-1.5">Values</p>
              <div className="flex flex-wrap gap-1.5">
                {band.values.map((value: string, idx: number) => (
                  <span key={idx} className="inline-flex px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded-full">
                    {value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills they need */}
          {band.skillsLookingFor.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-1.5">Skills Needed</p>
              <div className="flex flex-wrap gap-1.5">
                {band.skillsLookingFor.map((skill: string, idx: number) => (
                  <span key={idx} className="inline-flex px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* What you'll learn */}
          {band.whatMembersWillLearn.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-1.5">What You'll Learn</p>
              <div className="flex flex-wrap gap-1.5">
                {band.whatMembersWillLearn.map((item: string, idx: number) => (
                  <span key={idx} className="inline-flex px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded-full">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </QuickCard>

      {/* Match Info */}
      {match.hasProfile && match.score > 0 && (
        <QuickCard className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Your Match</h3>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-green-600">{match.score}%</span>
            <span className="text-sm text-gray-500">match score</span>
          </div>
          {match.reasons.length > 0 && (
            <div className="space-y-1">
              {match.reasons.map((reason: string, idx: number) => (
                <p key={idx} className="text-sm text-green-700">{reason}</p>
              ))}
            </div>
          )}
        </QuickCard>
      )}

      {!match.hasProfile && (
        <QuickCard className="mt-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-gray-600">
            Complete your profile to see how well you match with this band.
          </p>
          <button
            onClick={() => router.push('/profile')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1"
          >
            Update Profile
          </button>
        </QuickCard>
      )}

      {/* Action Buttons */}
      <div className="mt-6 space-y-3">
        {userStatus === 'INVITED' && (
          <>
            <QuickButton
              variant="success"
              fullWidth
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? 'Accepting...' : 'Accept Invitation'}
            </QuickButton>
            <QuickButton
              variant="secondary"
              fullWidth
              onClick={handleDecline}
              disabled={declineMutation.isPending}
            >
              {declineMutation.isPending ? 'Declining...' : 'Decline'}
            </QuickButton>
          </>
        )}

        {userStatus === 'NONE' && !showApplyForm && (
          <QuickButton
            variant="primary"
            fullWidth
            onClick={() => setShowApplyForm(true)}
          >
            Apply to Join
          </QuickButton>
        )}

        {userStatus === 'NONE' && showApplyForm && (
          <QuickCard>
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Apply to Join</h3>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Why do you want to join? (min 10 characters)
                </label>
                <textarea
                  value={applicationNotes}
                  onChange={(e) => setApplicationNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Tell the band why you'd like to join..."
                />
              </div>
              {applyMutation.error && (
                <p className="text-sm text-red-600">{applyMutation.error.message}</p>
              )}
              <div className="flex gap-2">
                <QuickButton
                  variant="primary"
                  fullWidth
                  onClick={handleApply}
                  disabled={applicationNotes.length < 10 || applyMutation.isPending}
                >
                  {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
                </QuickButton>
                <QuickButton
                  variant="secondary"
                  onClick={() => {
                    setShowApplyForm(false)
                    setApplicationNotes('')
                  }}
                >
                  Cancel
                </QuickButton>
              </div>
            </div>
          </QuickCard>
        )}

        {userStatus === 'PENDING' && (
          <QuickButton
            variant="secondary"
            fullWidth
            disabled
          >
            Application Pending
          </QuickButton>
        )}

        {userStatus === 'ACTIVE' && (
          <QuickButton
            variant="primary"
            fullWidth
            onClick={() => router.push(`/bands/${band.slug}`)}
          >
            Go to Band
          </QuickButton>
        )}
      </div>
    </QuickLayout>
  )
}
