'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/components/ui'
import { WELCOME_INTERESTS } from '@/lib/welcomeInterests'
import { countProfileSignals } from '@/lib/profileSignals'
import { profileToForm } from '@/lib/endUserProfile'
import { DAILY_CLASSIFIED_IMAGE } from '@/components/newspaper/newspaperPlaceholders'

const MISSION_COPY =
  'The world is changing faster than any of us can fully predict. AI is already reshaping the way we work, create, connect, and move through daily life. No one really knows where it all leads from here. Band It is our attempt to explore that future together — not by replacing what makes us human, but by helping people discover more of what they\u2019re capable of becoming. We all shine in certain parts of life and struggle in others. Over time, Band It hopes to learn alongside you, helping amplify your strengths, support your weak spots, and open doors to opportunities, people, and experiences that help you grow into a fuller version of yourself — at work, at play, and in the world around you.'

const MISSION_LEAD = MISSION_COPY.charAt(0)
const MISSION_REST = MISSION_COPY.slice(1)

const PROFILE_PATH = '/user-dashboard/profile'

type Props = {
  userId: string
}

export function DailyOnboarding({ userId }: Props) {
  const router = useRouter()
  const { showToast } = useToast()

  const { data: invitationsData } = trpc.band.getMyInvitations.useQuery({ userId })
  const {
    data: profileData,
    isLoading: profileLoading,
    isError: profileError,
  } = trpc.profile.get.useQuery({ userId })

  const acceptMutation = trpc.band.acceptInvitation.useMutation({
    onSuccess: () => {
      showToast('Invitation accepted — welcome aboard.', 'success')
      router.push('/bands/my-bands')
    },
    onError: (error) => showToast(error.message, 'error'),
  })

  const invitations = invitationsData?.invitations ?? []

  const profileForm = profileData?.profile ? profileToForm(profileData.profile) : null
  const signalStats = profileForm ? countProfileSignals(profileForm) : null

  // Onboarding shows only until the user fills out anything on their profile.
  // Once they have a signal, the regular Daily (their member file) takes over.
  // A failed profile query must not be treated as an empty profile.
  const showOnboarding = !profileLoading && !profileError && signalStats?.filled === 0

  if (!showOnboarding && invitations.length === 0) {
    return null
  }

  return (
    <div className="np-daily-onboarding">
      {showOnboarding ? (
        <section className="np-welcome-lead" aria-labelledby="daily-orientation-heading">
          <p className="np-cat np-cat-left">First edition</p>
          <h1 id="daily-orientation-heading" className="np-welcome-headline">
            Welcome to your Daily
          </h1>
          <p className="np-welcome-dek">
            This is your home on Band It — a personal edition that gets sharper as you tell us who
            you are and what you&apos;re looking for. Take your time. Your profile is where it all
            starts.
          </p>
        </section>
      ) : null}

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

      {showOnboarding ? (
        <>
          <hr className="np-rule" />

          <div className="np-daily-spread">
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

            <aside className="np-daily-spread-rail" aria-labelledby="daily-interests-heading">
              <p className="np-cat np-cat-left">Open calls</p>
              <h2 id="daily-interests-heading" className="np-picks-header">
                What brings you here?
              </h2>
              <p className="np-byline np-byline-left">
                Work, causes, play, and more — it all starts with your profile
              </p>

              <Link href={PROFILE_PATH} className="np-daily-briefs-link">
                <span className="np-daily-briefs">
                  {WELCOME_INTERESTS.map((interest) => (
                    <span key={interest.id} className="np-daily-brief np-daily-brief--static">
                      <span className="np-daily-brief-kicker">{interest.kicker}</span>
                      <span className="np-daily-brief-body">
                        <span className="np-daily-brief-title">{interest.title}</span>
                        <span className="np-daily-brief-desc">{interest.description}</span>
                      </span>
                    </span>
                  ))}
                </span>
                <span className="np-action np-action-left np-daily-briefs-cta">
                  Start your profile
                </span>
              </Link>
            </aside>
          </div>

          <section className="np-daily-fold" aria-labelledby="daily-preview-heading">
            <hr className="np-rule np-rule--spaced" />
            <p id="daily-preview-heading" className="np-cat np-cat-left">
              Below the fold
            </p>
            <p className="np-excerpt np-daily-fold-copy">
              Your edition is quiet for now. Paid work, discussions, and local opportunities will
              show up here as your profile and activity grow.
            </p>
          </section>
        </>
      ) : null}
    </div>
  )
}
