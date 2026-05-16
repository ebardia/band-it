'use client'

import { useId } from 'react'

/** Curved "The Daily" + horizontal "Action" with yellow neon glow (Daily masthead). */
export function DailyMastheadTitle() {
  const arcId = useId().replace(/:/g, '')

  return (
    <div className="np-daily-masthead-brand" aria-label="The Daily Action">
      <svg
        className="np-daily-masthead-arc"
        viewBox="0 0 420 76"
        role="img"
        aria-hidden
      >
        <defs>
          <path
            id={arcId}
            d="M 28 54 Q 210 20 392 54"
            fill="none"
          />
        </defs>
        <text className="np-daily-masthead-arc-text">
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
