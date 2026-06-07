'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import { EditorialPageShell } from '@/components/editorial/EditorialPageShell'
import { WAITING_ROOM_IMAGE } from '@/components/newspaper/newspaperPlaceholders'

const WAITING_ROOM_SHELL = {
  kicker: 'Agency entrance',
  editionLabel: 'The List',
  mastheadBrand: 'Adopt A Cat Bot',
  mastheadArcLabel: 'Cat Bot Adoption',
  mastheadActionLabel: 'Agency',
  mastheadAriaLabel: 'Cat Bot Adoption Agency',
} as const

export default function WaitingRoomPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [checkedToken, setCheckedToken] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.replace('/login')
      return
    }
    try {
      const decoded = jwtDecode<{ userId: string }>(token)
      if (!decoded.userId) {
        router.replace('/login')
        return
      }
      setUserId(decoded.userId)
    } catch {
      router.replace('/login')
      return
    }
    setCheckedToken(true)
  }, [router])

  const { data: access, isError: accessError } = trpc.auth.getAccessStatus.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  // Approved users (or admins) don't belong here — send them to their Daily.
  useEffect(() => {
    if (access?.hasAccess) {
      router.replace('/daily')
    }
  }, [access, router])

  // A stale/invalid token makes the access check fail — treat it as logged out.
  useEffect(() => {
    if (accessError) {
      router.replace('/login')
    }
  }, [accessError, router])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userEmail')
    router.push('/')
  }

  if (!checkedToken || !access) {
    return (
      <EditorialPageShell {...WAITING_ROOM_SHELL}>
        <p className="np-quiet">Checking your spot in line…</p>
      </EditorialPageShell>
    )
  }

  if (access.hasAccess) {
    return (
      <EditorialPageShell {...WAITING_ROOM_SHELL}>
        <p className="np-quiet">You&apos;re in — opening the agency doors…</p>
      </EditorialPageShell>
    )
  }

  return (
    <EditorialPageShell {...WAITING_ROOM_SHELL}>
      <section className="np-welcome-lead" aria-labelledby="waitroom-heading">
        <p className="np-cat np-cat-left">Hold the press</p>
        <h1 id="waitroom-heading" className="np-welcome-headline">
          You&apos;re on the list
        </h1>
        <p className="np-welcome-dek">
          Thanks for signing up at the Cat Bot Adoption Agency. Your spot is saved — the doors
          just aren&apos;t open to everyone yet.
        </p>
      </section>

      <figure className="np-waitroom-hero">
        <div className="np-daily-classified-frame">
          <Image
            src={WAITING_ROOM_IMAGE}
            alt="A long, eclectic line waiting in a dim alley beneath a metal door marked Cat Bot Adoption Agency Entrance — 1950s characters, aliens, animals, the ape-to-human evolution lineup, and a stray refrigerator, coffee machine, and beach ball."
            width={1308}
            height={872}
            className="np-daily-classified-img"
            priority
          />
        </div>
        <figcaption className="np-daily-classified-caption">
          The queue outside the Agency Entrance. Everyone gets in eventually — yes, even the fridge.
        </figcaption>
      </figure>

      <div className="np-daily-spread">
        <article className="np-daily-spread-main" aria-labelledby="waitroom-why-heading">
          <p className="np-cat np-cat-left">Editor&apos;s note</p>
          <h2 id="waitroom-why-heading" className="np-picks-header np-picks-header-left">
            Why the wait?
          </h2>
          <p className="np-daily-mission-body">
            <span className="np-dropcap" aria-hidden="true">
              T
            </span>
            wo honest reasons. First, we&apos;re actively demodleing the agency and want your first
            real visit to be a good one. Second — full transparency — we&apos;re letting people in
            gradually. It&apos;s partly so nothing breaks under a crowd, and partly because
            &ldquo;limited early access&rdquo; sounds far more exciting than &ldquo;please come in,
            it&apos;s very empty.&rdquo; When we&apos;re ready for you, we&apos;ll email an invite and
            open the doors. We&apos;ll be in touch soon. We know — the wait is killing you. It&apos;s
            a little killing us too.
          </p>
        </article>

        <aside className="np-daily-spread-rail" aria-labelledby="waitroom-next-heading">
          <p className="np-cat np-cat-left">The doorman</p>
          <h2 id="waitroom-next-heading" className="np-picks-header">
            What happens next
          </h2>
          <p className="np-byline np-byline-left">Invites go out as we open the doors</p>
          <p className="np-excerpt">
            Nothing else to do here for now — hang tight and watch your inbox. When your invite
            lands, this door opens to the dark halls of Cat Bot Adoption Agency.
          </p>

          <div className="np-daily-spread-actions">
            <button type="button" className="np-action np-action-left" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </aside>
      </div>
    </EditorialPageShell>
  )
}
