'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Text,
  Stack,
  Button,
  Flex,
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
        bandImageUrl={band.imageUrl}
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
        <Stack spacing="md">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/bands/${slug}/posts`)}>
            ← Back to Posts
          </Button>

          {category.isArchived && (
            <Alert variant="warning">
              <Text variant="small">This category is archived. No new posts allowed.</Text>
            </Alert>
          )}

          {postsLoading ? (
            <Loading message="Loading posts..." />
          ) : allPosts.length === 0 ? (
            <div className="border border-gray-200 rounded-lg bg-white p-4 text-center">
              <Text color="muted">No posts yet.{canCreatePost ? ' Be the first!' : ''}</Text>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              {allPosts.map((post: any) => (
                <div
                  key={post.id}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/bands/${slug}/posts/${categorySlug}/${post.slug}`)}
                >
                  <div className="flex items-center justify-between py-3 px-3 md:px-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.isPinned && <Badge variant="info">Pinned</Badge>}
                        {post.isLocked && <Badge variant="warning">Locked</Badge>}
                        <Text weight="semibold">{post.title}</Text>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span>{post.author.name}</span>
                        <span>•</span>
                        <span>{formatDate(post.createdAt)}</span>
                        {post.isEdited && <span className="text-gray-400">(edited)</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-3 text-sm">
                      <div className="text-right">
                        <span className="font-medium">{post.responseCount}</span>
                        <span className="text-gray-500 ml-1">{post.responseCount === 1 ? 'reply' : 'replies'}</span>
                        {post.lastResponseAt && (
                          <div className="text-gray-400 text-xs">{formatDate(post.lastResponseAt)}</div>
                        )}
                      </div>
                      <span className="text-gray-400">→</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasNextPage && (
            <Flex justify="center">
              <Button variant="secondary" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Loading...' : 'Load More'}
              </Button>
            </Flex>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}
