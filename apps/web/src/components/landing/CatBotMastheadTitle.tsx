'use client'

import Image from 'next/image'
import { MASTHEAD_ARIA_LABEL, MASTHEAD_IMAGE } from '@/components/landing/landingCatBotCopy'

/** Single composite masthead: steampunk cat on the C + Cat Bot / Adoption Agency. */
export function CatBotMastheadTitle() {
  return (
    <div className="np-catbot-masthead-brand">
      <Image
        src={MASTHEAD_IMAGE}
        alt={MASTHEAD_ARIA_LABEL}
        width={1536}
        height={1024}
        className="np-catbot-masthead-image"
        priority
        sizes="(max-width: 768px) 92vw, (max-width: 1024px) 38rem, 44rem"
      />
    </div>
  )
}
