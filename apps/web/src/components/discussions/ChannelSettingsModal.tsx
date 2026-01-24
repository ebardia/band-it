'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Modal, Stack, Flex, Text, Button, Input, Textarea, Badge, Alert, useToast } from '@/components/ui'

interface ChannelSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  channel: {
    id: string
    name: string
    description: string | null
    visibility: string
    isDefault: boolean
    isArchived: boolean
    createdBy?: { id: string; name: string } | null
  }
  bandId: string
  userId: string
  userRole?: string
  onChannelDeleted: () => void
}

const VISIBILITY_LABELS: Record<string, string> = {
  PUBLIC: 'Public - All members',
  MODERATOR: 'Moderators Only',
  GOVERNANCE: 'Governance Only',
}

export function ChannelSettingsModal({
  isOpen,
  onClose,
  channel,
  bandId,
  userId,
  userRole,
  onChannelDeleted,
}: ChannelSettingsModalProps) {
  const [name, setName] = useState(channel.name)
  const [description, setDescription] = useState(channel.description || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { showToast } = useToast()
  const utils = trpc.useUtils()

  // Permissions
  const isFounder = userRole === 'FOUNDER'
  const isGovernorPlus = userRole && ['FOUNDER', 'GOVERNOR'].includes(userRole)
  const isCreator = channel.createdBy?.id === userId
  const isModeratorPlus = userRole && ['FOUNDER', 'GOVERNOR', 'MODERATOR'].includes(userRole)

  const canEdit = isGovernorPlus || (isCreator && isModeratorPlus)
  const canArchive = isGovernorPlus && !channel.isDefault
  const canDelete = isFounder && !channel.isDefault

  const updateMutation = trpc.channel.update.useMutation({
    onSuccess: () => {
      showToast('Channel updated', 'success')
      utils.channel.list.invalidate({ bandId })
      onClose()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const archiveMutation = trpc.channel.archive.useMutation({
    onSuccess: () => {
      showToast('Channel archived', 'success')
      utils.channel.list.invalidate({ bandId })
      onClose()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const unarchiveMutation = trpc.channel.unarchive.useMutation({
    onSuccess: () => {
      showToast('Channel unarchived', 'success')
      utils.channel.list.invalidate({ bandId })
      onClose()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const deleteMutation = trpc.channel.delete.useMutation({
    onSuccess: () => {
      showToast('Channel deleted', 'success')
      utils.channel.list.invalidate({ bandId })
      onChannelDeleted()
      onClose()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleSave = () => {
    if (!name.trim()) return
    updateMutation.mutate({
      channelId: channel.id,
      userId,
      name: name.trim(),
      description: description.trim() || undefined,
    })
  }

  const handleArchiveToggle = () => {
    if (channel.isArchived) {
      unarchiveMutation.mutate({ channelId: channel.id, userId })
    } else {
      archiveMutation.mutate({ channelId: channel.id, userId })
    }
  }

  const handleDelete = () => {
    deleteMutation.mutate({ channelId: channel.id, userId })
  }

  const hasChanges = name !== channel.name || description !== (channel.description || '')

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Stack spacing="lg">
        <Flex justify="between" align="center">
          <Text weight="semibold" className="text-xl">Channel Settings</Text>
          <Badge variant="neutral">{VISIBILITY_LABELS[channel.visibility]}</Badge>
        </Flex>

        {channel.isDefault && (
          <Alert variant="info">
            <Text variant="small">This is the default General channel and cannot be deleted or archived.</Text>
          </Alert>
        )}

        {channel.isArchived && (
          <Alert variant="warning">
            <Text variant="small">This channel is archived. Members can view messages but cannot post new ones.</Text>
          </Alert>
        )}

        {/* Edit Form */}
        {canEdit ? (
          <Stack spacing="md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Channel name"
                maxLength={80}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this channel for?"
                maxLength={500}
                rows={3}
              />
            </div>

            <Flex gap="sm" justify="end">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!hasChanges || !name.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </Flex>
          </Stack>
        ) : (
          <Stack spacing="md">
            <div>
              <Text variant="small" color="muted">Channel Name</Text>
              <Text weight="semibold">{channel.name}</Text>
            </div>
            {channel.description && (
              <div>
                <Text variant="small" color="muted">Description</Text>
                <Text>{channel.description}</Text>
              </div>
            )}
          </Stack>
        )}

        {/* Archive/Unarchive Section */}
        {canArchive && (
          <div className="border-t pt-4">
            <Flex justify="between" align="center">
              <div>
                <Text weight="semibold">
                  {channel.isArchived ? 'Unarchive Channel' : 'Archive Channel'}
                </Text>
                <Text variant="small" color="muted">
                  {channel.isArchived
                    ? 'Restore this channel to allow new messages'
                    : 'Archived channels are read-only'}
                </Text>
              </div>
              <Button
                variant={channel.isArchived ? 'primary' : 'secondary'}
                onClick={handleArchiveToggle}
                disabled={archiveMutation.isPending || unarchiveMutation.isPending}
              >
                {channel.isArchived ? 'Unarchive' : 'Archive'}
              </Button>
            </Flex>
          </div>
        )}

        {/* Delete Section */}
        {canDelete && (
          <div className="border-t pt-4">
            {!showDeleteConfirm ? (
              <Flex justify="between" align="center">
                <div>
                  <Text weight="semibold" className="text-red-600">Delete Channel</Text>
                  <Text variant="small" color="muted">
                    Permanently delete this channel and all messages
                  </Text>
                </div>
                <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                  Delete
                </Button>
              </Flex>
            ) : (
              <Alert variant="danger">
                <Stack spacing="md">
                  <Text variant="small" weight="semibold">
                    Are you sure you want to delete #{channel.name}?
                  </Text>
                  <Text variant="small">
                    This action cannot be undone. All messages will be permanently deleted.
                  </Text>
                  <Flex gap="sm" justify="end">
                    <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete Channel'}
                    </Button>
                  </Flex>
                </Stack>
              </Alert>
            )}
          </div>
        )}

        {/* Close Button */}
        <Flex justify="end" className="border-t pt-4">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </Flex>
      </Stack>
    </Modal>
  )
}
