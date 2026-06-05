import Link from 'next/link'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { DailyMastheadTitle } from '@/components/newspaper/DailyMastheadTitle'

const MANIFESTO_PARAGRAPHS = [
  'Most companies already know what they sell. What they struggle with is knowing who needs it now \u2014 and how to reach them before the window closes. Band It exists for that gap: detect opportunities from real-world signals, validate them with your subject-matter experts, and launch marketing campaigns for the lists that pass review.',
  'It starts with signal detection. Hiring surges, regulatory shifts, public contract awards, operational stress, digital footprint changes \u2014 observable events that suggest a buyer is in motion. The discovery agent watches the feeds you define, applies fit filters, and assembles ranked opportunity lists with evidence attached: company, trigger, suggested angle, confidence.',
  'Raw lists are not enough. Your SME reviews every lead before it moves forward \u2014 approve, reject, or enrich with context only a human would know. Bad fits drop. Good fits become campaign-ready segments your team trusts. Nothing reaches outreach until a person signs off.',
  'The marketing agent takes validated lists and drafts the outbound work: email sequences tuned to each trigger, ad variants for accounts that just won municipal contracts, nurture tracks for companies with fresh business-development hires, landing-page copy matched to the signal that surfaced them. Your marketer sets brand voice, compliance boundaries, and budget caps. The agent drafts; your team approves. Sequences ship to the CRM, ad platforms, or webhooks you already use.',
  'Two agents, one human checkpoint, full trace. Every signal links to every lead links to every campaign asset. You can see why an account made the list, who approved it, and what went out the door. Not a chat box that hallucinates pipeline. A conveyor from signal to action that adapts to how your organization already sells.',
  'We are in the business of opportunity detection and campaign execution \u2014 with humans steering at every step that matters. Find the accounts worth calling. Validate them with people who know the market. Run the campaigns that turn validated lists into revenue.',
]

export default function ManifestoPage() {
  return (
    <EditorialSurface>
      <div className="np-shell np-landing-page">
        <header className="np-landing-masthead">
          <DailyMastheadTitle />
          <hr className="np-rule" />
          <div className="np-masthead-meta py-3 md:py-3.5">
            <span>Manifesto &middot; Vol. I &middot; Signals to campaigns</span>
          </div>
          <hr className="np-rule" />
        </header>

        <div className="np-profile-shell np-manifesto-shell">
          <Link href="/" className="np-manifesto-back">
            &larr; Front page
          </Link>
          <p className="np-cat np-cat-left">Essay</p>
          <h1 className="np-headline-lead np-headline-lead-left">
            Detect opportunities. Validate them. Run the campaigns.
          </h1>
          <p className="np-landing-dek">
            A longer view on signal detection, opportunity discovery, SME review, and marketing
            execution &mdash; the vision behind Band It.
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
              Start discovering &rarr;
            </Link>
          </p>
        </div>
      </div>
    </EditorialSurface>
  )
}
