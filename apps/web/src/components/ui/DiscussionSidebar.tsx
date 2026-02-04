'use client'

import { useState, useRef } from 'react'
import { trpc } from '@/lib/trpc'
import { Stack, Flex } from './layout'
import { Text } from './Typography'
import { Button } from './Button'
import { Badge } from './Badge'
import { Card } from './Card'
import { Textarea } from './Textarea'
import { RightSidebar } from './RightSidebar'
import { useToast } from './Toast'

interface DiscussionSidebarProps {
  bandId?: string
  proposalId?: string
  projectId?: string
  taskId?: string
  userId: string | null
  bandMembers: any[]
}

const REACTION_EMOJIS: Record<string, string> = {
  THUMBS_UP: '👍',
  THUMBS_DOWN: '👎',
  HEART: '❤️',
  CELEBRATE: '🎉',
  THINKING: '🤔',
}

function getReactionCounts(reactions: any[]): Record<string, { count: number; userIds: string[] }> {
  const counts: Record<string, { count: number; userIds: string[] }> = {}
  reactions.forEach(r => {
    if (!counts[r.type]) {
      counts[r.type] = { count: 0, userIds: [] }
    }
    counts[r.type].count++
    counts[r.type].userIds.push(r.userId)
  })
  return counts
}

interface ReactionButtonsProps {
  reactions: any[]
  userId: string | null
  commentId: string
  onReaction: (commentId: string, type: string) => void
  showAll?: boolean
}

function ReactionButtons({ reactions, userId, commentId, onReaction, showAll = true }: ReactionButtonsProps) {
  const reactionCounts = getReactionCounts(reactions || [])
  
  return (
    <Flex gap="sm" className="flex-wrap">
      {Object.entries(reactionCounts).map(([type, data]) => (
        <Button
          key={type}
          variant={data.userIds.includes(userId || '') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onReaction(commentId, type)}
        >
          {REACTION_EMOJIS[type]} {data.count}
        </Button>
      ))}
      {showAll && Object.entries(REACTION_EMOJIS).map(([type, emoji]) => {
        if (reactionCounts[type]) return null
        return (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            onClick={() => onReaction(commentId, type)}
          >
            {emoji}
          </Button>
        )
      })}
    </Flex>
  )
}

interface CommentRepliesProps {
  replies: any[]
  userId: string | null
  onReaction: (commentId: string, type: string) => void
}

function CommentReplies({ replies, userId, onReaction }: CommentRepliesProps) {
  if (!replies || replies.length === 0) return null
  
  return (
    <Card className="ml-4 p-2 bg-gray-50">
      <Stack spacing="sm">
        {replies.map((reply: any) => (
          <Stack key={reply.id} spacing="xs">
            <Flex gap="sm" align="center">
              <Text variant="small" weight="semibold">{reply.author.name}</Text>
              <Text variant="small" color="muted">
                {new Date(reply.createdAt).toLocaleDateString()}
              </Text>
            </Flex>
            <Text variant="small">{reply.content}</Text>
            <ReactionButtons
              reactions={reply.reactions}
              userId={userId}
              commentId={reply.id}
              onReaction={onReaction}
              showAll={false}
            />
          </Stack>
        ))}
      </Stack>
    </Card>
  )
}

interface CommentItemProps {
  comment: any
  userId: string | null
  onEdit: (comment: any) => void
  onDelete: (commentId: string) => void
  onReaction: (commentId: string, type: string) => void
  onReplyClick: (commentId: string) => void
  replyingTo: string | null
  replyContent: string
  onReplyContentChange: (content: string) => void
  onReplySubmit: (parentId: string) => void
  onReplyCancel: () => void
  isReplying: boolean
  editingId: string | null
  editContent: string
  onEditContentChange: (content: string) => void
  onEditSubmit: (commentId: string) => void
  onEditCancel: () => void
  isEditing: boolean
}

