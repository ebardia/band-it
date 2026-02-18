'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Text,
  Stack,
  Button,
  Flex,
  Badge,
  Loading,
  Alert,
  BandLayout
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

const CATEGORIES = [
  { value: '', label: 'All Activity' },
  { value: 'membership', label: 'Membership' },
  { value: 'voting', label: 'Voting' },
  { value: 'proposals', label: 'Proposals' },
  { value: 'projects', label: 'Projects' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'events', label: 'Events' },
  { value: 'settings', label: 'Settings' },
]

const DATE_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'All time', value: undefined },
]

interface AuditItem {
  id: string
  createdAt: string | Date
  description: string
  category: string
  action: string
  entityType: string
  entityId: string
  entityName: string | null
  actorId: string | null
  actorName: string | null
  flagged: boolean
  flagReasons: string[] | null
}

export default function AuditLogPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)

  // Filter state
  const [category, setCategory] = useState<string>('')
  const [actorId, setActorId] = useState<string>('')
  const [daysBack, setDaysBack] = useState<number | undefined>(30)
  const [page, setPage] = useState(1)

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

  const { data: membersData } = trpc.audit.getBandMembers.useQuery(
    { bandId: bandData?.band?.id || '' },
    { enabled: !!bandData?.band?.id }
  )

  const { data: auditData, isLoading: auditLoading } = trpc.audit.list.useQuery(
    {
      bandId: bandData?.band?.id || '',
      category: category as any || undefined,
      actorId: actorId || undefined,
      daysBack,
      page,
      pageSize: 50,
    },
    { enabled: !!bandData?.band?.id }
  )

  if (bandLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Activity Log"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading..." />
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
          pageTitle="Activity Log"
          isMember={false}
          wide={true}
        >
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const band = bandData.band
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)

  // Group items by date
  const groupItemsByDate = (items: AuditItem[]) => {
    const groups: { label: string; date: string; items: AuditItem[] }[] = []
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const todayStr = today.toDateString()
    const yesterdayStr = yesterday.toDateString()

    let currentGroup: { label: string; date: string; items: AuditItem[] } | null = null

    items.forEach(item => {
      const itemDate = new Date(item.createdAt)
      const itemDateStr = itemDate.toDateString()

      let label: string
      if (itemDateStr === todayStr) {
        label = 'Today'
      } else if (itemDateStr === yesterdayStr) {
        label = 'Yesterday'
      } else {
        label = itemDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      }

      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, date: itemDateStr, items: [] }
        groups.push(currentGroup)
      }

      currentGroup.items.push(item)
    })

    return groups
  }

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase()
  }

  const handleItemClick = (item: AuditItem) => {
    if (item.action === 'deleted') return

    const entityType = item.entityType
    const entityId = item.entityId

    switch (entityType) {
      case 'Band':
        router.push(`/bands/${slug}/about`)
        break
      case 'Member':
        router.push(`/bands/${slug}/members`)
        break
      case 'Proposal':
        router.push(`/bands/${slug}/proposals/${entityId}`)
        break
      case 'Vote':
        router.push(`/bands/${slug}/proposals`)
        break
      case 'Project':
        router.push(`/bands/${slug}/projects/${entityId}`)
        break
      case 'Task':
        router.push(`/bands/${slug}/tasks`)
        break
      case 'Event':
        router.push(`/bands/${slug}/calendar/${entityId}`)
        break
    }
  }

  const totalPages = auditData?.totalPages || 1
  const items = (auditData?.items || []) as AuditItem[]
  const groupedItems = groupItemsByDate(items)

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="Activity Log"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
      >
        <Stack spacing="lg">
          {/* Filters */}
          <Flex gap="md" wrap="wrap" align="center">
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select
              value={actorId}
              onChange={(e) => { setActorId(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Members</option>
              {membersData?.members.map(member => (
                <option key={member.userId} value={member.userId}>{member.name}</option>
              ))}
            </select>

            <select
              value={daysBack ?? 'all'}
              onChange={(e) => {
                setDaysBack(e.target.value === 'all' ? undefined : Number(e.target.value))
                setPage(1)
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DATE_RANGES.map(range => (
                <option key={range.label} value={range.value ?? 'all'}>{range.label}</option>
              ))}
            </select>
          </Flex>

          {/* Activity Timeline */}
          {auditLoading ? (
            <Loading message="Loading activity..." />
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Text color="muted">No activity found</Text>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedItems.map((group) => (
                <div key={group.date}>
                  {/* Date Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <Text weight="semibold" className="text-gray-700 whitespace-nowrap">
                      {group.label}
                    </Text>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Activity Items */}
                  <div className="space-y-3 pl-2">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex gap-4 py-2 px-3 rounded-lg transition-colors ${
                          item.action !== 'deleted'
                            ? 'hover:bg-gray-50 cursor-pointer'
                            : ''
                        } ${item.flagged ? 'bg-amber-50 border-l-2 border-amber-400' : ''}`}
                        onClick={() => handleItemClick(item)}
                      >
                        {/* Time */}
                        <div className="w-20 flex-shrink-0">
                          <Text variant="small" color="muted" className="tabular-nums">
                            {formatTime(item.createdAt)}
                          </Text>
                        </div>

                        {/* Description */}
                        <div className="flex-1 min-w-0">
                          <Text className="text-gray-800">
                            {item.description}
                          </Text>
                          {item.flagged && item.flagReasons && (
                            <Flex gap="xs" className="mt-1">
                              <Badge variant="warning" className="text-xs">
                                Flagged: {item.flagReasons.join(', ')}
                              </Badge>
                            </Flex>
                          )}
                        </div>

                        {/* Category Badge (optional, can be hidden) */}
                        {!category && (
                          <div className="flex-shrink-0">
                            <Badge variant="neutral" className="text-xs capitalize">
                              {item.category}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {items.length > 0 && (
            <Flex justify="between" align="center" className="pt-4 border-t border-gray-200">
              <Text variant="small" color="muted">
                Showing {items.length} entries
              </Text>
              <Flex gap="sm">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Text variant="small" className="px-3 py-1">
                  Page {page} of {totalPages}
                </Text>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </Flex>
            </Flex>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}
