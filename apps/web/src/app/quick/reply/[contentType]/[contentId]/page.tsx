'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import {
  QuickLayout,
  QuickCard,
  QuickButton,
  QuickBadge,
} from '@/components/quick'

export default function QuickReplyPage() {
  const router = useRouter()
  const params = useParams()
  const contentType = params.contentType as 'message' | 'post_response'
  const contentId = params.contentId as string

  const [userId, setUserId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replySubmitted, setReplySubmitted] = useState(false)

  // Validate content type
  const validContentType = contentType === 'message' || contentType === 'post_response'

  // Check for authentication
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: { userId: string } = jwtDecode(token)
        setUserId(decoded.userId)
      } catch {
        router.push(`/login?returnTo=/quick/reply/${contentType}/${contentId}`)
      }
    } else {
      router.push(`/login?returnTo=/quick/reply/${contentType}/${contentId}`)
    }
  }, [router, contentType, contentId])

  // Fetch reply context
  const {
    data: context,
    isLoading,
    error,
  } = trpc.quick.getReplyContext.useQuery(
    {
      contentId,
      contentType: contentType as 'message' | 'post_response',
      userId: userId!,
    },
    { enabled: !!userId && !!contentId && validContentType }
  )

  // Message reply mutation
  const messageReplyMutation = trpc.message.create.useMutation({
    onSuccess: () => {
      setReplySubmitted(true)
      setIsSubmitting(false)
    },
    onError: () => {
      setIsSubmitting(false)
    },
  })

  // Post response reply mutation
  const postResponseMutation = trpc.posts.createResponse.useMutation({
    onSuccess: () => {
      setReplySubmitted(true)
      setIsSubmitting(false)
    },
    onError: () => {
      setIsSubmitting(false)
    },
  })

  const handleSubmit = () => {
    if (!userId || !replyText.trim() || !context) return
    setIsSubmitting(true)

    if (context.content.type === 'message' && 'channel' in context) {
      // Reply to message in channel
      messageReplyMutation.mutate({
        channelId: context.channel.id,
        userId,
        content: replyText,
        threadId: contentId,
      })
    } else if (context.content.type === 'post_response' && 'post' in context) {
      // Reply to post response
      postResponseMutation.mutate({
        postId: context.post.id,
        userId,
        content: replyText,
        parentId: contentId,
      })
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const now = new Date()
    const messageDate = new Date(dateString)
    const diffMs = now.getTime() - messageDate.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return messageDate.toLocaleDateString()
  }

  // Invalid content type
  if (!validContentType) {
    return (
      <QuickLayout
        title="Reply"
        error="Invalid content type. Expected 'message' or 'post_response'."
      />
    )
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
        title="Reply"
        error={error.message}
      />
    )
  }

  // No context
  if (!context) {
    return (
      <QuickLayout
        title="Reply"
        error="Unable to load content"
      />
    )
  }

  const { content, band, permissions } = context

  // Type guards for union type narrowing
  const isMessageContext = content.type === 'message' && 'channel' in context
  const isPostResponseContext = content.type === 'post_response' && 'post' in context

  // Show success state after replying
  if (replySubmitted) {
    let destinationUrl = `/bands/${band.slug}`
    if (isPostResponseContext) {
      destinationUrl = `/bands/${band.slug}/posts/${context.category.slug}/${context.post.slug}`
    }

    return (
      <QuickLayout
        bandName={band.name}
        bandSlug={band.slug}
        title="Reply Sent"
      >
        <QuickCard>
          <div className="text-center py-6">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Reply Sent
            </h2>
            <p className="text-gray-600 text-sm">
              Your reply has been posted successfully.
            </p>
          </div>
        </QuickCard>

        <div className="mt-6 space-y-3">
          <QuickButton
            variant="primary"
            fullWidth
            onClick={() => router.push(destinationUrl)}
          >
            {isMessageContext ? 'Go to Discussions' : 'View Post'}
          </QuickButton>
          <QuickButton
            variant="secondary"
            fullWidth
            onClick={() => router.push(`/bands/${band.slug}`)}
          >
            Back to {band.name}
          </QuickButton>
        </div>
      </QuickLayout>
    )
  }

  // Cannot reply - dues required
  if (!permissions.inGoodStanding) {
    return (
      <QuickLayout
        bandName={band.name}
        bandSlug={band.slug}
        title="Dues Required"
      >
        <QuickCard>
          <div className="text-center py-6">
            <div className="text-4xl mb-4">💳</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Dues Payment Required
            </h2>
            <p className="text-gray-600 text-sm">
              {permissions.duesReason || 'Please pay your dues to reply.'}
            </p>
          </div>
        </QuickCard>

        <div className="mt-6 space-y-3">
          <QuickButton
            variant="primary"
            fullWidth
            onClick={() => router.push(`/bands/${band.slug}/billing`)}
          >
            Go to Billing
          </QuickButton>
        </div>
      </QuickLayout>
    )
  }

  // Cannot reply - max depth or locked
  if (!permissions.canReply) {
    let reason = 'You cannot reply to this content'
    if (isPostResponseContext && 'maxDepthReached' in permissions && permissions.maxDepthReached) {
      reason = 'Maximum reply depth reached'
    } else if (isPostResponseContext && context.post.isLocked) {
      reason = 'This post is locked'
    }

    return (
      <QuickLayout
        bandName={band.name}
        bandSlug={band.slug}
        title="Cannot Reply"
      >
        <QuickCard>
          <div className="text-center py-6">
            <div className="text-4xl mb-4">🚫</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {reason}
            </h2>
            <p className="text-gray-600 text-sm">
              {isPostResponseContext && 'maxDepthReached' in permissions && permissions.maxDepthReached
                ? 'Please reply to an earlier message in the thread instead.'
                : 'This content cannot receive replies at this time.'}
            </p>
          </div>
        </QuickCard>

        <div className="mt-6">
          <QuickButton
            variant="secondary"
            fullWidth
            onClick={() => router.push(`/bands/${band.slug}`)}
          >
            Back to {band.name}
          </QuickButton>
        </div>
      </QuickLayout>
    )
  }

  // Main reply UI
  return (
    <QuickLayout
      bandName={band.name}
      bandSlug={band.slug}
      title="Reply"
    >
      {/* Original content */}
      <QuickCard>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">{content.author.name}</span>
            <span className="text-xs text-gray-500">{formatDate(content.createdAt as unknown as string)}</span>
          </div>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">
            {content.text}
          </p>
          {isMessageContext && (
            <div className="pt-2">
              <QuickBadge variant="info">#{context.channel.name}</QuickBadge>
            </div>
          )}
          {isPostResponseContext && (
            <div className="pt-2">
              <QuickBadge variant="info">{context.post.title}</QuickBadge>
            </div>
          )}
        </div>
      </QuickCard>

      {/* Reply form */}
      <QuickCard className="mt-4">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Your Reply
          </label>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500">
            {replyText.length} characters
          </p>
        </div>
      </QuickCard>

      {/* Action buttons */}
      <div className="mt-6 space-y-3">
        <QuickButton
          variant="primary"
          fullWidth
          onClick={handleSubmit}
          disabled={isSubmitting || !replyText.trim()}
        >
          {isSubmitting ? 'Sending...' : 'Send Reply'}
        </QuickButton>

        <QuickButton
          variant="secondary"
          fullWidth
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </QuickButton>
      </div>
    </QuickLayout>
  )
}
