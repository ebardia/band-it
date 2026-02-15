'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
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

export default function BandEventsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [eventTypeFilter, setEventTypeFilter] = useState<string | undefined>(undefined)
  const [showPast, setShowPast] = useState(false)

  // Memoize the current date to prevent infinite query loops
  const nowISO = useMemo(() => new Date().toISOString(), [])

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

  const { data: eventsData, isLoading: eventsLoading } = trpc.event.getByBand.useQuery(
    {
      bandId: bandData?.band?.id || '',
      eventType: eventTypeFilter as any,
      startAfter: showPast ? undefined : nowISO,
    },
    { enabled: !!bandData?.band?.id }
  )

  const { data: upcomingData } = trpc.event.getUpcoming.useQuery(
    { bandId: bandData?.band?.id || '', limit: 3 },
    { enabled: !!bandData?.band?.id }
  )

  if (bandLoading || eventsLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Events"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Loading message="Loading events..." />
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
          pageTitle="Events"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const band = bandData.band
  const events = eventsData?.events || []
  const upcomingEvents = upcomingData?.events || []
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const isMember = !!currentMember
  const canCreateEvent = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)
  const canAccessAdminTools = canCreateEvent // Same roles

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'ONLINE_MEETING':
        return <Badge variant="info">Online</Badge>
      case 'IN_PERSON_MEETING':
        return <Badge variant="success">In Person</Badge>
      case 'SOCIAL':
        return <Badge variant="warning">Social</Badge>
      case 'HYBRID':
        return <Badge variant="neutral">Hybrid</Badge>
      default:
        return <Badge variant="neutral">{type}</Badge>
    }
  }

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const dateStr = start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
    const startTimeStr = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
    const endTimeStr = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
    return `${dateStr} at ${startTimeStr} - ${endTimeStr}`
  }

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date()
  }

  const eventTypeFilters = [
    { value: undefined, label: 'All Types' },
    { value: 'ONLINE_MEETING', label: 'Online' },
    { value: 'IN_PERSON_MEETING', label: 'In Person' },
    { value: 'SOCIAL', label: 'Social' },
    { value: 'HYBRID', label: 'Hybrid' },
  ]

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="Events"
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        bandId={bandData?.band?.id}
        userId={userId || undefined}
        actions={
          canCreateEvent && (
            <Button
              variant="primary"
              onClick={() => router.push(`/bands/${slug}/events/create`)}
            >
              + Create Event
            </Button>
          )
        }
      >
        <Stack spacing="md">
          {/* Upcoming Events Highlight */}
          {upcomingEvents.length > 0 && (
            <div className="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-blue-200 bg-blue-100">
                <Text weight="semibold">Next Up</Text>
              </div>
              {upcomingEvents.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-center py-2 px-3 border-b border-blue-100 last:border-b-0 cursor-pointer hover:bg-blue-100 bg-white"
                  onClick={() => router.push(`/bands/${slug}/events/${event.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Text weight="semibold">{event.title}</Text>
                      {getEventTypeBadge(event.eventType)}
                      <Badge variant="info">{event._count.rsvps} RSVPs</Badge>
                    </div>
                    <Text variant="small" color="muted">{formatEventTime(event.startTime, event.endTime)}</Text>
                  </div>
                  <span className="text-gray-400 ml-2">→</span>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <Flex gap="md" className="flex-wrap" justify="between">
            <Flex gap="sm" className="flex-wrap">
              {eventTypeFilters.map((filter) => (
                <Button
                  key={filter.value || 'all'}
                  variant={eventTypeFilter === filter.value ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setEventTypeFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </Flex>

            <Flex gap="sm">
              <Button
                variant={showPast ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowPast(!showPast)}
              >
                {showPast ? 'Showing All' : 'Show Past'}
              </Button>
              {canCreateEvent && (
                <Button variant="primary" size="sm" onClick={() => router.push(`/bands/${slug}/events/create`)}>
                  + Create
                </Button>
              )}
            </Flex>
          </Flex>

          {/* Events List */}
          {events.length > 0 ? (
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              {events.map((event: any) => (
                <div
                  key={event.id}
                  className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer ${event.isCancelled ? 'opacity-60' : ''}`}
                  onClick={() => router.push(`/bands/${slug}/events/${event.id}`)}
                >
                  <div className="flex items-center py-3 px-3 md:px-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Text weight="semibold">{event.title}</Text>
                        {getEventTypeBadge(event.eventType)}
                        {event.isCancelled && <Badge variant="danger">Cancelled</Badge>}
                        {event.recurrenceRule && <Badge variant="neutral">Recurring</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                        <span>{formatEventTime(event.startTime, event.endTime)}</span>
                        {event.location && (
                          <>
                            <span>•</span>
                            <span>{event.location}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{event._count.rsvps} RSVPs</span>
                        <span>•</span>
                        <span>By {event.createdBy.name}</span>
                        {isUpcoming(event.startTime) && !event.isCancelled && (
                          <>
                            <span>•</span>
                            <span>{Math.ceil((new Date(event.startTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d away</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-gray-400 ml-2">→</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg bg-white p-6 text-center">
              <Text color="muted">No events found.</Text>
              {canCreateEvent && (
                <Button variant="primary" size="sm" onClick={() => router.push(`/bands/${slug}/events/create`)} className="mt-2">
                  Create Event
                </Button>
              )}
            </div>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}
