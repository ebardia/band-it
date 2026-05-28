'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DailyMastheadSkeleton } from '@/components/newspaper/DailyMastheadSkeleton'

/** Legacy route — onboarding now lives on /daily. */
export default function WelcomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/daily')
  }, [router])

  return (
    <div className="np-shell">
      <DailyMastheadSkeleton />
      <p className="np-quiet">Opening your edition…</p>
    </div>
  )
}
