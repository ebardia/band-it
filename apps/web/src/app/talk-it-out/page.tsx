'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import { EditorialMenuRow } from '@/components/editorial/EditorialMenuRow'
import { talkItOutGoalLabel, talkItOutStatusLabel } from '@/lib/talkItOutGoals'

export default function TalkItOutHubPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.replace('/login?returnTo=/talk-it-out')
      return
    }
    try {
      const decoded = jwtDecode<{ userId: string }>(token)
      setUserId(decoded.userId)
    } catch {
      router.replace('/login?returnTo=/talk-it-out')
    }
  }, [router])

  const { data: sessions, isLoading } = trpc.talkItOut.listMySessions.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  return (
    <div className="np-shell np-tio-hub">
      <header className="mb-6 md:mb-8">
        <h1 className="np-masthead-title text-[clamp(2rem,7vw,3.25rem)] mb-3 md:mb-4 text-left">
          Talk It Out
        </h1>
        <EditorialMenuRow />
        <hr className="np-rule" />
        <p className="np-profile-dek-lead np-tio-hub-dek">
          Facilitated discussions with a clear topic and goal — for decisions, alignment, and working through
          tension together.
        </p>
      </header>

      <div className="np-tio-hub-actions">
        <Link href="/talk-it-out/new" className="np-profile-btn np-profile-btn-primary">
          Start a Talk It Out
        </Link>
      </div>

      {!userId || isLoading ? (
        <p className="np-quiet np-quiet-left">Loading sessions…</p>
      ) : sessions && sessions.length > 0 ? (
        <section className="np-tio-session-list" aria-label="Your sessions">
          <h2 className="np-picks-header">Your sessions</h2>
          <ul className="np-tio-session-cards">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link href={`/talk-it-out/${s.id}`} className="np-tio-session-card">
                  <p className="np-tio-session-topic">{s.topic}</p>
                  <p className="np-tio-session-meta">
                    {talkItOutGoalLabel(s.goal)} · {talkItOutStatusLabel(s.status)} ·{' '}
                    {s.joinedCount} joined
                  </p>
                  {s.band ? (
                    <p className="np-tio-session-band">{s.band.name}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="np-quiet np-quiet-left">No sessions yet. Start one when you are ready to deliberate.</p>
      )}
    </div>
  )
}
