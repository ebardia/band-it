'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/components/ui'
import {
  WELCOME_INTERESTS,
  profilePathForInterestIds,
  type WelcomeInterest,
} from '@/lib/welcomeInterests'
import { buildNextMoves, countProfileSignals } from '@/lib/profileSignals'
import { EMPTY_PROFILE_FORM, type EndUserProfileForm } from '@/lib/endUserProfile'
import { DAILY_CLASSIFIED_IMAGE } from '@/components/newspaper/newspaperPlaceholders'
import Image from 'next/image'

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
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([])
  const interestsHydratedRef = useRef(false)

  const utils = trpc.useUtils()

  const { data: welcomeState, isLoading: welcomeLoading } =
    trpc.onboarding.getUserWelcomeState.useQuery({ userId })
  const { data: invitationsData } = trpc.band.getMyInvitations.useQuery({ userId })
  const { data: profileData, isLoading: profileLoading } = trpc.profile.get.useQuery({ userId })

  const saveInterestsMutation = trpc.onboarding.saveWelcomeInterests.useMutation({
    onSuccess: () => utils.onboarding.getUserWelcomeState.invalidate({ userId }),
  })

  const dismissOnboardingMutation = trpc.onboarding.dismissDailyOnboarding.useMutation({
    onSuccess: () => utils.onboarding.getUserWelcomeState.invalidate({ userId }),
  })

  const acceptMutation = trpc.band.acceptInvitation.useMutation({
    onSuccess: () => {
      showToast('Invitation accepted — welcome aboard.', 'success')
      router.push('/bands/my-bands')
    },
    onError: (error) => showToast(error.message, 'error'),
  })

  useEffect(() => {
    if (interestsHydratedRef.current || !welcomeState) return
    interestsHydratedRef.current = true
    if (welcomeState.welcomeInterestIds.length > 0) {
      setSelectedInterestIds(welcomeState.welcomeInterestIds)
    }
  }, [welcomeState])

  const invitations = invitationsData?.invitations ?? []
  const onboardingDismissed = !!welcomeState?.dailyOnboardingDismissedAt
  const savedInterestIds = welcomeState?.welcomeInterestIds ?? []

  const profileForm = profileData?.profile ? profileToForm(profileData.profile) : EMPTY_PROFILE_FORM
  const signalStats = countProfileSignals(profileForm)

  const showInterests = welcomeLoading || !onboardingDismissed
  const showProfile = profileLoading || (signalStats.filled < signalStats.total && !onboardingDismissed)
  const needsGuidance = showInterests || showProfile

  if (!needsGuidance && invitations.length === 0) {
    return null
  }

  const nextMoves = showProfile ? buildNextMoves(profileForm, 3) : []
  const profileHref = profilePathForInterestIds(
    selectedInterestIds.length > 0 ? selectedInterestIds : savedInterestIds
  )

  const toggleInterest = (id: string) => {
    setSelectedInterestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleContinue = () => {
    if (selectedInterestIds.length === 0) {
      showToast('Pick at least one area — or skip for now.', 'error')
      return
    }

    const path = profilePathForInterestIds(selectedInterestIds)
    saveInterestsMutation.mutate(
      { userId, interestIds: selectedInterestIds },
      {
        onSuccess: () => router.push(path),
        onError: (error) => showToast(error.message, 'error'),
      }
    )
  }

  const handleDismiss = () => {
    dismissOnboardingMutation.mutate(
      { userId },
      {
        onSuccess: () => showToast('You can reopen your profile anytime from the menu.', 'info'),
        onError: (error) => showToast(error.message, 'error'),
      }
    )
  }

  const continueLabel =
    selectedInterestIds.length === 0
      ? 'Continue to your profile'
      : selectedInterestIds.length === 1
        ? `Continue — ${WELCOME_INTERESTS.find((i) => i.id === selectedInterestIds[0])?.title ?? 'your profile'}`
        : `Continue — ${selectedInterestIds.length} areas selected`

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

      <div className={`np-daily-spread${showInterests ? '' : ' np-daily-spread--single'}`}>
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

          <figure className="np-daily-classified">
            <p className="np-cat np-cat-left">Classified</p>
            <div className="np-daily-classified-frame">
              <Image
                src={DAILY_CLASSIFIED_IMAGE}
                alt="Vintage newspaper classified illustration: a woman with a speech bubble reading, I'm good at more than my resume says."
                width={1200}
                height={900}
                className="np-daily-classified-img"
                priority
              />
            </div>
            <figcaption className="np-daily-classified-caption">
              Your profile is your listing — tell the paper who you are when you&apos;re ready.
            </figcaption>
          </figure>
        </article>

        {showInterests ? (
          <aside className="np-daily-spread-rail" aria-labelledby="daily-interests-heading">
            <p className="np-cat np-cat-left">Open calls</p>
            <h2 id="daily-interests-heading" className="np-picks-header">
              What brings you here?
            </h2>
            <p className="np-byline np-byline-left">Pick any that fit — work, causes, play, and more</p>

            <div className="np-daily-briefs">
              {WELCOME_INTERESTS.map((interest) => (
                <InterestBrief
                  key={interest.id}
                  interest={interest}
                  selected={selectedInterestIds.includes(interest.id)}
                  onSelect={() => toggleInterest(interest.id)}
                />
              ))}
            </div>

            <div className="np-daily-spread-actions">
              <button
                type="button"
                className="np-action np-action-left"
                onClick={handleContinue}
                disabled={selectedInterestIds.length === 0 || saveInterestsMutation.isPending}
              >
                {saveInterestsMutation.isPending ? 'One moment…' : continueLabel}
              </button>
              <button
                type="button"
                className="np-daily-skip-link"
                onClick={() => showToast('No rush — your Daily will wait for you.', 'info')}
              >
                Skip for now
              </button>
              <button
                type="button"
                className="np-daily-skip-link"
                onClick={handleDismiss}
                disabled={dismissOnboardingMutation.isPending}
              >
                Hide this section
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
                  Signal strength {signalStats.filled}/{signalStats.total} — add what fits today; you
                  can always come back for the rest.
                </p>
                <Link href={profileHref} className="np-action np-action-left">
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
