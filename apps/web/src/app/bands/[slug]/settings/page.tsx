'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Loading,
  Alert,
  BandLayout,
  BillingSettings,
  DissolveBandSection
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function BandSettingsPage() {
  const params = useParams()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
      }
    }
  }, [])

  const { data: bandData, isLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  if (isLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Loading..."
          isMember={false}
        >
          <Loading message="Loading settings..." />
        </BandLayout>
      </>
    )
  }

  if (!bandData?.band) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Band Not Found"
          isMember={false}
        >
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const band = bandData.band
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const isMember = !!currentMember

  if (!isMember) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName={band.name}
          pageTitle="Settings"
          isMember={false}
        >
          <Alert variant="warning">
            <Text>You must be a member of this band to view settings.</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        pageTitle="Settings"
        isMember={isMember}
      >
        <Stack spacing="lg">
          <Heading level={2}>Band Settings</Heading>

          {/* Billing Settings */}
          {userId && (
            <BillingSettings
              bandId={band.id}
              bandSlug={slug}
              userId={userId}
            />
          )}

          {/* Dissolve Band - shown to any member who can dissolve */}
          {userId && (
            <DissolveBandSection
              bandId={band.id}
              bandSlug={slug}
              bandName={band.name}
              userId={userId}
            />
          )}
        </Stack>
      </BandLayout>
    </>
  )
}
