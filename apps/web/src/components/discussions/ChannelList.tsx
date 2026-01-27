'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Stack, Flex, Text, Button, Badge, Loading } from '@/components/ui'

interface ChannelListProps {
  bandId: string
  userId: string | null
  selectedChannelId: string | null
  onSelectChannel: (channelId: string) => void
  onCreateChannel: () => void
  userRole?: string
}

const VISIBILITY_ICONS: Record<string, string> = {
  PUBLIC: '#',
  MODERATOR: '🔒',
  GOVERNANCE: '👑',
}

export function ChannelList({
  bandId,
  userId,
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
  userRole,
}: ChannelListProps) {
  const [showArchived, setShowArchived] = useState(false)

  const { data, isLoading } = trpc.channel.list.useQuery(
    { bandId, userId: userId || '', includeArchived: showArchived },
    { enabled: !!bandId && !!userId }
  )

  const canCreateChannels = userRole && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER'].includes(userRole)

  if (isLoading) {
    return (
      <div className="p-4">
        <Loading message="Loading channels..." />
      </div>
    )
  }

  const channels = data?.channels || []
  const publicChannels = channels.filter(c => c.visibility === 'PUBLIC' && !c.isArchived)
  const privateChannels = channels.filter(c => c.visibility !== 'PUBLIC' && !c.isArchived)
  const archivedChannels = channels.filter(c => c.isArchived)

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200" data-guide="channel-list">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <Flex justify="between" align="center">
          <Text weight="semibold">Channels</Text>
          {canCreateChannels && (
            <Button variant="ghost" size="sm" onClick={onCreateChannel}>
              +
            </Button>
          )}
        </Flex>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto p-2">
        <Stack spacing="sm">
          {/* Public Channels */}
          {publicChannels.length > 0 && (
            <Stack spacing="xs">
              <Text variant="small" color="muted" className="px-2 uppercase text-xs">
                Channels
              </Text>
              {publicChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isSelected={selectedChannelId === channel.id}
                  onSelect={() => onSelectChannel(channel.id)}
                />
              ))}
            </Stack>
          )}

          {/* Private Channels */}
          {privateChannels.length > 0 && (
            <Stack spacing="xs" className="mt-4">
              <Text variant="small" color="muted" className="px-2 uppercase text-xs">
                Private Channels
              </Text>
              {privateChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isSelected={selectedChannelId === channel.id}
                  onSelect={() => channel.hasAccess && onSelectChannel(channel.id)}
                />
              ))}
            </Stack>
          )}

          {/* Archived Channels Toggle */}
          {archivedChannels.length > 0 && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className="w-full text-left"
              >
                {showArchived ? '▼' : '▶'} Archived ({archivedChannels.length})
              </Button>
              {showArchived && (
                <Stack spacing="xs" className="mt-2">
                  {archivedChannels.map((channel) => (
                    <ChannelItem
                      key={channel.id}
                      channel={channel}
                      isSelected={selectedChannelId === channel.id}
                      onSelect={() => channel.hasAccess && onSelectChannel(channel.id)}
                    />
                  ))}
                </Stack>
              )}
            </div>
          )}
        </Stack>
      </div>
    </div>
  )
}

interface ChannelItemProps {
  channel: {
    id: string
    name: string
    visibility: string
    hasAccess: boolean
    unreadCount: number | null
    isArchived: boolean
    requiredRole: string | null
  }
  isSelected: boolean
  onSelect: () => void
}

function ChannelItem({ channel, isSelected, onSelect }: ChannelItemProps) {
  const icon = VISIBILITY_ICONS[channel.visibility] || '#'
  const hasUnread = channel.unreadCount && channel.unreadCount > 0

  return (
    <button
      onClick={onSelect}
      disabled={!channel.hasAccess}
      className={`
        w-full text-left px-3 py-2 rounded-md transition-colors
        ${isSelected ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}
        ${!channel.hasAccess ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${channel.isArchived ? 'italic text-gray-500' : ''}
      `}
    >
      <Flex justify="between" align="center">
        <Flex gap="sm" align="center">
          <span className="text-gray-500">{icon}</span>
          <span className={hasUnread ? 'font-semibold' : ''}>{channel.name}</span>
        </Flex>
        <Flex gap="sm" align="center">
          {!channel.hasAccess && channel.requiredRole && (
            <Text variant="small" color="muted" title={`Requires ${channel.requiredRole}`}>
              🔒
            </Text>
          )}
          {hasUnread && (
            <Badge variant="danger">{channel.unreadCount}</Badge>
          )}
        </Flex>
      </Flex>
    </button>
  )
}
