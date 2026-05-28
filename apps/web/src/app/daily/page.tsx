'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import { DailyMastheadSkeleton } from '@/components/newspaper/DailyMastheadSkeleton'
import { DailyOnboarding } from '@/components/newspaper/DailyOnboarding'
import { NewspaperMasthead } from '@/components/newspaper/NewspaperMasthead'
import { NewspaperFirstQuickAction } from '@/components/newspaper/NewspaperFirstQuickAction'
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

  const {
    data: access,
    isLoading: accessLoading,
    isError: accessError,
  } = trpc.auth.getAccessStatus.useQuery({ userId: userId! }, { enabled: !!userId })

  useEffect(() => {
    if (access && !access.hasAccess) {
      router.replace('/waiting-room')
    }
  }, [access, router])

  const { data, isLoading, isError } = trpc.newspaper.getHomeFeed.useQuery(
    { userId: userId! },
    { enabled: !!userId && access?.hasAccess === true }
  )

  if (!userId || accessLoading || (!accessError && !access)) {
    return (
      <div className="np-shell">
        <DailyMastheadSkeleton />
        <p className="np-quiet">Loading your edition…</p>
      </div>
    )
  }

  if (accessError) {
    return (
      <div className="np-shell">
        <DailyMastheadSkeleton />
        <p className="np-quiet">We couldn&apos;t verify access. Please try again shortly.</p>
      </div>
    )
  }

  if (!access.hasAccess) {
    return null
  }

  const editionLine = data?.editionLine ?? 'Your edition · Vol. I'
  const bothQuiet = !data?.review && !data?.roundtable

  return (
    <div className="np-shell">
      <NewspaperMasthead editionLine={editionLine} />

      <DailyOnboarding userId={userId} />

      {isLoading ? (
        <p className="np-quiet">Loading your edition…</p>
      ) : isError || !data ? (
        <p className="np-quiet">We couldn&apos;t load the rest of the paper. Try again shortly.</p>
      ) : (
        <>
          <NewspaperFirstQuickAction userId={userId} />

          <NewspaperLead
            lead={data.review}
            leadQuietCopy={bothQuiet ? 'Quiet morning. Nothing urgent.' : undefined}
          />
          <NewspaperRoundtable
            item={data.roundtable}
            roundtableQuietCopy={bothQuiet ? 'No discussion items right now.' : undefined}
          />
        </>
      )}
    </div>
  )
}
