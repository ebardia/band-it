import Link from 'next/link'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { DailyMastheadTitle } from '@/components/newspaper/DailyMastheadTitle'

const MANIFESTO_PARAGRAPHS = [
  'The AI stack is real \u2014 energy, chips, infrastructure, models, agent platforms, vertical agents. Most organizations will buy pieces of it, not build the whole thing. What they still need is a layer that wraps the stack: intelligence in, judgment throughout, business intelligence out.',
  'Band It is that layer. On the left, the signal desk \u2014 open web, records, telemetry, geospatial, whatever feeds your workflow. On the right, human in the loop \u2014 not a cosmetic review button, but checkpoints at every step that matters: labels, tasks, projects, proposals.',
  'Inside the helmet sits the industry stack. Band It does not replace it; it hugs it. Signals route into orchestration and vertical agents \u2014 yours or off the shelf. Humans steer. Agents execute. The trace stays transparent.',
  'The output is The Goods: verified intelligence your customer can plug into business flow \u2014 webhooks, documents, dashboards, operational systems. Not model output for its own sake. Decision-grade results.',
  'Workflows compose the same way bands already work: agent nodes, human nodes, sinks. Opportunity discovery, research desks, compliance scans \u2014 one engine, different templates. Try a workflow. Change it. Ship it.',
  'We are past the age of one human prompting one model in a chat box. We are in the age of signal processing, vertical agents, and humans in the loop at every step \u2014 wrapped in one layer you can put on and run.',
]

export default function ManifestoPage() {
  return (
    <EditorialSurface>
      <div className="np-shell np-landing-page">
        <header className="np-landing-masthead">
          <DailyMastheadTitle />
          <hr className="np-rule" />
          <div className="np-masthead-meta py-3 md:py-3.5">
            <span>Manifesto · Vol. I · The Band It Layer</span>
          </div>
          <hr className="np-rule" />
        </header>

        <div className="np-profile-shell np-manifesto-shell">
          <Link href="/" className="np-manifesto-back">
            &larr; Front page
          </Link>
          <p className="np-cat np-cat-left">Essay</p>
          <h1 className="np-headline-lead np-headline-lead-left">The Band It Layer</h1>
          <p className="np-landing-dek">
            A longer view on intelligence signal processing, the AI stack, human-in-the-loop
            orchestration, and delivering The Goods — the vision behind Band It.
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
              Wear the AI helmet &rarr;
            </Link>
          </p>
        </div>
      </div>
    </EditorialSurface>
  )
}
