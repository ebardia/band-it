'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/components/ui'
import { EditorialMenuRow } from '@/components/editorial/EditorialMenuRow'
import { TalkItOutDiscussion } from '@/components/talk-it-out/TalkItOutDiscussion'
import { TalkItOutTopicBriefCard } from '@/components/talk-it-out/TalkItOutTopicBriefCard'
import { talkItOutGoalLabel, talkItOutStatusLabel } from '@/lib/talkItOutGoals'

export default function TalkItOutSessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [summaryEdit, setSummaryEdit] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.replace(`/login?returnTo=/talk-it-out/${sessionId}`)
      return
    }
    try {
      setUserId(jwtDecode<{ userId: string }>(token).userId)
    } catch {
      router.replace(`/login?returnTo=/talk-it-out/${sessionId}`)
    }
  }, [router, sessionId])

  const { data: session, isLoading, refetch } = trpc.talkItOut.getSession.useQuery(
    { sessionId, userId: userId! },
    {
      enabled: !!userId,
      refetchInterval: (q) =>
        q.state.data?.topicBriefStatus === 'PENDING' ? 4000 : false,
    }
  )

  const refreshBriefMutation = trpc.talkItOut.refreshTopicBrief.useMutation({
    onSuccess: () => {
      showToast('Refreshing background…', 'success')
      refetch()
    },
    onError: (e) => showToast(e.message, 'error'),
  })

  useEffect(() => {
    if (session?.summaryDraft) setSummaryEdit(session.summaryDraft)
    else if (session?.summary) setSummaryEdit(session.summary)
  }, [session?.summaryDraft, session?.summary])

  const joinMutation = trpc.talkItOut.joinSession.useMutation({
    onSuccess: () => {
      showToast('Joined session', 'success')
      refetch()
    },
    onError: (e) => showToast(e.message, 'error'),
  })

  const startMutation = trpc.talkItOut.startSession.useMutation({
    onSuccess: () => {
      showToast('Session started', 'success')
      refetch()
    },
    onError: (e) => showToast(e.message, 'error'),
  })

  const closeMutation = trpc.talkItOut.closeSession.useMutation({
    onSuccess: () => {
      showToast('Session closed — review the summary', 'success')
      refetch()
    },
    onError: (e) => showToast(e.message, 'error'),
  })

  const updateSummaryMutation = trpc.talkItOut.updateSummaryDraft.useMutation({
    onSuccess: () => showToast('Summary draft saved', 'success'),
    onError: (e) => showToast(e.message, 'error'),
  })

  const finalizeSummaryMutation = trpc.talkItOut.finalizeSummary.useMutation({
    onSuccess: () => {
      showToast('Summary finalized', 'success')
      refetch()
    },
    onError: (e) => showToast(e.message, 'error'),
  })

  if (!userId || isLoading || !session) {
    return (
      <div className="np-shell">
        <p className="np-quiet">Loading session…</p>
      </div>
    )
  }

  const me = session.participants.find((p) => p.userId === userId)
  const isCreator = session.createdByUserId === userId
  const joinedCount = session.participants.filter((p) => p.status === 'JOINED').length

  return (
    <div className="np-shell np-tio-session-page">
      <header className="mb-4">
        <Link href="/talk-it-out" className="np-nav-escape">
          ← Talk It Out
        </Link>
        <h1 className="np-headline-serif mt-4 mb-2">{session.topic}</h1>
        <EditorialMenuRow />
        <hr className="np-rule" />
      </header>

      <div className="np-tio-session-layout">
        <aside className="np-tio-sidebar">
          <p className="np-cat np-cat-left">Session</p>
          <p className="np-tio-sidebar-line">
            <strong>Goal:</strong> {talkItOutGoalLabel(session.goal)}
          </p>
          <p className="np-tio-sidebar-line">
            <strong>Status:</strong> {talkItOutStatusLabel(session.status)}
          </p>
          {session.band ? (
            <p className="np-tio-sidebar-line">
              <strong>Band:</strong> {session.band.name}
            </p>
          ) : null}
          <p className="np-tio-sidebar-line">
            <strong>Participants:</strong> {joinedCount} / {session.maxParticipants}
          </p>

          <p className="np-cat np-cat-left mt-4">People</p>
          <ul className="np-tio-people">
            {session.participants.map((p) => (
              <li key={p.id} className="np-tio-person">
                {p.user.name}
                {p.role === 'CREATOR' ? ' · creator' : ''}
                {' · '}
                {p.status.toLowerCase()}
              </li>
            ))}
          </ul>

          <div className="np-tio-sidebar-actions">
            {me?.status === 'INVITED' ? (
              <button
                type="button"
                className="np-profile-btn np-profile-btn-primary"
                onClick={() => joinMutation.mutate({ sessionId, userId })}
                disabled={joinMutation.isPending}
              >
                Join session
              </button>
            ) : null}

            {isCreator && session.status === 'SETUP' ? (
              <button
                type="button"
                className="np-profile-btn np-profile-btn-primary"
                onClick={() => startMutation.mutate({ sessionId, userId })}
                disabled={startMutation.isPending || joinedCount < 2}
              >
                Start session
              </button>
            ) : null}

            {isCreator && session.status === 'ACTIVE' ? (
              <button
                type="button"
                className="np-profile-btn"
                onClick={() => closeMutation.mutate({ sessionId, userId })}
                disabled={closeMutation.isPending}
              >
                Close session
              </button>
            ) : null}
          </div>
        </aside>

        <div className="np-tio-main">
          <TalkItOutTopicBriefCard
            status={session.topicBriefStatus}
            summary={session.topicBriefSummary}
            topicBriefJson={session.topicBriefJson}
            showRetry={isCreator && session.status !== 'CLOSED'}
            onRetry={() => refreshBriefMutation.mutate({ sessionId, userId })}
            retryPending={refreshBriefMutation.isPending}
          />

          {session.status === 'SETUP' ? (
            <p className="np-profile-read">
              Waiting for the creator to start.{' '}
              {joinedCount < 2
                ? 'At least two participants must be joined.'
                : 'Ready when the creator is.'}
            </p>
          ) : null}

          {session.status === 'ACTIVE' || session.status === 'CLOSED' ? (
            <TalkItOutDiscussion
              sessionId={sessionId}
              userId={userId}
              status={session.status}
              myParticipantStatus={me?.status ?? 'INVITED'}
            />
          ) : null}

          {session.status === 'CLOSED' ? (
            <section className="np-tio-summary">
              <h2 className="np-picks-header">Closing summary</h2>
              <textarea
                className="np-field"
                rows={12}
                value={summaryEdit}
                onChange={(e) => setSummaryEdit(e.target.value)}
              />
              <div className="np-profile-actions">
                <button
                  type="button"
                  className="np-profile-btn"
                  onClick={() =>
                    updateSummaryMutation.mutate({
                      sessionId,
                      userId,
                      summaryDraft: summaryEdit,
                    })
                  }
                  disabled={updateSummaryMutation.isPending}
                >
                  Save draft
                </button>
                <button
                  type="button"
                  className="np-profile-btn np-profile-btn-primary"
                  onClick={() => finalizeSummaryMutation.mutate({ sessionId, userId })}
                  disabled={finalizeSummaryMutation.isPending}
                >
                  Finalize summary
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
