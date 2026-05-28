'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/components/ui'
import { WELCOME_INTERESTS, type WelcomeInterest } from '@/lib/welcomeInterests'
import { buildNextMoves } from '@/lib/profileSignals'
import { EMPTY_PROFILE_FORM, type EndUserProfileForm } from '@/lib/endUserProfile'

const MISSION_COPY =
  'The world is changing faster than any of us can fully predict. AI is already reshaping the way we work, create, connect, and move through daily life. No one really knows where it all leads from here. Band It is our attempt to explore that future together — not by replacing what makes us human, but by helping people discover more of what they\u2019re capable of becoming. We all shine in certain parts of life and struggle in others. Over time, Band It hopes to learn alongside you, helping amplify your strengths, support your weak spots, and open doors to opportunities, people, and experiences that help you grow into a fuller version of yourself — at work, at play, and in the world around you.'

function profileToForm(profile: {
  locationId: string | null
  resumeText: string | null
  resumeFileId: string | null
  resumeFile: { originalName: string } | null
  workExperience: unknown
  education: unknown
  certifications: unknown
  skills: EndUserProfileForm['skills']
  causes: EndUserProfileForm['causes']
  playInterests: EndUserProfileForm['playInterests']
}): EndUserProfileForm {
  return {
    locationId: profile.locationId ?? '',
    locationLabel: '',
    locationCity: '',
    locationState: '',
    locationZip: '',
    resumeText: profile.resumeText ?? '',
    resumeFileId: profile.resumeFileId,
    resumeFileName: profile.resumeFile?.originalName ?? null,
    workExperience: (profile.workExperience as EndUserProfileForm['workExperience']) ?? [],
    education: (profile.education as EndUserProfileForm['education']) ?? [],
    certifications: (profile.certifications as EndUserProfileForm['certifications']) ?? [],
    skills: profile.skills,
    causes: profile.causes,
    playInterests: profile.playInterests,
  }
}

type Props = {
  userId: string
}

