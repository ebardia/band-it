'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Modal, Stack, Flex, Text, Button, Input, Textarea, useToast } from '@/components/ui'

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
  bandId: string
  userId: string
  userRole?: string
  onChannelCreated: (channelId: string) => void
}

const VISIBILITY_OPTIONS = [
  {
    value: 'PUBLIC',
    label: 'Public',
    description: 'All band members can access',
    icon: '#',
    roles: ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'],
  },
  {
    value: 'MODERATOR',
    label: 'Moderators Only',
    description: 'Only Moderators, Governors, and Founders',
    icon: '🔒',
    roles: ['FOUNDER', 'GOVERNOR', 'MODERATOR'],
  },
  {
    value: 'GOVERNANCE',
    label: 'Governance Only',
    description: 'Only Governors and Founders',
    icon: '👑',
    roles: ['FOUNDER', 'GOVERNOR'],
  },
]

export function CreateChannelModal({
  isOpen,
  onClose,
  bandId,
  userId,
  userRole,
  onChannelCreated,
}: CreateChannelModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'MODERATOR' | 'GOVERNANCE'>('PUBLIC')
  const { showToast } = useToast()
  const utils = trpc.useUtils()

  const createMutation = trpc.channel.create.useMutation({
    onSuccess: (data) => {
      showToast('Channel created successfully', 'success')
      utils.channel.list.invalidate({ bandId })
      onChannelCreated(data.channel.id)
      handleClose()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleClose = () => {
    setName('')
    setDescription('')
    setVisibility('PUBLIC')
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    createMutation.mutate({
      bandId,
      userId,
      name: name.trim(),
      description: description.trim() || undefined,
      visibility,
    })
  }

  // Filter visibility options based on user role
  const availableOptions = VISIBILITY_OPTIONS.filter(
    option => userRole && option.roles.includes(userRole)
  )

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <form onSubmit={handleSubmit}>
        <Stack spacing="lg">
          <Text weight="semibold" className="text-xl">Create Channel</Text>

          <Stack spacing="md">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., announcements"
                maxLength={80}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this channel for?"
                maxLength={500}
                rows={3}
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <Stack spacing="sm">
                {availableOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVisibility(option.value as any)}
                    className={`
                      w-full text-left p-3 rounded-lg border-2 transition-colors
                      ${visibility === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <Flex gap="sm" align="start">
                      <span className="text-lg">{option.icon}</span>
                      <div>
                        <Text weight="semibold">{option.label}</Text>
                        <Text variant="small" color="muted">{option.description}</Text>
                      </div>
                    </Flex>
                  </button>
                ))}
              </Stack>
            </div>
          </Stack>

          {/* Actions */}
          <Flex gap="md" justify="end">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Channel'}
            </Button>
          </Flex>
        </Stack>
      </form>
    </Modal>
  )
}
