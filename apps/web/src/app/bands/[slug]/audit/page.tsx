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

const ENTITY_TYPES = [
  'Band',
  'Member',
  'Proposal',
  'Vote',
  'Project',
  'Task',
  'ChecklistItem',
  'Comment',
  'File',
  'Event',
  'EventRSVP',
  'EventAttendance',
]

const DATE_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'All time', value: undefined },
]

export default function AuditLogPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)

  // Filter state
  const [entityType, setEntityType] = useState<string>('')
  const [actorId, setActorId] = useState<string>('')
  const [action, setAction] = useState<string>('')
  const [daysBack, setDaysBack] = useState<number | undefined>(7)
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
      entityType: entityType || undefined,
      actorId: actorId || undefined,
      action: action || undefined,
      daysBack,
      page,
      pageSize: 25,
    },
    { enabled: !!bandData?.band?.id }
  )

  // Utils for imperative queries - must be called before conditional returns
  const utils = trpc.useUtils()

  if (bandLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Audit Log"
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
          pageTitle="Audit Log"
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

  const formatDate = (date: string | Date) => {
    const d = new Date(date)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()

    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase()

    if (isToday) {
      return `Today, ${timeStr}`
    }

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }) + `, ${timeStr}`
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'created':
        return <Badge variant="success">created</Badge>
      case 'updated':
        return <Badge variant="info">updated</Badge>
      case 'deleted':
        return <Badge variant="danger">deleted</Badge>
      default:
        return <Badge variant="neutral">{action}</Badge>
    }
  }

  const formatChanges = (changes: Record<string, { from: any; to: any }> | null) => {
    if (!changes) return '—'

    const entries = Object.entries(changes).slice(0, 2) // Show max 2 changes
    return entries.map(([key, val]) => {
      const fromStr = val.from === null ? 'null' : String(val.from)
      const toStr = val.to === null ? 'null' : String(val.to)
      return `${key}: ${fromStr.slice(0, 10)}${fromStr.length > 10 ? '...' : ''} → ${toStr.slice(0, 10)}${toStr.length > 10 ? '...' : ''}`
    }).join(', ')
  }

  const handleRowClick = async (item: any) => {
    if (item.action === 'deleted') return

    const entityType = item.entityType
    const entityId = item.entityId

    switch (entityType) {
      case 'Band':
        router.push(`/bands/${slug}`)
        break
      case 'Member':
        router.push(`/bands/${slug}/members`)
        break
      case 'Proposal':
        router.push(`/bands/${slug}/proposals/${entityId}`)
        break
      case 'Vote':
        // Would need to look up the proposal ID - for now go to proposals
        router.push(`/bands/${slug}/proposals`)
        break
      case 'Project':
        router.push(`/bands/${slug}/projects/${entityId}`)
        break
      case 'Task':
        router.push(`/bands/${slug}/tasks/${entityId}`)
        break
      case 'ChecklistItem':
        // Look up the task ID and navigate to the checklist item
        try {
          const result = await utils.checklist.getById.fetch({ itemId: entityId })
          if (result.item?.task?.id) {
            router.push(`/bands/${slug}/tasks/${result.item.task.id}/checklist/${entityId}`)
          } else {
            router.push(`/bands/${slug}/tasks`)
          }
        } catch {
          router.push(`/bands/${slug}/tasks`)
        }
        break
      case 'Comment':
        // Comments don't have their own page
        break
      case 'File':
        // Files don't have their own page
        break
    }
  }

  const totalPages = auditData?.totalPages || 1

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="Audit Log"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
      >
        <Stack spacing="lg">
          {/* Filters */}
          <Flex gap="md" wrap="wrap">
            <select
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entities</option>
              {ENTITY_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={actorId}
              onChange={(e) => { setActorId(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Users</option>
              {membersData?.members.map(member => (
                <option key={member.userId} value={member.userId}>{member.name}</option>
              ))}
              <option value="system">System</option>
            </select>

            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
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

          {/* Table */}
          {auditLoading ? (
            <Loading message="Loading audit logs..." />
          ) : auditData?.items.length === 0 ? (
            <div className="text-center py-12">
              <Text color="muted">No log entries</Text>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">When</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Who</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Action</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">What</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData?.items.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${item.action !== 'deleted' ? 'cursor-pointer' : 'cursor-default'} ${item.flagged ? 'bg-amber-50' : ''}`}
                        onClick={() => handleRowClick(item)}
                      >
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          {item.actorName || <span className="text-gray-400">System</span>}
                        </td>
                        <td className="py-3 px-4">
                          <Flex gap="xs" align="center">
                            {getActionBadge(item.action)}
                            {item.flagged && (
                              <Badge variant="warning" title={item.flagReasons?.join(', ') || 'Flagged'}>
                                ⚠️
                              </Badge>
                            )}
                          </Flex>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-500">{item.entityType}:</span>{' '}
                          <span className="font-medium">
                            {item.entityName
                              ? (item.entityName.length > 30
                                  ? item.entityName.slice(0, 30) + '...'
                                  : item.entityName)
                              : item.entityId.slice(0, 8) + '...'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 font-mono text-xs max-w-xs truncate">
                          {item.flagged && item.flagReasons?.length ? (
                            <span className="text-amber-600">
                              Flagged: {item.flagReasons.join(', ')}
                            </span>
                          ) : (
                            formatChanges(item.changes)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Flex justify="between" align="center">
                <Text variant="small" color="muted">
                  Showing {((page - 1) * 25) + 1}-{Math.min(page * 25, auditData?.total || 0)} of {auditData?.total} entries
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
                  <Flex gap="xs" align="center">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded ${
                            page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </Flex>
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
            </>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}
