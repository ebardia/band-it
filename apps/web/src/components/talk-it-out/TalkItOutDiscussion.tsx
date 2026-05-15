'use client'

import { useEffect, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc'

type Message = {
  id: string
  authorType: string
  content: string
  messageType: string
  createdAt: string | Date
  authorUser: { id: string; name: string } | null
}

type Props = {
  sessionId: string
  userId: string
  status: string
  myParticipantStatus: string
}

export function TalkItOutDiscussion({ sessionId, userId, status, myParticipantStatus }: Props) {
  const [draft, setDraft] = useState('')
  const [pendingFacilitator, setPendingFacilitator] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { data: session, refetch } = trpc.talkItOut.getSession.useQuery(
    { sessionId, userId },
    {
      enabled: !!userId,
      refetchInterval: status === 'ACTIVE' ? 4000 : false,
    }
  )

  const sendMutation = trpc.talkItOut.sendMessage.useMutation({
    onMutate: () => setPendingFacilitator(true),
    onSuccess: async () => {
      await refetch()
      setDraft('')
    },
    onError: () => {},
    onSettled: () => setPendingFacilitator(false),
  })

  const messages: Message[] = session?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, pendingFacilitator])

  const canPost = status === 'ACTIVE' && myParticipantStatus === 'JOINED'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canPost || !draft.trim() || sendMutation.isPending) return
    sendMutation.mutate({ sessionId, userId, content: draft })
  }

  return (
    <div className="np-tio-discussion">
      <div className="np-tio-messages" role="log" aria-live="polite">
        {messages.map((m) => {
          const isFacilitator = m.authorType === 'FACILITATOR'
          return (
            <article
              key={m.id}
              className={`np-tio-message ${isFacilitator ? 'np-tio-message--facilitator' : 'np-tio-message--user'}`}
            >
              <p className="np-tio-message-label">
                {isFacilitator ? 'Facilitator' : m.authorUser?.name || 'Participant'}
              </p>
              <div className="np-tio-message-body">{m.content}</div>
            </article>
          )
        })}
        {pendingFacilitator ? (
          <p className="np-tio-thinking">Facilitator thinking…</p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {canPost ? (
        <form onSubmit={handleSubmit} className="np-tio-compose">
          <label className="np-label" htmlFor="tio-message">
            Your message
          </label>
          <textarea
            id="tio-message"
            className="np-field"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share your perspective… Use @facilitator to invite the facilitator in."
            disabled={sendMutation.isPending}
          />
          <button
            type="submit"
            className="np-profile-btn np-profile-btn-primary"
            disabled={sendMutation.isPending || !draft.trim()}
          >
            {sendMutation.isPending ? 'Sending…' : 'Send'}
          </button>
        </form>
      ) : (
        <p className="np-field-hint">
          {status !== 'ACTIVE'
            ? 'Discussion opens when the session is active.'
            : 'Join the session to participate.'}
        </p>
      )}
    </div>
  )
}

