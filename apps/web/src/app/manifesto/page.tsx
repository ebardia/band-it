import Link from 'next/link'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { DailyMastheadTitle } from '@/components/newspaper/DailyMastheadTitle'

const MANIFESTO_PARAGRAPHS = [
  'Technology is about to become a utility.',
  'You wake up in the morning, go to your wardrobe, and put on some clothes. The top might be for research, the belt for marketing, the skirt for, yes, dancing, and the shoes for gardening. You might also wear a hat for teaching. Each of these persona items will give you your superpower for the day. Oh, and your closet is not that small; it\u2019s more like the rolling rack of clothes at a dry cleaner.',
  'The age of AI agents is going to eliminate the need to learn or develop technology. Most tech companies will be replaced by AI agents. The only thing left for us to do is be our authentic selves.',
  'It can be the age of optimal productivity, where we do what we are best at. We will do our best work with others. Creativity is still the top winner. Each person will have the ability to continuously define and build what they need at a moment\u2019s notice, with no hesitation for errors. Try it. Don\u2019t like it? Change it. All on a whim. Keep doing trial and error; it won\u2019t cost much.',
  'The environment? There will be a multitude of solutions for every imaginable and unimaginable situation. Political conflicts? An AI agent facilitator is constantly at work to reduce friction and offer win-win solutions. Health concerns? You are constantly monitored (this one is already here). Your diet habits are guided, and your mood is influenced by the activities suggested to you, at the pace you prefer.',
  'This all sounds like science fiction, but it is already happening. It may take a few years to spread throughout society, but it won\u2019t take that long. We went from the Agricultural Age to the Industrial Age and then to the Information Age, and now we are entering the Creativity Age. People are at their best when they get to that \u201caha\u201d moment. What is better than trying that new idea? Build on it, share it, work on it some more, and work on yourself while you\u2019re at it.',
  'Who knew that one day all of humanity would be in the dry-cleaning business?',
]

export default function ManifestoPage() {
  return (
    <EditorialSurface>
      <div className="np-shell np-landing-page">
        <header className="np-landing-masthead">
          <DailyMastheadTitle />
          <hr className="np-rule" />
          <div className="np-masthead-meta py-3 md:py-3.5">
            <span>Manifesto · Vol. I</span>
          </div>
          <hr className="np-rule" />
        </header>

        <div className="np-profile-shell np-manifesto-shell">
          <Link href="/" className="np-manifesto-back">
            &larr; Front page
          </Link>
          <p className="np-cat np-cat-left">Essay</p>
          <h1 className="np-headline-lead np-headline-lead-left">
            The Creativity Age
          </h1>
          <p className="np-landing-dek">
            A longer view on utility, persona, agents, and the dry-cleaner closet — the
            vision behind Band It.
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
              Step onto the platform &rarr;
            </Link>
          </p>
        </div>
      </div>
    </EditorialSurface>
  )
}
