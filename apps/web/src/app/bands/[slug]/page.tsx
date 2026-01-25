'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Text,
  Flex,
  Loading,
  Alert,
  BillingBanner
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { BandSidebar } from '@/components/ui/BandSidebar'
import {
  ChannelList,
  MessageList,
  MessageComposer,
  ThreadView,
  CreateChannelModal,
  ChannelSettingsModal,
  PinnedMessagesHeader,
  SearchModal,
} from '@/components/discussions'
import { Button } from '@/components/ui'

export default function BandDiscussionsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showChannelSettings, setShowChannelSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
      }
    }
  }, [])

  const { data: bandData, isLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  // Auto-select first accessible channel when channels load
  const { data: channelsData } = trpc.channel.list.useQuery(
    { bandId: bandData?.band?.id || '', userId: userId || '', includeArchived: false },
    { enabled: !!bandData?.band?.id && !!userId }
  )

  useEffect(() => {
    if (channelsData?.channels && !selectedChannelId) {
      const firstAccessible = channelsData.channels.find(c => c.hasAccess && !c.isArchived)
      if (firstAccessible) {
        setSelectedChannelId(firstAccessible.id)
      }
    }
  }, [channelsData, selectedChannelId])

  if (isLoading) {
    return (
      <>
        <AppNav />
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto px-4 max-w-[1600px]">
            <div className="py-6">
              <Loading message="Loading band..." />
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!bandData?.band) {
    return (
      <>
        <AppNav />
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto px-4 max-w-[1600px]">
            <div className="py-6">
              <Alert variant="danger">
                <Text>Band not found</Text>
              </Alert>
            </div>
          </div>
        </div>
      </>
    )
  }

  const band = bandData.band
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const userRole = currentMember?.role
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)

  const selectedChannel = channelsData?.channels?.find(c => c.id === selectedChannelId)

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto px-4 max-w-[1600px]">
          {/* Page Header */}
          <div className="py-2">
            <Flex gap="md" align="start">
              {/* Spacer for left sidebar */}
              <div className="w-64 flex-shrink-0" />

              {/* Header content */}
              <div className="flex-1">
                <Flex justify="between" align="center">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Discussion Forum</h1>
                    {selectedChannel && (
                      <Text color="muted" className="mt-1">
                        # {selectedChannel.name}
                        {selectedChannel.description && ` — ${selectedChannel.description}`}
                      </Text>
                    )}
                  </div>
                  <Flex gap="sm">
                    {userId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSearch(true)}
                      >
                        🔍 Search
                      </Button>
                    )}
                    {selectedChannel && selectedChannel.hasAccess && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowChannelSettings(true)}
                      >
                        ⚙️ Settings
                      </Button>
                    )}
                  </Flex>
                </Flex>
              </div>
            </Flex>
          </div>

          {/* Billing Banner */}
          {isMember && userId && (
            <div className="pb-2">
              <Flex gap="md">
                <div className="w-64 flex-shrink-0" />
                <div className="flex-1">
                  <BillingBanner
                    bandId={band.id}
                    bandSlug={slug}
                    userId={userId}
                  />
                </div>
              </Flex>
            </div>
          )}

          {/* Main Content */}
          <div className="pb-4">
            <Flex gap="md" align="start">
              {/* Left Sidebar - Band Navigation */}
              <BandSidebar
                bandSlug={slug}
                bandName={band.name}
                canApprove={canApprove}
                isMember={isMember}
                canAccessAdminTools={canAccessAdminTools}
              />

              {/* Discussion Area */}
              <div className="flex-1 bg-white rounded-lg shadow" style={{ height: 'calc(100vh - 150px)' }}>
                <div className="flex h-full">
                  {/* Channel List */}
                  <div className="w-56 flex-shrink-0">
                    <ChannelList
                      bandId={band.id}
                      userId={userId}
                      selectedChannelId={selectedChannelId}
                      onSelectChannel={(id) => {
                        setSelectedChannelId(id)
                        setOpenThreadId(null)
                      }}
                      onCreateChannel={() => setShowCreateChannel(true)}
                      userRole={userRole}
                    />
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 flex flex-col border-l border-gray-200 min-w-0 overflow-hidden">
                    {selectedChannelId && selectedChannel?.hasAccess ? (
                      <>
                        {/* Pinned Messages Header */}
                        <PinnedMessagesHeader
                          bandId={band.id}
                          channelId={selectedChannelId}
                          userId={userId}
                          onMessageClick={setOpenThreadId}
                        />
                        <MessageList
                          bandId={band.id}
                          channelId={selectedChannelId}
                          userId={userId}
                          userRole={userRole}
                          onOpenThread={setOpenThreadId}
                        />
                        {!selectedChannel?.isArchived && (
                          <MessageComposer
                            channelId={selectedChannelId}
                            userId={userId}
                          />
                        )}
                        {selectedChannel?.isArchived && (
                          <div className="p-4 bg-gray-100 border-t text-center">
                            <Text color="muted">This channel is archived. Messages are read-only.</Text>
                          </div>
                        )}
                      </>
                    ) : selectedChannel && !selectedChannel.hasAccess ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <Text className="text-4xl mb-4">🔒</Text>
                          <Text weight="semibold">This channel is private</Text>
                          <Text color="muted">Requires {selectedChannel.requiredRole}</Text>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <Text color="muted">Select a channel to start chatting</Text>
                      </div>
                    )}
                  </div>

                  {/* Thread Panel */}
                  {openThreadId && selectedChannelId && (
                    <div className="flex-shrink-0">
                      <ThreadView
                        messageId={openThreadId}
                        channelId={selectedChannelId}
                        bandId={band.id}
                        userId={userId}
                        userRole={userRole}
                        onClose={() => setOpenThreadId(null)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Flex>
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      {userId && (
        <CreateChannelModal
          isOpen={showCreateChannel}
          onClose={() => setShowCreateChannel(false)}
          bandId={band.id}
          userId={userId}
          userRole={userRole}
          onChannelCreated={(channelId) => {
            setSelectedChannelId(channelId)
            setShowCreateChannel(false)
          }}
        />
      )}

      {/* Channel Settings Modal */}
      {userId && selectedChannel && (
        <ChannelSettingsModal
          isOpen={showChannelSettings}
          onClose={() => setShowChannelSettings(false)}
          channel={{
            id: selectedChannel.id,
            name: selectedChannel.name,
            description: selectedChannel.description,
            visibility: selectedChannel.visibility,
            isDefault: selectedChannel.isDefault,
            isArchived: selectedChannel.isArchived,
            createdBy: selectedChannel.createdBy,
          }}
          bandId={band.id}
          userId={userId}
          userRole={userRole}
          onChannelDeleted={() => {
            // Select the first available channel after deletion
            const firstAvailable = channelsData?.channels?.find(
              c => c.id !== selectedChannel.id && c.hasAccess && !c.isArchived
            )
            setSelectedChannelId(firstAvailable?.id || null)
          }}
        />
      )}

      {/* Search Modal */}
      {userId && (
        <SearchModal
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          bandId={band.id}
          userId={userId}
          channels={channelsData?.channels || []}
          onResultClick={(channelId, messageId) => {
            setSelectedChannelId(channelId)
            setOpenThreadId(messageId)
          }}
        />
      )}
    </>
  )
}
