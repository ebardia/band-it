'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Text, Badge, Button, Flex } from '@/components/ui'

interface BandCardCompactProps {
  band: {
    id: string
    name: string
    slug: string
    description?: string | null
    memberCount: number
    status: string
    imageUrl?: string | null
  }
  matchScore?: number
  matchReasons?: string[]
  showApply?: boolean
}

export function BandCardCompact({ band, matchScore, matchReasons, showApply = true }: BandCardCompactProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  const description = band.description || ''
  const isLongDescription = description.length > 120

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      {/* Row 1: Image, Name, Match Score, Actions */}
      <Flex justify="between" align="start" gap="sm">
        <Flex gap="sm" align="center" className="flex-1 min-w-0">
          {band.imageUrl ? (
            <img
              src={band.imageUrl}
              alt={band.name}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🎸</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Flex gap="sm" align="center">
              <Text weight="semibold" className="truncate">{band.name}</Text>
              {matchScore !== undefined && matchScore > 0 && (
                <Badge variant="success" className="flex-shrink-0">{matchScore}%</Badge>
              )}
            </Flex>
            <Flex gap="sm" align="center" className="mt-0.5">
              <Text variant="small" color="muted">{band.memberCount} members</Text>
              <span className="text-gray-300">•</span>
              <Badge variant={band.status === 'ACTIVE' ? 'success' : 'warning'} className="text-xs">
                {band.status}
              </Badge>
            </Flex>
          </div>
        </Flex>
        <Flex gap="sm" className="flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/bands/${band.slug}`)}
          >
            View
          </Button>
          {showApply && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/bands/${band.slug}/apply`)}
            >
              Apply
            </Button>
          )}
        </Flex>
      </Flex>

      {/* Row 2: Description (truncated) */}
      {description && (
        <div className="mt-2 pl-12">
          <Text variant="small" color="muted" className={!expanded && isLongDescription ? 'line-clamp-2' : ''}>
            {description}
          </Text>
          {isLongDescription && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-600 hover:underline mt-1"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Row 3: Match reasons (if any) */}
      {matchReasons && matchReasons.length > 0 && (
        <div className="mt-2 pl-12">
          <Flex gap="sm" wrap="wrap">
            {matchReasons.slice(0, expanded ? undefined : 2).map((reason, idx) => (
              <Text key={idx} variant="small" className="text-green-700 bg-green-50 px-2 py-0.5 rounded">
                {reason}
              </Text>
            ))}
            {!expanded && matchReasons.length > 2 && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                +{matchReasons.length - 2} more
              </button>
            )}
          </Flex>
        </div>
      )}
    </div>
  )
}
