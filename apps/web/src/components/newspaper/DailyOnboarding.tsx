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

const MISSION_LEAD = MISSION_COPY.charAt(0)
const MISSION_REST = MISSION_COPY.slice(1)

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

      <hr className="np-rule" />

      <div
        className={`np-daily-spread${showInterests ? '' : ' np-daily-spread--single'}`}
      >
        <article className="np-daily-spread-main" aria-labelledby="daily-mission-heading">
          <p className="np-cat np-cat-left">Editor&apos;s note</p>
          <h2 id="daily-mission-heading" className="np-picks-header">
            Why Band It
          </h2>
          <p className="np-daily-mission-body">
            <span className="np-dropcap" aria-hidden="true">
              {MISSION_LEAD}
            </span>
            {MISSION_REST}
          </p>
        </article>

        {showInterests ? (
          <aside className="np-daily-spread-rail" aria-labelledby="daily-interests-heading">
            <p className="np-cat np-cat-left">Open calls</p>
            <h2 id="daily-interests-heading" className="np-picks-header">
              What brings you here?
            </h2>
            <p className="np-byline np-byline-left">Pick one — or skip for now</p>

            <div className="np-daily-briefs">
              {WELCOME_INTERESTS.map((interest) => (
                <InterestBrief
                  key={interest.id}
                  interest={interest}
                  selected={selectedInterestId === interest.id}
                  onSelect={() => setSelectedInterestId(interest.id)}
                />
              ))}
            </div>

            <div className="np-daily-spread-actions">
              <button
                type="button"
                className="np-action np-action-left"
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
                className="np-daily-skip-link"
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
          </aside>
        ) : null}
      </div>

      {showProfile ? (
        <>
          <hr className="np-rule np-rule--spaced" />
          <section
            id="daily-profile-section"
            className="np-daily-profile-band"
            aria-labelledby="daily-profile-heading"
          >
            <div className="np-daily-profile-spread">
              <div className="np-daily-profile-main">
                <p className="np-cat np-cat-left">Member file</p>
                <h2 id="daily-profile-heading" className="np-headline-serif np-daily-profile-title">
                  Your profile
                </h2>
                <p className="np-excerpt">
                  We don&apos;t know much about you yet — and that&apos;s fine. When you&apos;re
                  ready, a fuller profile helps us surface paid work, causes, and people that
                  actually fit.
                </p>
                <Link href="/user-dashboard/profile" className="np-action np-action-left">
                  Open your profile
                </Link>
              </div>

              {nextMoves.length > 0 ? (
                <aside className="np-daily-profile-rail" aria-label="Suggested next steps">
                  <p className="np-cat np-cat-left">To do</p>
                  <ol className="np-daily-index">
                    {nextMoves.map((move, index) => (
                      <li key={move.id} className="np-daily-index-item">
                        <span className="np-daily-index-num">{index + 1}</span>
                        <div>
                          <p className="np-daily-index-title">{move.title}</p>
                          <p className="np-field-hint">{move.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </aside>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      <section className="np-daily-fold" aria-labelledby="daily-preview-heading">
        <hr className="np-rule np-rule--spaced" />
        <p id="daily-preview-heading" className="np-cat np-cat-left">
          Below the fold
        </p>
        <p className="np-excerpt np-daily-fold-copy">
          Your edition is quiet for now. Paid work, discussions, and local opportunities will show
          up here as your profile and activity grow.
        </p>
      </section>
    </div>
  )
}

function InterestBrief({
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
      className={`np-daily-brief${selected ? ' np-daily-brief--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="np-daily-brief-kicker">{interest.kicker}</span>
      <span className="np-daily-brief-body">
        <span className="np-daily-brief-title">{interest.title}</span>
        <span className="np-daily-brief-desc">{interest.description}</span>
      </span>
    </button>
  )
}
