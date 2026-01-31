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

export default function PostCategoryPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const categorySlug = params.categorySlug as string
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

  const { data: categoryData, isLoading: categoryLoading } = trpc.posts.getCategory.useQuery(
    { bandId: bandData?.band?.id || '', categorySlug, userId: userId || '' },
    { enabled: !!bandData?.band?.id && !!userId && !!categorySlug }
  )

  const { data: postsData, isLoading: postsLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = trpc.posts.listPosts.useInfiniteQuery(
    { bandId: bandData?.band?.id || '', categoryId: categoryData?.category?.id || '', userId: userId || '', limit: 20 },
    {
      enabled: !!bandData?.band?.id && !!categoryData?.category?.id && !!userId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  )

  if (bandLoading || categoryLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Posts"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Loading message="Loading category..." />
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
          pageTitle="Posts"
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

  if (!categoryData?.category) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName={bandData.band.name}
          pageTitle="Posts"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Alert variant="danger">
            <Text>Category not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const band = bandData.band
  const category = categoryData.category
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)
  const canCreatePost = categoryData?.canCreatePost && !category.isArchived

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return d.toLocaleDateString()
  }

  // Flatten pages
  const allPosts = postsData?.pages.flatMap(page => page.posts) || []

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        pageTitle={category.name}
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        bandId={bandData?.band?.id}
        userId={userId || undefined}
        action={
          canCreatePost ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push(`/bands/${slug}/posts/${categorySlug}/new`)}
            >
              New Post
            </Button>
          ) : undefined
        }
      >
        <Stack spacing="xl">
          <Flex justify="between" align="center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/bands/${slug}/posts`)}
            >
              &larr; Back to Posts
            </Button>
          </Flex>

          {category.isArchived && (
            <Alert variant="warning">
              <Text>This category is archived. No new posts can be created.</Text>
            </Alert>
          )}

          {postsLoading ? (
            <Loading message="Loading posts..." />
          ) : allPosts.length === 0 ? (
            <Alert variant="info">
              <Text>No posts in this category yet. {canCreatePost ? 'Be the first to start a discussion!' : ''}</Text>
            </Alert>
          ) : (
            <Stack spacing="md">
              {allPosts.map((post: any) => (
                <Card
                  key={post.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/bands/${slug}/posts/${categorySlug}/${post.slug}`)}
                >
                  <Flex justify="between" align="center">
                    <Stack spacing="xs">
                      <Flex align="center" gap="sm">
                        {post.isPinned && <Badge variant="info">Pinned</Badge>}
                        {post.isLocked && <Badge variant="warning">Locked</Badge>}
                        <Heading level={3}>{post.title}</Heading>
                      </Flex>
                      <Text variant="small" color="muted">
                        By {post.author.name} • {formatDate(post.createdAt)}
                        {post.isEdited && ' (edited)'}
                      </Text>
                    </Stack>
                    <div style={{ textAlign: 'right' }}>
                      <Stack spacing="xs">
                        <Text variant="small" weight="semibold">
                          {post.responseCount} {post.responseCount === 1 ? 'response' : 'responses'}
                        </Text>
                        {post.lastResponseAt && (
                          <Text variant="small" color="muted">
                            Last reply: {formatDate(post.lastResponseAt)}
                          </Text>
                        )}
                      </Stack>
                    </div>
                  </Flex>
                </Card>
              ))}

              {hasNextPage && (
                <Flex justify="center">
                  <Button
                    variant="secondary"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                  </Button>
                </Flex>
              )}
            </Stack>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}
