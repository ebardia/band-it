'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Text,
  Stack,
  Loading,
  Alert,
  BandLayout,
  BandDetailsSettings,
  BillingSettings,
  DissolveBandSection,
  TransferOwnershipSection,
  GovernanceSettings
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
          wide={true}
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
          wide={true}
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
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)

  if (!isMember) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName={band.name}
          bandImageUrl={band.imageUrl}
          pageTitle="Settings"
          isMember={false}
          wide={true}
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
        bandImageUrl={band.imageUrl}
        pageTitle="Settings"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        bandId={band.id}
        userId={userId || undefined}
      >
        <Stack spacing="md">
          {/* Band Details */}
          {userId && (
            <BandDetailsSettings
              bandId={band.id}
              bandSlug={slug}
              userId={userId}
              userRole={currentMember?.role}
              initialData={{
                name: band.name,
                description: band.description,
                mission: band.mission,
                values: band.values || [],
                skillsLookingFor: band.skillsLookingFor || [],
                whatMembersWillLearn: band.whatMembersWillLearn || [],
                membershipRequirements: band.membershipRequirements,
                zipcode: band.zipcode,
                imageUrl: band.imageUrl,
              }}
            />
          )}

          {/* Governance Settings */}
          {userId && (
            <GovernanceSettings
              bandId={band.id}
              userId={userId}
            />
          )}

          {/* Billing Settings */}
          {userId && (
            <BillingSettings
              bandId={band.id}
              bandSlug={slug}
              userId={userId}
            />
          )}

          {/* Transfer Ownership - shown only to FOUNDER */}
          {userId && currentMember && (
            <TransferOwnershipSection
              bandId={band.id}
              bandSlug={slug}
              bandName={band.name}
              userId={userId}
              userRole={currentMember.role}
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
