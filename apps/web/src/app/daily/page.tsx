'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import { NewspaperMasthead } from '@/components/newspaper/NewspaperMasthead'
import { NewspaperLead } from '@/components/newspaper/NewspaperLead'
import { NewspaperRoundtable } from '@/components/newspaper/NewspaperRoundtable'

export default function DailyPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.replace('/login?returnTo=/daily')
      return
    }
    try {
      const decoded = jwtDecode<{ userId: string }>(token)
      setUserId(decoded.userId)
    } catch {
      router.replace('/login?returnTo=/daily')
    }
  }, [router])

  const { data, isLoading, isError } = trpc.newspaper.getHomeFeed.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  if (!userId || isLoading) {
    return (
      <div className="np-shell">
        <Link href="/user-dashboard" className="np-nav-escape">
          ← Dashboard
        </Link>
        <p className="np-quiet">Loading your edition…</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="np-shell">
        <Link href="/user-dashboard" className="np-nav-escape">
          ← Dashboard
        </Link>
        <p className="np-quiet">We couldn&apos;t load the paper. Try again shortly.</p>
      </div>
    )
  }

  const bothQuiet = !data.review && !data.roundtable

  return (
    <div className="np-shell">
      <Link href="/user-dashboard" className="np-nav-escape">
        ← Dashboard
      </Link>

      <NewspaperMasthead editionLine={data.editionLine} />

      <NewspaperLead
        lead={data.review}
        leadQuietCopy={bothQuiet ? 'Quiet morning. Nothing urgent.' : undefined}
      />
      <NewspaperRoundtable
        item={data.roundtable}
        roundtableQuietCopy={bothQuiet ? 'No discussion items right now.' : undefined}
      />
    </div>
  )
}
