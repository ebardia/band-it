'use client'

import {
  parseTopicBriefJson,
  researchModeLabel,
  type TalkItOutTopicBrief,
} from '@/lib/talkItOutTopicBrief'

type Props = {
  status: 'PENDING' | 'READY' | 'FAILED'
  summary?: string | null
  topicBriefJson?: string | null
  loading?: boolean
  onRetry?: () => void
  retryPending?: boolean
  showRetry?: boolean
}

export function TalkItOutTopicBriefCard({
  status,
  summary,
  topicBriefJson,
  loading,
  onRetry,
  retryPending,
  showRetry,
}: Props) {
  const brief: TalkItOutTopicBrief | null = parseTopicBriefJson(topicBriefJson)
  const displaySummary = brief?.summary || summary

  if (status === 'PENDING' || loading) {
    return (
      <section className="np-tio-brief" aria-live="polite">
        <h2 className="np-tio-brief-title">Background for this discussion</h2>
        <p className="np-tio-brief-loading">Preparing background…</p>
      </section>
    )
  }

  if (status === 'FAILED' && !displaySummary) {
    return (
      <section className="np-tio-brief">
        <h2 className="np-tio-brief-title">Background for this discussion</h2>
        <p className="np-tio-brief-error">
          Background research could not be loaded. You can still continue.
        </p>
        {showRetry && onRetry ? (
          <button
            type="button"
            className="np-profile-btn np-tio-brief-retry"
            onClick={onRetry}
            disabled={retryPending}
          >
            {retryPending ? 'Retrying…' : 'Retry'}
          </button>
        ) : null}
      </section>
    )
  }

  if (!displaySummary && !brief) return null

  return (
    <section className="np-tio-brief">
      <div className="np-tio-brief-head">
        <h2 className="np-tio-brief-title">Background for this discussion</h2>
        {brief?.researchMode ? (
          <span className="np-tio-brief-badge">{researchModeLabel(brief.researchMode)}</span>
        ) : null}
      </div>
      <p className="np-tio-brief-summary">{displaySummary}</p>

      {brief ? <BriefDetails brief={brief} /> : null}

      {showRetry && onRetry ? (
        <button
          type="button"
          className="np-profile-btn np-tio-brief-retry"
          onClick={onRetry}
          disabled={retryPending}
        >
          {retryPending ? 'Refreshing…' : 'Refresh background'}
        </button>
      ) : null}
    </section>
  )
}

function BriefDetails({ brief }: { brief: TalkItOutTopicBrief }) {
  return (
    <div className="np-tio-brief-details">
      {brief.whatSuccessLooksLike ? (
        <BriefBlock title="What success looks like" items={[brief.whatSuccessLooksLike]} />
      ) : null}
      {brief.likelyPerspectives?.length ? (
        <BriefBlock title="Likely perspectives" items={brief.likelyPerspectives} />
      ) : null}
      {brief.commonTensions?.length ? (
        <BriefBlock title="Tensions to navigate" items={brief.commonTensions} />
      ) : null}
      {brief.questionsToSurface?.length ? (
        <BriefBlock title="Questions worth surfacing" items={brief.questionsToSurface} />
      ) : null}
      {brief.factsToVerifyInRoom?.length ? (
        <BriefBlock title="Verify in the room" items={brief.factsToVerifyInRoom} />
      ) : null}
      {brief.publicContext ? (
        <div className="np-tio-brief-block">
          <h3 className="np-tio-brief-block-title">Public context</h3>
          <p className="np-tio-brief-prose">{brief.publicContext}</p>
        </div>
      ) : null}
      {brief.internalContext ? (
        <div className="np-tio-brief-block">
          <h3 className="np-tio-brief-block-title">Band context</h3>
          <p className="np-tio-brief-prose">{brief.internalContext}</p>
        </div>
      ) : null}
      {brief.webSources?.length ? (
        <div className="np-tio-brief-block">
          <h3 className="np-tio-brief-block-title">Sources</h3>
          <ul className="np-tio-brief-sources">
            {brief.webSources.map((s) => (
              <li key={s.uri}>
                <a href={s.uri} target="_blank" rel="noopener noreferrer">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function BriefBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="np-tio-brief-block">
      <h3 className="np-tio-brief-block-title">{title}</h3>
      <ul className="np-tio-brief-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
