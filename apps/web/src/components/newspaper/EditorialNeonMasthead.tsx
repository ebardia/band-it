'use client'

import { useId } from 'react'

/** Arc sits lower in viewBox (peak in-frame) so glow is not clipped off-page. */
const ARC_PATH = 'M 8 68 Q 260 34 512 68'

type Props = {
  /** Curved line along the arc (e.g. "The Daily", "The Proof") */
  arcLabel: string
  /** Large word below the arc (e.g. "Action", "Register", "Desk") */
  actionLabel: string
  /** Accessible name for the masthead */
  ariaLabel: string
}

/**
 * Daily Action–style masthead: curved arc text + bold action word with yellow neon glow.
 */
export function EditorialNeonMasthead({ arcLabel, actionLabel, ariaLabel }: Props) {
  const uid = useId().replace(/:/g, '')
  const arcId = `np-ed-arc-${uid}`
  const neonId = `np-ed-neon-${uid}`

  return (
    <div className="np-daily-masthead-brand" aria-label={ariaLabel}>
      <svg
        className="np-daily-masthead-arc"
        viewBox="0 0 520 88"
        role="img"
        aria-hidden
      >
        <defs>
          <path id={arcId} d={ARC_PATH} fill="none" />
          <filter
            id={neonId}
            x="-25%"
            y="-80%"
            width="150%"
            height="260%"
            filterUnits="objectBoundingBox"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blurTight" />
            <feFlood floodColor="#ffe566" floodOpacity="1" result="floodTight" />
            <feComposite in="floodTight" in2="blurTight" operator="in" result="glowTight" />

            <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="blurMid" />
            <feFlood floodColor="#ffdd00" floodOpacity="0.95" result="floodMid" />
            <feComposite in="floodMid" in2="blurMid" operator="in" result="glowMid" />

            <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="blurWide" />
            <feFlood floodColor="#ffc400" floodOpacity="0.75" result="floodWide" />
            <feComposite in="floodWide" in2="blurWide" operator="in" result="glowWide" />

            <feMerge>
              <feMergeNode in="glowWide" />
              <feMergeNode in="glowMid" />
              <feMergeNode in="glowTight" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <text className="np-daily-masthead-arc-text" filter={`url(#${neonId})`}>
          <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
            {arcLabel}
          </textPath>
        </text>
      </svg>
      <p className="np-daily-masthead-action" aria-hidden>
        {actionLabel}
      </p>
    </div>
  )
}
