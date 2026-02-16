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
  BillingBanner,
  DuesBanner,
  Card,
  Stack,
  Heading,
  useToast
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { BandSidebar } from '@/components/ui/BandSidebar'
import {
  ChannelList,
  MessageList,
  MessageComposer,
  CreateChannelModal,
  ChannelSettingsModal,
  PinnedMessagesHeader,
  SearchModal,
} from '@/components/discussions'
import { OnboardingHint } from '@/components/onboarding'
import { Button } from '@/components/ui'

export default function BandDiscussionsPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showChannelSettings, setShowChannelSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [showMobileChannels, setShowMobileChannels] = useState(false)

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

  // Check if user has a pending invitation to this band
  const { data: invitationsData, refetch: refetchInvitations } = trpc.band.getMyInvitations.useQuery(
    { userId: userId! },
    { enabled: !!userId && !!bandData?.band }
  )

  // Find if user has pending invitation to THIS band
  const pendingInvitation = invitationsData?.invitations?.find(
    (inv: any) => inv.band.id === bandData?.band?.id
  )

  const utils = trpc.useUtils()

  const acceptMutation = trpc.band.acceptInvitation.useMutation({
    onSuccess: () => {
      showToast('Invitation accepted! Welcome to the band.', 'success')
      refetchInvitations()
      utils.band.getBySlug.invalidate({ slug })
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const declineMutation = trpc.band.declineInvitation.useMutation({
    onSuccess: () => {
      showToast('Invitation declined', 'success')
      router.push('/overview')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  // Auto-select first accessible channel when channels load
  const currentMemberCheck = bandData?.band?.members.find((m: any) => m.user.id === userId)
  const isActiveMember = !!currentMemberCheck

  const { data: channelsData } = trpc.channel.list.useQuery(
    { bandId: bandData?.band?.id || '', userId: userId || '', includeArchived: false },
    { enabled: !!bandData?.band?.id && !!userId && isActiveMember }
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

  // Show pending invitation UI if user is not a member but has a pending invitation
  if (!isMember && pendingInvitation) {
    return (
      <>
        <AppNav />
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto px-4 max-w-[800px]">
            <div className="py-12">
              <Stack spacing="xl">
                <div className="text-center">
                  {band.imageUrl && (
                    <img
                      src={band.imageUrl}
                      alt={band.name}
                      className="w-24 h-24 object-cover rounded-xl shadow-md mx-auto mb-4"
                    />
                  )}
                  <Heading level={1}>{band.name}</Heading>
                  <Text color="muted" className="mt-2">You've been invited to join this band</Text>
                </div>

                <Card>
                  <Stack spacing="md">
                    {band.description && (
                      <Text>{band.description}</Text>
                    )}

                    {pendingInvitation.notes && (
                      <Alert variant="info">
                        <Text variant="small" weight="semibold">Invitation Message:</Text>
                        <Text variant="small">{pendingInvitation.notes}</Text>
                      </Alert>
                    )}

                    <Flex gap="md" justify="center">
                      <Button
                        variant="primary"
                        onClick={() => acceptMutation.mutate({ membershipId: pendingInvitation.id, userId: userId! })}
                        disabled={acceptMutation.isPending || declineMutation.isPending}
                      >
                        {acceptMutation.isPending ? 'Accepting...' : 'Accept Invitation'}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => declineMutation.mutate({ membershipId: pendingInvitation.id, userId: userId! })}
                        disabled={acceptMutation.isPending || declineMutation.isPending}
                      >
                        {declineMutation.isPending ? 'Declining...' : 'Decline'}
                      </Button>
                    </Flex>
                  </Stack>
                </Card>
              </Stack>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Mobile navigation items
  const mobileNavItems = [
    { label: 'Discussions', path: `/bands/${slug}`, emoji: '💬' },
    { label: 'About', path: `/bands/${slug}/about`, emoji: 'ℹ️' },
    { label: 'Proposals', path: `/bands/${slug}/proposals`, emoji: '📝' },
    { label: 'Projects', path: `/bands/${slug}/projects`, emoji: '📁' },
    { label: 'Tasks', path: `/bands/${slug}/tasks`, emoji: '✅' },
    { label: 'Events', path: `/bands/${slug}/events`, emoji: '📅' },
    { label: 'Finance', path: `/bands/${slug}/finance`, emoji: '💰' },
    { label: 'Members', path: `/bands/${slug}/members`, emoji: '👥' },
  ]

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto px-2 md:px-4 max-w-[1600px]">
          {/* Mobile Header */}
          <div className="md:hidden py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Back to dashboard button */}
                <button
                  onClick={() => router.push('/user-dashboard')}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 flex-shrink-0"
                  aria-label="Back to dashboard"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {band.imageUrl && (
                  <img src={band.imageUrl} alt={band.name} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 truncate">{band.name}</h1>
                  <Text color="muted" className="text-sm truncate">Discussions</Text>
                </div>
              </div>
              <Flex gap="sm">
                {userId && (
                  <Button variant="ghost" size="sm" onClick={() => setShowSearch(true)}>
                    🔍
                  </Button>
                )}
              </Flex>
            </div>

            {/* Mobile Page Navigation */}
            <div className="relative mb-2">
              <button
                onClick={() => setShowMobileNav(!showMobileNav)}
                className="w-full flex items-center justify-between px-4 py-2 bg-white rounded-lg shadow border border-gray-200 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span>💬</span>
                  <span className="font-medium">Discussions</span>
                </span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${showMobileNav ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showMobileNav && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto">
                  {mobileNavItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => { setShowMobileNav(false); router.push(item.path) }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm ${
                        item.path === `/bands/${slug}` ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{item.emoji}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Channel Selector - larger touch target */}
            <button
              onClick={() => setShowMobileChannels(!showMobileChannels)}
              className="w-full flex items-center justify-between px-4 py-3 min-h-[48px] bg-blue-50 rounded-lg border border-blue-200 text-base"
            >
              <span className="flex items-center gap-2">
                <span className="text-blue-600 font-bold">#</span>
                <span className="font-medium">{selectedChannel?.name || 'Select channel'}</span>
              </span>
              <svg className={`w-5 h-5 text-blue-500 transition-transform ${showMobileChannels ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showMobileChannels && (
              <div className="mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
                {channelsData?.channels?.filter(c => c.hasAccess && !c.isArchived).map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setSelectedChannelId(channel.id)
                      setShowMobileChannels(false)
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-3 min-h-[48px] text-left text-base border-b border-gray-100 last:border-b-0 ${
                      channel.id === selectedChannelId ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 active:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={channel.id === selectedChannelId ? 'text-blue-600' : 'text-gray-400'}>#</span>
                      <span>{channel.name}</span>
                    </span>
                    {channel.id === selectedChannelId && (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Page Header */}
          <div className="hidden md:block py-6">
            <Flex gap="md" align="start">
              {/* Left: Band Image (in sidebar area) */}
              <div className="w-64 flex-shrink-0 flex justify-center">
                {band.imageUrl ? (
                  <img
                    src={band.imageUrl}
                    alt={band.name}
                    className="w-32 h-32 object-cover rounded-xl shadow-md"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-200 rounded-xl flex items-center justify-center">
                    <span className="text-4xl text-gray-400">🎸</span>
                  </div>
                )}
              </div>

              {/* Right: Band Name and Page Title */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{band.name}</h1>
                <Flex justify="between" align="center">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-700">Discussions</h2>
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
              <Flex gap="md" className="flex-col md:flex-row">
                <div className="hidden md:block w-64 flex-shrink-0" />
                <div className="flex-1">
                  <BillingBanner
                    bandId={band.id}
                    bandSlug={slug}
                    userId={userId}
                  />
                  <DuesBanner
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
            <Flex gap="md" align="start" className="flex-col md:flex-row">
              {/* Left Sidebar - Band Navigation (hidden on mobile) */}
              <BandSidebar
                bandSlug={slug}
                bandName={band.name}
                canApprove={canApprove}
                isMember={isMember}
                canAccessAdminTools={canAccessAdminTools}
              />

              {/* Discussion Area */}
              <div className="w-full md:flex-1 bg-white rounded-lg shadow">
                <div className="flex">
                  {/* Channel List - Hidden on mobile */}
                  <div className="hidden md:block w-56 flex-shrink-0">
                    <ChannelList
                      bandId={band.id}
                      userId={userId}
                      selectedChannelId={selectedChannelId}
                      onSelectChannel={(id) => setSelectedChannelId(id)}
                      onCreateChannel={() => setShowCreateChannel(true)}
                      userRole={userRole}
                    />
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 flex flex-col border-l-0 md:border-l border-gray-200 min-w-0 md:overflow-hidden">
                    {selectedChannelId && selectedChannel?.hasAccess ? (
                      <>
                        {/* Onboarding Hint for sending first message */}
                        {userId && band.id && (
                          <div className="p-2">
                            <OnboardingHint
                              bandId={band.id}
                              userId={userId}
                              relevantSteps={[4]}
                            />
                          </div>
                        )}

                        {/* Pinned Messages Header */}
                        <PinnedMessagesHeader
                          bandId={band.id}
                          channelId={selectedChannelId}
                          userId={userId}
                        />
                        {/* Message Composer - bottom on mobile (thumb-friendly), top on desktop */}
                        {!selectedChannel?.isArchived && (
                          <div className="order-1 md:order-none">
                            <MessageComposer
                              channelId={selectedChannelId}
                              userId={userId}
                            />
                          </div>
                        )}
                        {selectedChannel?.isArchived && (
                          <div className="order-1 md:order-none p-4 bg-gray-100 border-b md:border-b border-t md:border-t-0 text-center">
                            <Text color="muted">This channel is archived. Messages are read-only.</Text>
                          </div>
                        )}
                        <MessageList
                          bandId={band.id}
                          channelId={selectedChannelId}
                          userId={userId}
                          userRole={userRole}
                        />
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
          onResultClick={(channelId) => setSelectedChannelId(channelId)}
        />
      )}
    </>
  )
}
