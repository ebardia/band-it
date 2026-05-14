'use client'

type Props = {
  editionLine: string
}

function formatPaperDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

export function NewspaperMasthead({ editionLine }: Props) {
  return (
    <header className="mb-8 md:mb-10">
      <h1 className="np-masthead-title text-[clamp(2.5rem,8vw,3.75rem)] mb-4 md:mb-5">
        The Daily
      </h1>
      <hr className="np-rule" />
      <div className="np-masthead-meta py-3 md:py-3.5">
        <span>{formatPaperDate(new Date())}</span>
        <span className="text-right">{editionLine}</span>
      </div>
      <hr className="np-rule" />
    </header>
  )
}
