import Link from 'next/link'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { CatBotMastheadTitle } from '@/components/landing/CatBotMastheadTitle'
import { CTA_LABEL } from '@/components/landing/landingCatBotCopy'

const MANIFESTO_PARAGRAPHS = [
  'Everyone has met the chatbot that digs one hole deeper. You hint at a direction \u2014 find leads, draft copy, research a market \u2014 and it keeps going down the same path. It rarely stops to ask whether the whole frame is wrong. Humans supply the pivot; the model elaborates the rut. Adopt A Cat Bot exists because we wanted exploration before commitment, and because we wanted that exploration to learn from people, not just from the generic web.',
  'You adopt a wild cat. Not a general assistant \u2014 a specialized marketing cat built for one narrow lane. We help you domesticate it for a very specific purpose: a neighborhood, a mission, a voice, rules about what it must never recommend. Domestication is not manual model training. It is curated memory. The cat roams; you decide what it keeps.',
  'A neighborhood is any field or community you care about \u2014 med spas in affluent suburbs, nonprofit gala culture, a vertical your agency serves. The cat goes out into online communities where real people argue, confess, and compare notes. It reads those threads as human conversation, not as a scraper hunting phone numbers. On each roam it is required to question its first instinct: one angle, then a mirror, then different paths \u2014 so it does not get stuck on the obvious playbook everyone else already tried.',
  'When it comes back, you get a structured report: what it found, what it rejected, what trap it almost fell into. You certify the good and discard the bad. Approved learnings become long-term memory; rejected ones stay in a discard log so the cat does not quietly relearn junk. When you certify a cat, it earns your tag \u2014 owner named, mission stated, bias disclosed \u2014 in case it ever gets lost in the threads. Then it can represent you in forums and neighborhoods with full transparency. Marketing cats may favor your goals. They say so. Monkeys and cats don\u2019t get along.',
  'Organizations still need a home. A reseller like a white-label CRM agency is a Big Band \u2014 a roster of client bands. Each client band is a musical group the cats belong to. One med spa, one band; several specialized cats over time, each with its own niche and memory. Signal processing and target research feed the neighborhood; the band is who the cat speaks for.',
  'We are in the business of human-in-the-loop marketing cats: adopt, domesticate, certify, roam, represent \u2014 with evidence, with gates, with owner tags on every opinion that matters. Not another chat box that hallucinates pipeline. A cat that learns the block, reports back, and only remembers what you let it keep.',
]

export default function ManifestoPage() {
  return (
    <EditorialSurface>
      <div className="np-shell np-landing-page">
        <header className="np-landing-masthead">
          <CatBotMastheadTitle />
          <hr className="np-rule" />
          <div className="np-masthead-meta py-3 md:py-3.5">
            <span>Manifesto &middot; Vol. I &middot; Wild cats, wild jobs</span>
          </div>
          <hr className="np-rule" />
        </header>

        <div className="np-profile-shell np-manifesto-shell">
          <Link href="/" className="np-manifesto-back">
            &larr; Front page
          </Link>
          <p className="np-cat np-cat-left">Essay</p>
          <h1 className="np-headline-lead np-headline-lead-left">
            Adopt wild cats. Domesticate them. Let them roam.
          </h1>
          <p className="np-landing-dek">
            A longer view on niche marketing cats, neighborhood learning, owner certification,
            and transparent representation &mdash; the vision behind Adopt A Cat Bot.
          </p>
          <div className="np-landing-columns np-landing-story">
            {MANIFESTO_PARAGRAPHS.map((paragraph, index) => (
              <p
                key={paragraph}
                className={`np-landing-paragraph${index === 0 ? ' np-landing-dropcap' : ''}`}
              >
                {paragraph}
              </p>
            ))}
          </div>
          <p className="np-landing-paragraph np-landing-editorial-cta">
            <Link href="/register" className="np-landing-platform-cta">
              {CTA_LABEL}
            </Link>
          </p>
        </div>
      </div>
    </EditorialSurface>
  )
}
