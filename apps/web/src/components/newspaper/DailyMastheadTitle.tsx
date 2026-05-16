'use client'

import { useId } from 'react'

const ARC_PATH = 'M 12 92 Q 240 4 468 92'

/** Curved "The Daily" + horizontal "Action" with yellow neon tube styling. */
export function DailyMastheadTitle() {
  const uid = useId().replace(/:/g, '')
  const arcId = `np-daily-arc-${uid}`
  const glowId = `np-daily-glow-${uid}`

  return (
    <div className="np-daily-masthead-brand" aria-label="The Daily Action">
      <svg
        className="np-daily-masthead-arc"
        viewBox="0 0 480 108"
        role="img"
        aria-hidden
      >
        <defs>
          <path id={arcId} d={ARC_PATH} fill="none" />
          <filter
            id={glowId}
            x="-15%"
            y="-120%"
            width="130%"
            height="340%"
            filterUnits="objectBoundingBox"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b2" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="b3" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="22" result="b4" />
            <feMerge>
              <feMergeNode in="b4" />
              <feMergeNode in="b3" />
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <text
          className="np-daily-masthead-arc-text np-daily-masthead-neon-tube"
          filter={`url(#${glowId})`}
        >
          <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
            The Daily
          </textPath>
        </text>
      </svg>
      <p className="np-daily-masthead-action" aria-hidden>
        Action
      </p>
    </div>
  )
}