function CommentItem({
  comment,
  userId,
  onEdit,
  onDelete,
  onReaction,
  onReplyClick,
  replyingTo,
  replyContent,
  onReplyContentChange,
  onReplySubmit,
  onReplyCancel,
  isReplying,
  editingId,
  editContent,
  onEditContentChange,
  onEditSubmit,
  onEditCancel,
  isEditing,
}: CommentItemProps) {
  const isEditingThis = editingId === comment.id
  const isReplyingToThis = replyingTo === comment.id

  return (
    <Card>
      <Stack spacing="sm">
        <Flex justify="between" align="start">
          <Stack spacing="xs">
            <Text variant="small" weight="semibold">{comment.author.name}</Text>
            <Flex gap="sm" align="center">
              <Text variant="small" color="muted">
                {new Date(comment.createdAt).toLocaleDateString()}
              </Text>
              {comment.isEdited && (
                <Text variant="small" color="muted">(edited)</Text>
              )}
            </Flex>
          </Stack>
          {comment.authorId === userId && (
            <Flex gap="sm">
              <Button variant="ghost" size="sm" onClick={() => onEdit(comment)}>
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => onDelete(comment.id)}>
                Delete
              </Button>
            </Flex>
          )}
        </Flex>

        {isEditingThis ? (
          <Stack spacing="sm">
            <Textarea
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              rows={2}
            />
            <Flex gap="sm">
              <Button variant="primary" size="sm" onClick={() => onEditSubmit(comment.id)} disabled={isEditing}>
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={onEditCancel}>
                Cancel
              </Button>
            </Flex>
          </Stack>
        ) : (
          <Text variant="small">{comment.content}</Text>
        )}

        <Flex gap="sm" align="center">
          <ReactionButtons
            reactions={comment.reactions}
            userId={userId}
            commentId={comment.id}
            onReaction={onReaction}
          />
          <Button variant="ghost" size="sm" onClick={() => onReplyClick(comment.id)}>
            Reply
          </Button>
        </Flex>

        <CommentReplies
          replies={comment.replies}
          userId={userId}
          onReaction={onReaction}
        />

        {isReplyingToThis && (
          <Card className="ml-4 p-2">
            <Stack spacing="sm">
              <Textarea
                value={replyContent}
                onChange={(e) => onReplyContentChange(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
              />
              <Flex gap="sm">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onReplySubmit(comment.id)}
                  disabled={isReplying || !replyContent.trim()}
                >
                  Reply
                </Button>
                <Button variant="ghost" size="sm" onClick={onReplyCancel}>
                  Cancel
                </Button>
              </Flex>
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  )
}

export function DiscussionSidebar({
  bandId,
  proposalId,
  projectId,
  taskId,
  userId,
  bandMembers,
}: DiscussionSidebarProps) {
  const { showToast } = useToast()
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [selectedMentions, setSelectedMentions] = useState<string[]>([])
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const { data: commentsData, isLoading, refetch } = trpc.comment.getByEntity.useQuery(
    { bandId, proposalId, projectId, taskId },
    { enabled: !!(bandId || proposalId || projectId || taskId) }
  )

  const createMutation = trpc.comment.create.useMutation({
    onSuccess: () => {
      setNewComment('')
      setReplyingTo(null)
      setReplyContent('')
      setSelectedMentions([])
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const updateMutation = trpc.comment.update.useMutation({
    onSuccess: () => {
      setEditingId(null)
      setEditContent('')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const deleteMutation = trpc.comment.delete.useMutation({
    onSuccess: () => {
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const reactionMutation = trpc.comment.addReaction.useMutation({
    onSuccess: () => {
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const handleSubmit = () => {
    if (!newComment.trim() || !userId) return
    createMutation.mutate({
      content: newComment,
      authorId: userId,
      bandId,
      proposalId,
      projectId,
      taskId,
      mentionedUserIds: selectedMentions,
    })
  }

  const handleReply = (parentId: string) => {
    if (!replyContent.trim() || !userId) return
    createMutation.mutate({
      content: replyContent,
      authorId: userId,
      parentId,
      bandId,
      proposalId,
      projectId,
      taskId,
    })
  }

  const handleEdit = (commentId: string) => {
    if (!editContent.trim() || !userId) return
    updateMutation.mutate({
      commentId,
      content: editContent,
      userId,
    })
  }

  const handleDelete = (commentId: string) => {
    if (!userId) return
    deleteMutation.mutate({ commentId, userId })
  }

  const handleReaction = (commentId: string, type: string) => {
    if (!userId) return
    reactionMutation.mutate({
      commentId,
      userId,
      type: type as any,
    })
  }

  const startEdit = (comment: any) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const handleMentionSelect = (memberId: string) => {
    if (!selectedMentions.includes(memberId)) {
      setSelectedMentions([...selectedMentions, memberId])
    }
    setShowMentions(false)
  }

  const removeMention = (memberId: string) => {
    setSelectedMentions(selectedMentions.filter(id => id !== memberId))
  }

  const filteredMembers = bandMembers.filter(m => 
    m.user.id !== userId
  )

  const comments = commentsData?.comments || []

  return (
    <RightSidebar>
      <Stack spacing="md">
        <Flex justify="between" align="center">
          <Text weight="semibold">Discussion</Text>
          <Badge variant="neutral">{comments.length}</Badge>
        </Flex>

        <Stack spacing="sm">
          {isLoading ? (
            <Text variant="small" color="muted">Loading...</Text>
          ) : comments.length === 0 ? (
            <Text variant="small" color="muted">No comments yet. Start the discussion!</Text>
          ) : (
            comments.map((comment: any) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                userId={userId}
                onEdit={startEdit}
                onDelete={handleDelete}
                onReaction={handleReaction}
                onReplyClick={(id) => setReplyingTo(replyingTo === id ? null : id)}
                replyingTo={replyingTo}
                replyContent={replyContent}
                onReplyContentChange={setReplyContent}
                onReplySubmit={handleReply}
                onReplyCancel={() => {
                  setReplyingTo(null)
                  setReplyContent('')
                }}
                isReplying={createMutation.isPending}
                editingId={editingId}
                editContent={editContent}
                onEditContentChange={setEditContent}
                onEditSubmit={handleEdit}
                onEditCancel={() => setEditingId(null)}
                isEditing={updateMutation.isPending}
              />
            ))
          )}
          <div ref={commentsEndRef} />
        </Stack>

        <Card>
          <Stack spacing="sm">
            {selectedMentions.length > 0 && (
              <Flex gap="sm" className="flex-wrap">
                {selectedMentions.map(id => {
                  const member = bandMembers.find(m => m.user.id === id)
                  if (!member) return null
                  return (
                    <Badge key={id} variant="info">
                      @{member.user.name}
                      <Button variant="ghost" size="sm" onClick={() => removeMention(id)}>
                        ×
                      </Button>
                    </Badge>
                  )
                })}
              </Flex>
            )}

            {showMentions && (
              <Card>
                <Stack spacing="xs">
                  {filteredMembers.length === 0 ? (
                    <Text variant="small" color="muted">No members found</Text>
                  ) : (
                    filteredMembers.map((member: any) => (
                      <Button
                        key={member.user.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMentionSelect(member.user.id)}
                      >
                        {member.user.name}
                      </Button>
                    ))
                  )}
                </Stack>
              </Card>
            )}

            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              rows={4}
              className="w-full"
            />
            <Flex gap="sm" align="center">
              <Button variant="ghost" size="sm" onClick={() => setShowMentions(!showMentions)}>
                @ Mention
              </Button>
            </Flex>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={createMutation.isPending || !newComment.trim() || !userId}
            >
              {createMutation.isPending ? 'Posting...' : 'Post'}
            </Button>
          </Stack>
        </Card>
      </Stack>
    </RightSidebar>
  )
}