'use client'

import { CatBotMastheadTitle } from '@/components/landing/CatBotMastheadTitle'
import { MASTHEAD_TAGLINE } from '@/components/landing/landingCatBotCopy'

type CatBotMastheadHeaderProps = {
  meta: React.ReactNode
  layout?: 'landing' | 'centered'
}

export function CatBotMastheadHeader({ meta, layout = 'landing' }: CatBotMastheadHeaderProps) {
  const rowClass =
    layout === 'centered'
      ? 'np-catbot-masthead-row np-catbot-masthead-row--centered'
      : 'np-catbot-masthead-row'

  const taglineClass =
    layout === 'centered'
      ? 'np-catbot-masthead-tagline-ad np-catbot-masthead-tagline-ad--centered'
      : 'np-catbot-masthead-tagline-ad'

  return (
    <header className="np-landing-masthead">
      <div className={rowClass}>
        <CatBotMastheadTitle />
        <div className={taglineClass} aria-label={MASTHEAD_TAGLINE}>
          <p className="np-catbot-masthead-tagline-ad-inner">{MASTHEAD_TAGLINE}</p>
        </div>
      </div>
      <hr className="np-rule" />
      <div className="np-masthead-meta py-3 md:py-3.5">
        <span suppressHydrationWarning>{meta}</span>
      </div>
      <hr className="np-rule" />
    </header>
  )
}
