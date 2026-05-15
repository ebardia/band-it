'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/components/ui'
import { EditorialMenuRow } from '@/components/editorial/EditorialMenuRow'
import { TALK_IT_OUT_GOALS, type TalkItOutGoalValue } from '@/lib/talkItOutGoals'
import { TalkItOutTopicBriefCard } from '@/components/talk-it-out/TalkItOutTopicBriefCard'
import type { TalkItOutTopicBrief } from '@/lib/talkItOutTopicBrief'

type Invitee = { id: string; name: string; email: string }

export default function TalkItOutNewPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [goal, setGoal] = useState<TalkItOutGoalValue>('DECISION')
  const [maxParticipants, setMaxParticipants] = useState(8)
  const [bandId, setBandId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [invitees, setInvitees] = useState<Invitee[]>([])
  const [previewBrief, setPreviewBrief] = useState<TalkItOutTopicBrief | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const previewRequestId = useRef(0)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.replace('/login?returnTo=/talk-it-out/new')
      return
    }
    try {
      setUserId(jwtDecode<{ userId: string }>(token).userId)
    } catch {
      router.replace('/login?returnTo=/talk-it-out/new')
    }
  }, [router])

  const { data: bandsData } = trpc.band.getMyBands.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: searchResults } = trpc.talkItOut.searchInviteUsers.useQuery(
    {
      userId: userId!,
      query: searchQuery,
      bandId: bandId || null,
    },
    { enabled: !!userId && searchQuery.trim().length >= 2 }
  )

  const previewMutation = trpc.talkItOut.previewTopicBrief.useMutation()

  useEffect(() => {
    if (!userId || topic.trim().length < 8) {
      setPreviewBrief(null)
      setPreviewLoading(false)
      return
    }

    const requestId = ++previewRequestId.current
    setPreviewLoading(true)

    const timer = setTimeout(() => {
      previewMutation
        .mutateAsync({
          userId,
          topic: topic.trim(),
          goal,
          bandId: bandId || null,
        })
        .then((brief) => {
          if (requestId !== previewRequestId.current) return
          setPreviewBrief(brief as TalkItOutTopicBrief)
          setPreviewLoading(false)
        })
        .catch(() => {
          if (requestId !== previewRequestId.current) return
          setPreviewBrief(null)
          setPreviewLoading(false)
        })
    }, 1000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, topic, goal, bandId])

  const createMutation = trpc.talkItOut.createSession.useMutation({
    onSuccess: (session) => {
      showToast('Talk It Out created', 'success')
      router.push(`/talk-it-out/${session.id}`)
    },
    onError: (e) => showToast(e.message, 'error'),
  })

  const activeBands =
    bandsData?.bands?.filter((b: { status: string }) => b.status === 'ACTIVE') ?? []

  const addInvitee = (u: Invitee) => {
    if (invitees.some((i) => i.id === u.id)) return
    if (invitees.length >= maxParticipants - 1) {
      showToast('Maximum invitees reached', 'error')
      return
    }
    setInvitees([...invitees, u])
    setSearchQuery('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    createMutation.mutate({
      userId,
      topic,
      goal,
      maxParticipants,
      bandId: bandId || null,
      inviteeUserIds: invitees.map((i) => i.id),
    })
  }

  return (
    <div className="np-shell np-tio-form-page">
      <header className="mb-6">
        <Link href="/talk-it-out" className="np-nav-escape">
          ← Talk It Out
        </Link>
        <h1 className="np-masthead-title text-[clamp(1.75rem,5vw,2.5rem)] mt-4 mb-3 text-left">
          Start a session
        </h1>
        <EditorialMenuRow />
        <hr className="np-rule" />
      </header>

      <form onSubmit={handleSubmit} className="np-tio-form">
        <label className="np-label" htmlFor="topic">
          Topic
        </label>
        <textarea
          id="topic"
          className="np-field"
          rows={3}
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What is this discussion about?"
        />

        {topic.trim().length >= 8 && (previewLoading || previewBrief) ? (
          <TalkItOutTopicBriefCard
            status={previewLoading ? 'PENDING' : 'READY'}
            summary={previewBrief?.summary}
            topicBriefJson={previewBrief ? JSON.stringify(previewBrief) : null}
            loading={previewLoading}
          />
        ) : null}

        <label className="np-label" htmlFor="goal">
          Goal
        </label>
        <select
          id="goal"
          className="np-field"
          value={goal}
          onChange={(e) => setGoal(e.target.value as TalkItOutGoalValue)}
        >
          {TALK_IT_OUT_GOALS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>

        <label className="np-label" htmlFor="max">
          Max participants
        </label>
        <input
          id="max"
          type="number"
          min={2}
          max={15}
          className="np-field"
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(Number(e.target.value))}
        />

        <label className="np-label" htmlFor="band">
          Associated band (optional)
        </label>
        <select
          id="band"
          className="np-field"
          value={bandId}
          onChange={(e) => setBandId(e.target.value)}
        >
          <option value="">None</option>
          {activeBands.map((b: { id: string; name: string }) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <label className="np-label" htmlFor="search">
          Invite participants
        </label>
        <input
          id="search"
          className="np-field"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email (min 2 characters)"
        />
        {searchResults && searchResults.length > 0 ? (
          <ul className="np-tio-search-results">
            {searchResults
              .filter((u) => !invitees.some((i) => i.id === u.id))
              .map((u) => (
                <li key={u.id}>
                  <button type="button" className="np-tio-search-hit" onClick={() => addInvitee(u)}>
                    {u.name} · {u.email}
                  </button>
                </li>
              ))}
          </ul>
        ) : null}

        {invitees.length > 0 ? (
          <div className="np-chip-row np-chip-row-left">
            {invitees.map((i) => (
              <button
                key={i.id}
                type="button"
                className="np-chip"
                onClick={() => setInvitees(invitees.filter((x) => x.id !== i.id))}
                title="Remove"
              >
                {i.name} ×
              </button>
            ))}
          </div>
        ) : null}

        <div className="np-profile-actions">
          <button
            type="submit"
            className="np-profile-btn np-profile-btn-primary"
            disabled={createMutation.isPending || invitees.length < 1}
          >
            {createMutation.isPending ? 'Creating…' : 'Create session'}
          </button>
          <Link href="/talk-it-out" className="np-profile-btn">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
