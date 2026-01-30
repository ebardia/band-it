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
  BandLayout,
  Textarea,
  Modal,
  useToast
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

interface ThreadedResponse {
  id: string
  content: string
  depth: number
  author: { id: string; name: string }
  isEdited: boolean
  createdAt: string
  canReply: boolean
  replies: ThreadedResponse[]
}

function ResponseThread({
  response,
  onReply,
  onEdit,
  onDelete,
  currentUserId,
  canModerate,
  canRespond,
}: {
  response: ThreadedResponse
  onReply: (parentId: string) => void
  onEdit: (responseId: string, content: string) => void
  onDelete: (responseId: string) => void
  currentUserId: string
  canModerate: boolean
  canRespond: boolean
}) {
  const isAuthor = response.author.id === currentUserId
  const canDelete = isAuthor || canModerate

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  }

  return (
    <div style={{ marginLeft: response.depth > 1 ? '24px' : '0' }}>
      <Card style={{ marginBottom: '12px' }}>
        <Stack spacing="sm">
          <Flex justify="between" align="start">
            <Stack spacing="xs">
              <Flex align="center" gap="sm">
                <Text weight="semibold">{response.author.name}</Text>
                <Text variant="small" color="muted">
                  {formatDate(response.createdAt)}
                  {response.isEdited && ' (edited)'}
                </Text>
              </Flex>
            </Stack>
            <Flex gap="xs">
              {canRespond && response.canReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(response.id)}
                >
                  Reply
                </Button>
              )}
              {isAuthor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(response.id, response.content)}
                >
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(response.id)}
                >
                  Delete
                </Button>
              )}
            </Flex>
          </Flex>
          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
            {response.content}
          </div>
        </Stack>
      </Card>

      {response.replies && response.replies.length > 0 && (
        <div>
          {response.replies.map((reply) => (
            <ResponseThread
              key={reply.id}
              response={reply}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              currentUserId={currentUserId}
              canModerate={canModerate}
              canRespond={canRespond}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ForumPostPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const categorySlug = params.categorySlug as string
  const postSlug = params.postSlug as string
  const { showToast } = useToast()
  const utils = trpc.useUtils()

  const [userId, setUserId] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<string | null>(null) // parentId or null for post-level
  const [replyContent, setReplyContent] = useState('')
  const [editModal, setEditModal] = useState<{ responseId: string; content: string } | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deleteModal, setDeleteModal] = useState<string | null>(null)

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

  const { data: postData, isLoading: postLoading, refetch: refetchPost } = trpc.forum.getPost.useQuery(
    { bandId: bandData?.band?.id || '', postSlug, userId: userId || '' },
    { enabled: !!bandData?.band?.id && !!userId && !!postSlug }
  )

  const createResponseMutation = trpc.forum.createResponse.useMutation({
    onSuccess: () => {
      showToast('Response posted!', 'success')
      setReplyContent('')
      setReplyTo(null)
      refetchPost()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const updateResponseMutation = trpc.forum.updateResponse.useMutation({
    onSuccess: () => {
      showToast('Response updated!', 'success')
      setEditModal(null)
      refetchPost()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const deleteResponseMutation = trpc.forum.deleteResponse.useMutation({
    onSuccess: () => {
      showToast('Response deleted.', 'success')
      setDeleteModal(null)
      refetchPost()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const togglePinMutation = trpc.forum.togglePinPost.useMutation({
    onSuccess: () => {
      refetchPost()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const toggleLockMutation = trpc.forum.toggleLockPost.useMutation({
    onSuccess: () => {
      refetchPost()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  if (bandLoading || postLoading) {
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
          <Loading message="Loading post..." />
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

  if (!postData?.post) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName={bandData.band.name}
          pageTitle="Forum"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Alert variant="danger">
            <Text>Post not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const band = bandData.band
  const post = postData.post
  const category = postData.category
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)
  const canModerate = postData.canModerate
  const canRespond = postData.canRespond

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString()
  }

  const handleSubmitResponse = () => {
    if (!replyContent.trim()) return

    createResponseMutation.mutate({
      postId: post.id,
      userId: userId!,
      content: replyContent.trim(),
      parentId: replyTo || undefined,
    })
  }

  const handleEditResponse = () => {
    if (!editModal || !editContent.trim()) return

    updateResponseMutation.mutate({
      responseId: editModal.responseId,
      userId: userId!,
      content: editContent.trim(),
    })
  }

  const handleDeleteResponse = () => {
    if (!deleteModal) return

    deleteResponseMutation.mutate({
      responseId: deleteModal,
      userId: userId!,
    })
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        pageTitle={post.title}
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
              onClick={() => router.push(`/bands/${slug}/forum/${categorySlug}`)}
            >
              &larr; Back to {category.name}
            </Button>
            {canModerate && (
              <Flex gap="sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePinMutation.mutate({ postId: post.id, userId: userId! })}
                >
                  {post.isPinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLockMutation.mutate({ postId: post.id, userId: userId! })}
                >
                  {post.isLocked ? 'Unlock' : 'Lock'}
                </Button>
              </Flex>
            )}
          </Flex>

          {/* Post content */}
          <Card>
            <Stack spacing="md">
              <Flex justify="between" align="start">
                <Stack spacing="xs">
                  <Flex align="center" gap="sm">
                    {post.isPinned && <Badge variant="info">Pinned</Badge>}
                    {post.isLocked && <Badge variant="warning">Locked</Badge>}
                    <Heading level={2}>{post.title}</Heading>
                  </Flex>
                  <Text variant="small" color="muted">
                    By {post.author.name} • {formatDate(post.createdAt)}
                    {post.isEdited && ` • Edited ${formatDate(post.editedAt!)}`}
                  </Text>
                </Stack>
              </Flex>
              <div style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                padding: '16px',
                backgroundColor: 'var(--color-surface-hover, #f5f5f5)',
                borderRadius: '8px',
              }}>
                {post.content}
              </div>
            </Stack>
          </Card>

          {/* Responses section */}
          <Stack spacing="md">
            <Heading level={3}>
              {post.responseCount} {post.responseCount === 1 ? 'Response' : 'Responses'}
            </Heading>

            {/* Response form */}
            {canRespond && (
              <Card>
                <Stack spacing="sm">
                  <Text weight="semibold">
                    {replyTo ? 'Reply to comment' : 'Add a response'}
                  </Text>
                  {replyTo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyTo(null)}
                    >
                      Cancel reply
                    </Button>
                  )}
                  <Textarea
                    placeholder="Write your response (Markdown supported)..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={4}
                  />
                  <Flex justify="end">
                    <Button
                      variant="primary"
                      onClick={handleSubmitResponse}
                      disabled={!replyContent.trim() || createResponseMutation.isPending}
                    >
                      {createResponseMutation.isPending ? 'Posting...' : 'Post Response'}
                    </Button>
                  </Flex>
                </Stack>
              </Card>
            )}

            {post.isLocked && (
              <Alert variant="warning">
                <Text>This post is locked. No new responses can be added.</Text>
              </Alert>
            )}

            {/* Threaded responses */}
            {postData.responses.length > 0 ? (
              <Stack spacing="md">
                {postData.responses.map((response: ThreadedResponse) => (
                  <ResponseThread
                    key={response.id}
                    response={response}
                    onReply={(parentId) => setReplyTo(parentId)}
                    onEdit={(responseId, content) => {
                      setEditModal({ responseId, content })
                      setEditContent(content)
                    }}
                    onDelete={(responseId) => setDeleteModal(responseId)}
                    currentUserId={userId!}
                    canModerate={canModerate}
                    canRespond={canRespond}
                  />
                ))}
              </Stack>
            ) : (
              <Text color="muted">No responses yet. Be the first to respond!</Text>
            )}
          </Stack>
        </Stack>

        {/* Edit modal */}
        <Modal
          isOpen={!!editModal}
          onClose={() => setEditModal(null)}
          title="Edit Response"
        >
          <Stack spacing="md">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
            />
            <Flex justify="end" gap="sm">
              <Button variant="ghost" onClick={() => setEditModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleEditResponse}
                disabled={!editContent.trim() || updateResponseMutation.isPending}
              >
                {updateResponseMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Delete confirmation modal */}
        <Modal
          isOpen={!!deleteModal}
          onClose={() => setDeleteModal(null)}
          title="Delete Response"
        >
          <Stack spacing="md">
            <Text>Are you sure you want to delete this response? This action cannot be undone.</Text>
            <Flex justify="end" gap="sm">
              <Button variant="ghost" onClick={() => setDeleteModal(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteResponse}
                disabled={deleteResponseMutation.isPending}
              >
                {deleteResponseMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </Flex>
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}
