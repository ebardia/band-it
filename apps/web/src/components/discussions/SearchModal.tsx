'use client'

import { useState, useEffect, useRef } from 'react'
import { trpc } from '@/lib/trpc'
import { keepPreviousData } from '@tanstack/react-query'
import { Modal, Stack, Flex, Text, Button, Input, Select, Loading } from '@/components/ui'

interface SearchResult {
  id: string
  channelId: string
  content: string
  highlight: string | null
  author: { id: string; name: string; email: string }
  channel: { id: string; name: string; slug: string }
  threadId: string | null
  isPinned: boolean
  isEdited: boolean
  createdAt: string
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  bandId: string
  userId: string
  channels: Array<{ id: string; name: string; hasAccess: boolean }>
  onResultClick?: (channelId: string, messageId: string) => void
}

export function SearchModal({
  isOpen,
  onClose,
  bandId,
  userId,
  channels,
  onResultClick,
}: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setChannelFilter('')
      setDateFrom('')
      setDateTo('')
      setShowFilters(false)
    }
  }, [isOpen])

  const { data, isLoading, isFetching } = trpc.message.advancedSearch.useQuery(
    {
      bandId,
      userId,
      query: query.trim(),
      channelId: channelFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: 30,
    },
    {
      enabled: isOpen && query.trim().length >= 1,
      placeholderData: keepPreviousData,
    }
  )

  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result.channelId, result.id)
    onClose()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const accessibleChannels = channels.filter(c => c.hasAccess)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Messages" size="lg">
      <Stack spacing="md">
        {/* Search input */}
        <div className="relative">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-10"
          />
          {(isLoading || isFetching) && query.trim().length >= 1 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Filter toggle */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? '▼ Hide filters' : '▶ Show filters'}
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <Stack spacing="sm">
              <div>
                <Text variant="small" weight="semibold" className="mb-1">Channel</Text>
                <Select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                >
                  <option value="">All channels</option>
                  {accessibleChannels.map(channel => (
                    <option key={channel.id} value={channel.id}>
                      # {channel.name}
                    </option>
                  ))}
                </Select>
              </div>

              <Flex gap="md">
                <div className="flex-1">
                  <Text variant="small" weight="semibold" className="mb-1">From date</Text>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Text variant="small" weight="semibold" className="mb-1">To date</Text>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </Flex>

              {(channelFilter || dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setChannelFilter('')
                    setDateFrom('')
                    setDateTo('')
                  }}
                >
                  Clear filters
                </Button>
              )}
            </Stack>
          </div>
        )}

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {query.trim().length === 0 ? (
            <div className="text-center py-8">
              <Text color="muted">Enter a search term to find messages</Text>
            </div>
          ) : isLoading ? (
            <div className="py-8">
              <Loading message="Searching..." />
            </div>
          ) : data?.messages.length === 0 ? (
            <div className="text-center py-8">
              <Text color="muted">No messages found</Text>
            </div>
          ) : (
            <Stack spacing="sm">
              <Text variant="small" color="muted">
                {data?.total || 0} result{(data?.total || 0) !== 1 ? 's' : ''}
              </Text>

              {data?.messages.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Flex gap="sm" align="start">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <Text variant="small" weight="semibold">
                        {result.author.name.charAt(0).toUpperCase()}
                      </Text>
                    </div>

                    <div className="flex-1 min-w-0">
                      <Flex gap="sm" align="center" className="mb-1">
                        <Text variant="small" weight="semibold">{result.author.name}</Text>
                        <Text variant="small" color="muted">in #{result.channel.name}</Text>
                        <Text variant="small" color="muted">{formatDate(result.createdAt)}</Text>
                      </Flex>

                      {result.highlight ? (
                        <div
                          className="text-sm line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: result.highlight }}
                        />
                      ) : (
                        <Text variant="small" className="line-clamp-2">
                          {result.content}
                        </Text>
                      )}

                      {result.threadId && (
                        <Text variant="small" color="muted" className="mt-1">
                          In a thread
                        </Text>
                      )}
                    </div>
                  </Flex>
                </button>
              ))}
            </Stack>
          )}
        </div>
      </Stack>
    </Modal>
  )
}
