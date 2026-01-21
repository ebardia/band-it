'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Text,
  Stack,
  Card,
  Loading,
  Alert,
  AdminLayout
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function AdminBlockedTermsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const { data: profileData, isLoading: profileLoading } = trpc.auth.getProfile.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  if (profileLoading) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Blocked Terms" subtitle="Loading...">
          <Loading message="Checking permissions..." />
        </AdminLayout>
      </>
    )
  }

  if (!profileData?.user?.isAdmin) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Access Denied">
          <Alert variant="danger">
            <Text>You do not have permission to access the admin area.</Text>
          </Alert>
        </AdminLayout>
      </>
    )
  }

  return (
    <>
      <AppNav />
      <AdminLayout pageTitle="Blocked Terms" subtitle="Manage keyword blocklist">
        <Card>
          <Stack spacing="md" className="py-8 text-center">
            <Text color="muted">No blocked terms configured</Text>
            <Text variant="small" color="muted">
              Keyword blocking will be available after Phase 2 implementation.
            </Text>
          </Stack>
        </Card>
      </AdminLayout>
    </>
  )
}
