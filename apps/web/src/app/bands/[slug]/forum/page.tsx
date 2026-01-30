'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Button,
  Flex,
  Card,
  Badge,
  Loading,
  Alert,
  BandLayout
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function ForumPage() {
  const router = useRouter()
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
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const { data: bandData, isLoading: bandLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const { data: categoriesData, isLoading: categoriesLoading } = trpc.forum.listCategories.useQuery(
    { bandId: bandData?.band?.id || '', userId: userId || '' },
    { enabled: !!bandData?.band?.id && !!userId }
  )

  if (bandLoading || categoriesLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Forum"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Loading message="Loading forum..." />
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
          pageTitle="Forum"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
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
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)
  const canCreateCategory = categoriesData?.canCreateCategory || false
  const canCreatePost = categoriesData?.canCreatePost || false

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'GOVERNANCE':
        return <Badge variant="warning">Governors Only</Badge>
      case 'MODERATOR':
        return <Badge variant="info">Moderators+</Badge>
      default:
        return null
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'No posts yet'
    return new Date(date).toLocaleDateString()
  }

  const categories = categoriesData?.categories || []

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        pageTitle="Forum"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        bandId={bandData?.band?.id}
        userId={userId || undefined}
        action={
          canCreateCategory ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                // TODO: Implement create category modal
                alert('Create category coming soon')
              }}
            >
              New Category
            </Button>
          ) : undefined
        }
      >
        <Stack spacing="xl">
          <Stack spacing="sm">
            <Text color="muted">
              Long-form discussions and conversations for your band.
            </Text>
          </Stack>

          {categories.length === 0 ? (
            <Alert variant="info">
              <Text>No forum categories yet. Check back later!</Text>
            </Alert>
          ) : (
            <Stack spacing="md">
              {categories.map((category: any) => (
                <Card
                  key={category.id}
                  style={{
                    cursor: category.hasAccess ? 'pointer' : 'default',
                    opacity: category.hasAccess ? 1 : 0.6,
                  }}
                  onClick={() => {
                    if (category.hasAccess) {
                      router.push(`/bands/${slug}/forum/${category.slug}`)
                    }
                  }}
                >
                  <Flex justify="between" align="center">
                    <Stack spacing="xs">
                      <Flex align="center" gap="sm">
                        <Heading level={3}>{category.name}</Heading>
                        {getVisibilityBadge(category.visibility)}
                        {category.isArchived && <Badge variant="neutral">Archived</Badge>}
                      </Flex>
                      {category.description && (
                        <Text variant="small" color="muted">
                          {category.description}
                        </Text>
                      )}
                      {!category.hasAccess && (
                        <Text variant="small" color="danger">
                          Access restricted
                        </Text>
                      )}
                    </Stack>
                    {category.hasAccess && (
                      <div style={{ textAlign: 'right' }}>
                        <Stack spacing="xs">
                          <Text variant="small" weight="semibold">
                            {category.postCount} {category.postCount === 1 ? 'post' : 'posts'}
                          </Text>
                          <Text variant="small" color="muted">
                            Last activity: {formatDate(category.lastPostAt)}
                          </Text>
                        </Stack>
                      </div>
                    )}
                  </Flex>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}
