'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import {
  QuickLayout,
  QuickCard,
  QuickButton,
  QuickDivider,
  QuickInfo,
  QuickBadge,
} from '@/components/quick'

export default function QuickReadPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.postId as string

  const [userId, setUserId] = useState<string | null>(null)

  // Check for authentication
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
        // Redirect to login with returnTo
        router.push(`/login?returnTo=/quick/read/${postId}`)
      }
    } else {
      // Redirect to login with returnTo
      router.push(`/login?returnTo=/quick/read/${postId}`)
    }
  }, [router, postId])

  // Fetch read context
  const {
    data: context,
    isLoading,
    error,
  } = trpc.quick.getReadContext.useQuery(
    { postId, userId: userId! },
    { enabled: !!userId && !!postId }
  )

  // Format date for display
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Show loading state
  if (isLoading || !userId) {
    return (
      <QuickLayout
        title="Loading..."
        isLoading={true}
      />
    )
  }

  // Show error state
  if (error) {
    return (
      <QuickLayout
        title="Read Post"
        error={error.message}
      />
    )
  }

  // No context (shouldn't happen if query succeeded)
  if (!context) {
    return (
      <QuickLayout
        title="Read Post"
        error="Unable to load post"
      />
    )
  }

  const { post, band, category, permissions } = context

  return (
    <QuickLayout
      bandName={band.name}
      bandSlug={band.slug}
      title="Post"
    >
      {/* Post header */}
      <QuickCard>
        <div className="space-y-3">
          {/* Title and badges */}
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-col gap-1 shrink-0">
              {post.isPinned && (
                <QuickBadge variant="warning">Pinned</QuickBadge>
              )}
              {post.isLocked && (
                <QuickBadge variant="danger">Locked</QuickBadge>
              )}
            </div>
          </div>

          {/* Author and date */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{post.author.name}</span>
            <span>·</span>
            <span>{formatDate(post.createdAt)}</span>
            {post.isEdited && post.editedAt && (
              <>
                <span>·</span>
                <span className="text-orange-600">edited</span>
              </>
            )}
          </div>

          {/* Category */}
          <div className="flex items-center gap-2">
            <QuickBadge variant="info">{category.name}</QuickBadge>
          </div>
        </div>
      </QuickCard>

      {/* Post content */}
      <QuickCard className="mt-4">
        <div className="prose prose-sm max-w-none">
          <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </div>
        </div>
      </QuickCard>

      {/* Response summary */}
      <QuickCard className="mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💬</span>
            <span className="text-lg font-semibold text-gray-900">
              {post.responseCount}
            </span>
            <span className="text-gray-600 text-sm">
              {post.responseCount === 1 ? 'response' : 'responses'}
            </span>
          </div>
          {permissions.canRespond ? (
            <QuickBadge variant="success">Can Reply</QuickBadge>
          ) : post.isLocked ? (
            <QuickBadge variant="danger">Locked</QuickBadge>
          ) : !permissions.inGoodStanding ? (
            <QuickBadge variant="warning">Dues Required</QuickBadge>
          ) : null}
        </div>
      </QuickCard>

      {/* Dues required notice */}
      {!permissions.inGoodStanding && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            {permissions.duesReason || 'Please pay your dues to participate in discussions.'}
          </p>
          <QuickButton
            variant="secondary"
            fullWidth
            className="mt-3"
            onClick={() => router.push(`/bands/${band.slug}/billing`)}
          >
            Go to Billing
          </QuickButton>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 space-y-3">
        <QuickButton
          variant="primary"
          fullWidth
          onClick={() => router.push(`/bands/${band.slug}/posts/${category.slug}/${post.slug}`)}
        >
          View Full Post & Responses
        </QuickButton>

        {permissions.canEdit && (
          <QuickButton
            variant="secondary"
            fullWidth
            onClick={() => router.push(`/bands/${band.slug}/posts/${category.slug}/${post.slug}`)}
          >
            Edit Post
          </QuickButton>
        )}

        <QuickButton
          variant="secondary"
          fullWidth
          onClick={() => router.push(`/bands/${band.slug}/posts/${category.slug}`)}
        >
          Back to {category.name}
        </QuickButton>
      </div>

      {/* Link to full site */}
      <div className="mt-6 text-center">
        <button
          onClick={() => router.push(`/bands/${band.slug}`)}
          className="text-sm text-blue-600 hover:underline"
        >
          Go to {band.name}
        </button>
      </div>
    </QuickLayout>
  )
}
