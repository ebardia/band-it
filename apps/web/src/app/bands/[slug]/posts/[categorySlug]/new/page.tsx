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
  Loading,
  Alert,
  BandLayout,
  Input,
  Textarea,
  useToast
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function NewPostPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const categorySlug = params.categorySlug as string
  const { showToast } = useToast()

  const [userId, setUserId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

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

  const createPostMutation = trpc.posts.createPost.useMutation({
    onSuccess: (data) => {
      showToast('Post created!', 'success')
      router.push(`/bands/${slug}/posts/${categorySlug}/${data.post.slug}`)
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  if (bandLoading || categoryLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="New Post"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Loading message="Loading..." />
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
          pageTitle="New Post"
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
          pageTitle="New Post"
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

  if (!canCreatePost) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName={band.name}
        bandImageUrl={band.imageUrl}
          pageTitle="New Post"
          canApprove={canApprove}
          isMember={isMember}
          canAccessAdminTools={canAccessAdminTools}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Alert variant="danger">
            <Text>You do not have permission to create posts in this category.</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return

    createPostMutation.mutate({
      bandId: band.id,
      categoryId: category.id,
      userId: userId!,
      title: title.trim(),
      content: content.trim(),
    })
  }

  const isValid = title.trim().length >= 5 && content.trim().length >= 20

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle={`New Post in ${category.name}`}
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        bandId={bandData?.band?.id}
        userId={userId || undefined}
      >
        <Stack spacing="xl">
          <Flex justify="between" align="center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/bands/${slug}/posts/${categorySlug}`)}
            >
              &larr; Back to {category.name}
            </Button>
          </Flex>

          <Card>
            <Stack spacing="lg">
              <Heading level={2}>Create New Post</Heading>

              <Stack spacing="md">
                <Stack spacing="xs">
                  <Text weight="semibold">Title</Text>
                  <Input
                    placeholder="Enter a descriptive title (min 5 characters)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                  />
                  <Text variant="small" color="muted">
                    {title.length}/200 characters
                  </Text>
                </Stack>

                <Stack spacing="xs">
                  <Text weight="semibold">Content</Text>
                  <Textarea
                    placeholder="Write your post content here. Markdown is supported for formatting (min 20 characters)..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={12}
                  />
                  <Text variant="small" color="muted">
                    {content.length} characters (minimum 20 required)
                  </Text>
                </Stack>

                <Alert variant="info">
                  <Stack spacing="xs">
                    <Text weight="semibold">Markdown Tips</Text>
                    <Text variant="small">
                      **bold** for <strong>bold</strong>, *italic* for <em>italic</em>,
                      `code` for <code>inline code</code>, and blank lines for paragraphs.
                    </Text>
                  </Stack>
                </Alert>
              </Stack>

              <Flex justify="end" gap="sm">
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/bands/${slug}/posts/${categorySlug}`)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!isValid || createPostMutation.isPending}
                >
                  {createPostMutation.isPending ? 'Creating...' : 'Create Post'}
                </Button>
              </Flex>
            </Stack>
          </Card>
        </Stack>
      </BandLayout>
    </>
  )
}
