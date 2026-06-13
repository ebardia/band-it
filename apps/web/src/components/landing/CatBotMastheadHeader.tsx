'use client'

import { CatBotMastheadTitle } from '@/components/landing/CatBotMastheadTitle'

type CatBotMastheadHeaderProps = {
  meta: React.ReactNode
  layout?: 'landing' | 'centered'
}

/** Composite masthead PNG already includes tagline sticker — no separate HTML ad. */
export function CatBotMastheadHeader({ meta, layout = 'landing' }: CatBotMastheadHeaderProps) {
  const rowClass =
    layout === 'centered'
      ? 'np-catbot-masthead-row np-catbot-masthead-row--centered'
      : 'np-catbot-masthead-row'

  return (
    <header className="np-landing-masthead">
      <div className={rowClass}>
        <CatBotMastheadTitle />
      </div>
      <hr className="np-rule" />
      <div className="np-masthead-meta py-3 md:py-3.5">
        <span suppressHydrationWarning>{meta}</span>
      </div>
      <hr className="np-rule" />
    </header>
  )
}
