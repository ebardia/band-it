'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageLayout, Container, Loading } from '@/components/ui'

/** First-time profile setup uses the editorial resume profile (wizard comes later). */
export default function ProfileOnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/user-dashboard/profile')
  }, [router])

  return (
    <PageLayout>
      <Container size="md">
        <Loading message="Opening your profile…" />
      </Container>
    </PageLayout>
  )
}
