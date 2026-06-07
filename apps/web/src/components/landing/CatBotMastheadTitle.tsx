'use client'

import { useId } from 'react'

/** Curved “Adopt A Cat” (neon arc, peak on center A) + neon “BOT”. */
const HAT_ARC_PATH = 'M 12 70 Q 280 18 548 70'

export function CatBotMastheadTitle() {
  const uid = useId().replace(/:/g, '')
  const arcId = `np-catbot-arc-${uid}`
  const neonId = `np-catbot-neon-${uid}`

  return (
    <div className="np-catbot-masthead-brand" aria-label="Adopt A Cat Bot">
      <svg
        className="np-catbot-masthead-arc"
        viewBox="0 0 560 82"
        role="img"
        aria-hidden
      >
        <defs>
          <path id={arcId} d={HAT_ARC_PATH} fill="none" />
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
        <text className="np-catbot-masthead-arc-text" filter={`url(#${neonId})`}>
          <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
            Adopt A Cat
          </textPath>
        </text>
      </svg>
      <p className="np-catbot-masthead-bot" aria-hidden>
        BOT
      </p>
    </div>
  )
}