export function DailyOnboarding({ userId }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [selectedInterestId, setSelectedInterestId] = useState<string | null>(null)

  const utils = trpc.useUtils()

  const { data: welcomeState, isLoading: welcomeLoading } =
    trpc.onboarding.getUserWelcomeState.useQuery({ userId })
  const { data: invitationsData } = trpc.band.getMyInvitations.useQuery({ userId })
  const { data: profileData, isLoading: profileLoading } = trpc.profile.get.useQuery({ userId })

  const completeWelcomeMutation = trpc.onboarding.completeWelcome.useMutation({
    onSuccess: () => utils.onboarding.getUserWelcomeState.invalidate({ userId }),
  })

  const acceptMutation = trpc.band.acceptInvitation.useMutation({
    onSuccess: () => {
      showToast('Invitation accepted — welcome aboard.', 'success')
      completeWelcomeMutation.mutate(
        { userId },
        { onSuccess: () => router.push('/bands/my-bands') }
      )
    },
    onError: (error) => showToast(error.message, 'error'),
  })

  const invitations = invitationsData?.invitations ?? []
  const hasCompletedWelcome = welcomeState?.hasCompletedWelcome ?? false
  const profileCompleted = profileData?.profile?.profileCompleted ?? false

  // Assume incomplete until loaded — avoids hiding guidance while queries are in flight.
  const showInterests = welcomeLoading || !hasCompletedWelcome
  const showProfile = profileLoading || !profileCompleted
  const needsGuidance = showInterests || showProfile

  if (!needsGuidance && invitations.length === 0) {
    return null
  }

  const selectedInterest = WELCOME_INTERESTS.find((item) => item.id === selectedInterestId)
  const profileForm = profileData?.profile ? profileToForm(profileData.profile) : EMPTY_PROFILE_FORM
  const nextMoves = showProfile ? buildNextMoves(profileForm, 3) : []

  const finishWelcome = (path: string) => {
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
      completeWelcomeMutation.mutate(
        { userId },
        {
          onSuccess: () => {
            showToast('When you\u2019re ready, tell us about yourself below.', 'info')
            document.getElementById('daily-profile-section')?.scrollIntoView({ behavior: 'smooth' })
          },
        }
      )
      return
    }

    if (selectedInterest.action === 'discover') {
      finishWelcome('/discover')
      return
    }

    if (selectedInterest.action === 'band' && selectedInterest.templateId) {
      completeWelcomeMutation.mutate(
        { userId },
        {
          onSuccess: () =>
            router.push(`/bands/create?template=${selectedInterest.templateId}`),
        }
      )
    }
  }

  return (
    <div className="np-daily-onboarding">
      <section className="np-welcome-lead" aria-labelledby="daily-orientation-heading">
        <p className="np-cat np-cat-left">First edition</p>
        <h1 id="daily-orientation-heading" className="np-welcome-headline">
          Welcome to your Daily
        </h1>
        <p className="np-welcome-dek">
          This is your home on Band It — a personal edition that gets sharper as you tell us who you
          are and what you&apos;re looking for. Take your time. The sections below are yours to
          fill in when you&apos;re ready.
        </p>
      </section>

      <section className="np-welcome-block" aria-labelledby="daily-mission-heading">
        <h2 id="daily-mission-heading" className="np-picks-header">
          Why Band It
        </h2>
        <blockquote className="np-profile-pullquote">{MISSION_COPY}</blockquote>
      </section>

      {invitations.length > 0 ? (
        <section className="np-welcome-block" aria-labelledby="daily-invites-heading">
          <h2 id="daily-invites-heading" className="np-picks-header">
            Invitations
          </h2>
          <p className="np-excerpt">Someone wants you in their band — join now or keep exploring below.</p>
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

      {showInterests ? (
        <section className="np-welcome-block" aria-labelledby="daily-interests-heading">
          <h2 id="daily-interests-heading" className="np-picks-header">
            What brings you here?
          </h2>
          <p className="np-headline-serif">Pick what you&apos;re here for today</p>
          <p className="np-field-hint np-welcome-hint">
            Optional — you can skip this and come back anytime.
          </p>

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
            <button
              type="button"
              className="np-profile-btn"
              onClick={() =>
                completeWelcomeMutation.mutate(
                  { userId },
                  { onSuccess: () => showToast('You can pick this up anytime.', 'info') }
                )
              }
              disabled={completeWelcomeMutation.isPending}
            >
              Skip for now
            </button>
          </div>
          <hr className="np-rule" />
        </section>
      ) : null}

      {showProfile ? (
        <section
          id="daily-profile-section"
          className="np-welcome-block"
          aria-labelledby="daily-profile-heading"
        >
          <h2 id="daily-profile-heading" className="np-picks-header">
            Your profile
          </h2>
          <p className="np-excerpt">
            We don&apos;t know much about you yet — and that&apos;s fine. When you&apos;re ready, a
            fuller profile helps us surface paid work, causes, and people that actually fit.
          </p>
          {nextMoves.length > 0 ? (
            <ul className="np-daily-next-moves">
              {nextMoves.map((move) => (
                <li key={move.id}>
                  <p className="np-daily-next-move-title">{move.title}</p>
                  <p className="np-field-hint">{move.detail}</p>
                </li>
              ))}
            </ul>
          ) : null}
          <Link href="/user-dashboard/profile" className="np-action np-action-left">
            Open your profile
          </Link>
          <hr className="np-rule" />
        </section>
      ) : null}

      <section className="np-welcome-block" aria-labelledby="daily-preview-heading">
        <h2 id="daily-preview-heading" className="np-picks-header">
          Your edition today
        </h2>
        <p className="np-excerpt">
          Below is what your Daily looks like right now — quiet because we don&apos;t know you yet.
          Paid work, discussions, and local opportunities will show up here as your profile and
          activity grow.
        </p>
        <hr className="np-rule" />
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
