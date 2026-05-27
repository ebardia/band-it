'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import { Loading, useToast } from '@/components/ui'
import { WELCOME_INTERESTS, type WelcomeInterest } from '@/lib/welcomeInterests'

export default function WelcomePage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedInterestId, setSelectedInterestId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: { userId: string } = jwtDecode(token)
        setUserId(decoded.userId)
      } catch {
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const { data: welcomeState, isLoading: stateLoading } = trpc.onboarding.getUserWelcomeState.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: invitationsData, isLoading: invitationsLoading } = trpc.band.getMyInvitations.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const completeWelcomeMutation = trpc.onboarding.completeWelcome.useMutation()

  const acceptMutation = trpc.band.acceptInvitation.useMutation({
    onSuccess: () => {
      showToast('Invitation accepted — welcome aboard.', 'success')
      if (userId) {
        completeWelcomeMutation.mutate(
          { userId },
          { onSuccess: () => router.push('/bands/my-bands') }
        )
      }
    },
    onError: (error) => showToast(error.message, 'error'),
  })

  useEffect(() => {
    if (welcomeState?.hasCompletedWelcome && welcomeState.hasBands) {
      router.push('/bands/my-bands')
    }
  }, [welcomeState, router])

  const selectedInterest = WELCOME_INTERESTS.find((item) => item.id === selectedInterestId)

  const finishWelcome = (path: string) => {
    if (!userId) return
    completeWelcomeMutation.mutate(
      { userId },
      { onSuccess: () => router.push(path) }
    )
  }

  const handleContinue = () => {
    if (!selectedInterest) {
      showToast('Pick what brings you here first.', 'error')
      return
    }

    if (selectedInterest.action === 'profile') {
      finishWelcome('/user-dashboard/profile')
      return
    }

    if (selectedInterest.action === 'discover') {
      finishWelcome('/discover')
      return
    }

    if (selectedInterest.action === 'band' && selectedInterest.templateId) {
      router.push(`/bands/create?template=${selectedInterest.templateId}`)
    }
  }

  if (stateLoading || invitationsLoading || !userId) {
    return (
      <div className="np-shell">
        <Loading message="Opening your edition…" />
      </div>
    )
  }

  const invitations = invitationsData?.invitations ?? []

  return (
    <div className="np-shell np-welcome-shell">
      <header className="np-welcome-masthead">
        <p className="np-cat np-cat-left">First edition</p>
        <h1 className="np-welcome-headline">What brings you to Band It?</h1>
        <p className="np-welcome-dek">
          Pick what you&apos;re here for. We&apos;ll point you in the right direction — profile, a new band, or
          a look around.
        </p>
      </header>

      {invitations.length > 0 ? (
        <section className="np-welcome-invites" aria-labelledby="invites-heading">
          <p className="np-cat np-cat-left">Invitations</p>
          <h2 id="invites-heading" className="np-headline-serif">
            You&apos;ve been invited
          </h2>
          <p className="np-field-hint">Someone wants you in their band — join now or pick an interest below.</p>
          <ul className="np-welcome-invite-list">
            {invitations.map((invitation: { id: string; band: { name: string; description?: string } }) => (
              <li key={invitation.id} className="np-welcome-invite-row">
                <div>
                  <p className="np-welcome-invite-name">{invitation.band.name}</p>
                  {invitation.band.description ? (
                    <p className="np-field-hint">{invitation.band.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="np-profile-btn np-profile-btn-primary"
                  onClick={() => acceptMutation.mutate({ membershipId: invitation.id, userId })}
                  disabled={acceptMutation.isPending}
                >
                  {acceptMutation.isPending ? 'Joining…' : 'Join'}
                </button>
              </li>
            ))}
          </ul>
          <hr className="np-rule" />
        </section>
      ) : null}

      <section className="np-welcome-section" aria-labelledby="interests-heading">
        <p className="np-cat np-cat-left">Your interests</p>
        <h2 id="interests-heading" className="np-headline-serif">
          What are you looking for?
        </h2>

        <div className="np-welcome-interest-grid">
          {WELCOME_INTERESTS.map((interest) => (
            <InterestCard
              key={interest.id}
              interest={interest}
              selected={selectedInterestId === interest.id}
              onSelect={() => setSelectedInterestId(interest.id)}
            />
          ))}
        </div>

        <div className="np-profile-actions np-profile-actions--toolbar np-welcome-actions">
          <button
            type="button"
            className="np-profile-btn np-profile-btn-primary"
            onClick={handleContinue}
            disabled={!selectedInterest || completeWelcomeMutation.isPending}
          >
            {completeWelcomeMutation.isPending
              ? 'One moment…'
              : selectedInterest
                ? `Continue — ${selectedInterest.title}`
                : 'Continue'}
          </button>
        </div>
      </section>
    </div>
  )
}

function InterestCard({
  interest,
  selected,
  onSelect,
}: {
  interest: WelcomeInterest
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`np-welcome-interest-card${selected ? ' np-welcome-interest-card--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <p className="np-welcome-interest-kicker">{interest.kicker}</p>
      <p className="np-welcome-interest-title">{interest.title}</p>
      <p className="np-welcome-interest-desc">{interest.description}</p>
    </button>
  )
}
