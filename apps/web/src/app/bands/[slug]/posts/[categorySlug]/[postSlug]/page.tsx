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
  Input,
  Modal,
  useToast,
  MarkdownRenderer,
  MarkdownEditor
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
          <MarkdownRenderer content={response.content} />
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

export default function PostDetailPage() {
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
  const [showReplyPreview, setShowReplyPreview] = useState(false)
  const [editModal, setEditModal] = useState<{ responseId: string; content: string } | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showEditPreview, setShowEditPreview] = useState(false)
  const [deleteModal, setDeleteModal] = useState<string | null>(null)

  // Post edit/delete state
  const [editPostModal, setEditPostModal] = useState(false)
  const [editPostTitle, setEditPostTitle] = useState('')
  const [editPostContent, setEditPostContent] = useState('')
  const [showEditPostPreview, setShowEditPostPreview] = useState(false)
  const [deletePostModal, setDeletePostModal] = useState(false)

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

  const { data: postData, isLoading: postLoading, refetch: refetchPost } = trpc.posts.getPost.useQuery(
    { bandId: bandData?.band?.id || '', postSlug, userId: userId || '' },
    { enabled: !!bandData?.band?.id && !!userId && !!postSlug }
  )

  const createResponseMutation = trpc.posts.createResponse.useMutation({
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

  const updateResponseMutation = trpc.posts.updateResponse.useMutation({
    onSuccess: () => {
      showToast('Response updated!', 'success')
      setEditModal(null)
      refetchPost()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const deleteResponseMutation = trpc.posts.deleteResponse.useMutation({
    onSuccess: () => {
      showToast('Response deleted.', 'success')
      setDeleteModal(null)
      refetchPost()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const togglePinMutation = trpc.posts.togglePinPost.useMutation({
    onSuccess: () => {
      refetchPost()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const toggleLockMutation = trpc.posts.toggleLockPost.useMutation({
    onSuccess: () => {
      refetchPost()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const updatePostMutation = trpc.posts.updatePost.useMutation({
    onSuccess: (data) => {
      showToast('Post updated!', 'success')
      setEditPostModal(false)
      // If slug changed, navigate to new URL
      if (data.post.slug !== postSlug) {
        router.replace(`/bands/${slug}/posts/${categorySlug}/${data.post.slug}`)
      } else {
        refetchPost()
      }
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const deletePostMutation = trpc.posts.deletePost.useMutation({
    onSuccess: () => {
      showToast('Post deleted.', 'success')
      router.push(`/bands/${slug}/posts/${categorySlug}`)
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
          pageTitle="Posts"
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

  if (!postData?.post) {
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

  const handleOpenEditPost = () => {
    setEditPostTitle(post.title)
    setEditPostContent(post.content)
    setEditPostModal(true)
  }

  const handleUpdatePost = () => {
    if (!editPostTitle.trim() || !editPostContent.trim()) return

    updatePostMutation.mutate({
      postId: post.id,
      userId: userId!,
      title: editPostTitle.trim(),
      content: editPostContent.trim(),
    })
  }

  const handleDeletePost = () => {
    deletePostMutation.mutate({
      postId: post.id,
      userId: userId!,
    })
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
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
              onClick={() => router.push(`/bands/${slug}/posts/${categorySlug}`)}
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
                {/* Author edit/delete buttons */}
                {(postData.canEdit || postData.canDelete) && (
                  <Flex gap="xs">
                    {postData.canEdit && (
                      <Button variant="ghost" size="sm" onClick={handleOpenEditPost}>
                        Edit
                      </Button>
                    )}
                    {postData.canDelete && (
                      <Button variant="ghost" size="sm" onClick={() => setDeletePostModal(true)}>
                        Delete
                      </Button>
                    )}
                  </Flex>
                )}
              </Flex>
              <div className="p-4 bg-gray-50 rounded-lg">
                <MarkdownRenderer content={post.content} />
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
                  <Flex justify="between" align="center">
                    <Text weight="semibold">
                      {replyTo ? 'Reply to comment' : 'Add a response'}
                    </Text>
                    <Flex gap="sm">
                      <Button
                        type="button"
                        variant={!showReplyPreview ? 'primary' : 'ghost'}
                        size="xs"
                        onClick={() => setShowReplyPreview(false)}
                      >
                        Write
                      </Button>
                      <Button
                        type="button"
                        variant={showReplyPreview ? 'primary' : 'ghost'}
                        size="xs"
                        onClick={() => setShowReplyPreview(true)}
                      >
                        Preview
                      </Button>
                    </Flex>
                  </Flex>
                  {replyTo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyTo(null)}
                    >
                      Cancel reply
                    </Button>
                  )}
                  {!showReplyPreview ? (
                    <Textarea
                      placeholder="Write your response (Markdown supported)..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={4}
                      dir="auto"
                      style={{ unicodeBidi: 'plaintext' }}
                    />
                  ) : (
                    <div className="border border-gray-300 rounded-lg p-4 min-h-[100px] bg-white">
                      {replyContent.trim() ? (
                        <MarkdownRenderer content={replyContent} />
                      ) : (
                        <Text color="muted" className="italic">Nothing to preview yet...</Text>
                      )}
                    </div>
                  )}
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
          onClose={() => { setEditModal(null); setShowEditPreview(false); }}
          title="Edit Response"
        >
          <Stack spacing="md">
            <Flex justify="end" gap="sm">
              <Button
                type="button"
                variant={!showEditPreview ? 'primary' : 'ghost'}
                size="xs"
                onClick={() => setShowEditPreview(false)}
              >
                Write
              </Button>
              <Button
                type="button"
                variant={showEditPreview ? 'primary' : 'ghost'}
                size="xs"
                onClick={() => setShowEditPreview(true)}
              >
                Preview
              </Button>
            </Flex>
            {!showEditPreview ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                dir="auto"
                style={{ unicodeBidi: 'plaintext' }}
              />
            ) : (
              <div className="border border-gray-300 rounded-lg p-4 min-h-[150px] bg-white">
                {editContent.trim() ? (
                  <MarkdownRenderer content={editContent} />
                ) : (
                  <Text color="muted" className="italic">Nothing to preview yet...</Text>
                )}
              </div>
            )}
            <Flex justify="end" gap="sm">
              <Button variant="ghost" onClick={() => { setEditModal(null); setShowEditPreview(false); }}>
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

        {/* Edit Post modal */}
        <Modal
          isOpen={editPostModal}
          onClose={() => { setEditPostModal(false); setShowEditPostPreview(false); }}
          title="Edit Post"
          size="4xl"
        >
          <Stack spacing="md">
            <Input
              label="Title"
              value={editPostTitle}
              onChange={(e) => setEditPostTitle(e.target.value)}
              maxLength={200}
            />
            <div>
              <Flex justify="between" align="center" className="mb-2">
                <Text variant="small" weight="semibold">Content</Text>
                <Flex gap="sm">
                  <Button
                    type="button"
                    variant={!showEditPostPreview ? 'primary' : 'ghost'}
                    size="xs"
                    onClick={() => setShowEditPostPreview(false)}
                  >
                    Write
                  </Button>
                  <Button
                    type="button"
                    variant={showEditPostPreview ? 'primary' : 'ghost'}
                    size="xs"
                    onClick={() => setShowEditPostPreview(true)}
                  >
                    Preview
                  </Button>
                </Flex>
              </Flex>
              {!showEditPostPreview ? (
                <Textarea
                  dir="auto"
                  value={editPostContent}
                  onChange={(e) => setEditPostContent(e.target.value)}
                  rows={25}
                  placeholder="Post content (Markdown supported)..."
                  className="resize-y min-h-[400px]"
                  style={{ textAlign: 'start', unicodeBidi: 'plaintext' }}
                />
              ) : (
                <div className="border border-gray-300 rounded-lg p-4 min-h-[400px] bg-white overflow-y-auto">
                  {editPostContent.trim() ? (
                    <MarkdownRenderer content={editPostContent} />
                  ) : (
                    <Text color="muted" className="italic">Nothing to preview yet...</Text>
                  )}
                </div>
              )}
            </div>
            <Flex justify="end" gap="sm">
              <Button variant="ghost" onClick={() => { setEditPostModal(false); setShowEditPostPreview(false); }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdatePost}
                disabled={!editPostTitle.trim() || !editPostContent.trim() || updatePostMutation.isPending}
              >
                {updatePostMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Delete Post modal */}
        <Modal
          isOpen={deletePostModal}
          onClose={() => setDeletePostModal(false)}
          title="Delete Post"
        >
          <Stack spacing="md">
            <Text>Are you sure you want to delete this post? All responses will also be deleted. This action cannot be undone.</Text>
            <Flex justify="end" gap="sm">
              <Button variant="ghost" onClick={() => setDeletePostModal(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeletePost}
                disabled={deletePostMutation.isPending}
              >
                {deletePostMutation.isPending ? 'Deleting...' : 'Delete Post'}
              </Button>
            </Flex>
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}
