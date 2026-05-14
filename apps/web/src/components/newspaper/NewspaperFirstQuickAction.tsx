'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import {
  formatQuickActionSubtitle,
  formatQuickActionTitle,
  getQuickActionTypeLabel,
} from '@/lib/quickActionPresentation'

interface Props {
  userId: string
}

export function NewspaperFirstQuickAction({ userId }: Props) {
  const { data, isLoading } = trpc.quick.getMyActions.useQuery(
    { userId, limit: 1 },
    {
      enabled: !!userId,
      refetchOnWindowFocus: true,
    }
  )

  if (isLoading || !data?.actions?.length) {
    return null
  }

  const action = data.actions[0]
  const typeLabel = getQuickActionTypeLabel(action).toUpperCase()
  const title = formatQuickActionTitle(action)
  const subtitle = formatQuickActionSubtitle(action)

  return (
    <section className="np-qa-section" aria-label="Quick action">
      <p className="np-cat np-cat-left">{typeLabel}</p>
      <h2 className="np-headline-serif np-qa-headline">{title}</h2>
      <p className="np-byline np-byline-left">{subtitle}</p>
      <Link href={action.url} className="np-action np-action-left">
        Open
      </Link>
    </section>
  )
}
