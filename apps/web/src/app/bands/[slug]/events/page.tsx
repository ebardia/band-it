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
  Card,
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
        pageTitle="Events"
        isMember={isMember}
        wide={true}
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
        <Stack spacing="xl">
          {/* Upcoming Events Highlight */}
          {upcomingEvents.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <Stack spacing="md">
                <Heading level={3}>Next Up</Heading>
                <Stack spacing="sm">
                  {upcomingEvents.map((event: any) => (
                    <div
                      key={event.id}
                      className="p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/bands/${slug}/events/${event.id}`)}
                    >
                      <Flex justify="between" align="center">
                        <Stack spacing="xs">
                          <Text weight="semibold">{event.title}</Text>
                          <Text variant="small" color="muted">
                            {formatEventTime(event.startTime, event.endTime)}
                          </Text>
                        </Stack>
                        <Flex gap="sm">
                          {getEventTypeBadge(event.eventType)}
                          <Badge variant="info">{event._count.rsvps} RSVPs</Badge>
                        </Flex>
                      </Flex>
                    </div>
                  ))}
                </Stack>
              </Stack>
            </Card>
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

            <Button
              variant={showPast ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowPast(!showPast)}
            >
              {showPast ? 'Showing All' : 'Show Past Events'}
            </Button>
          </Flex>

          {/* Events List */}
          {events.length > 0 ? (
            <Stack spacing="md">
              {events.map((event: any) => (
                <Card
                  key={event.id}
                  hover
                  onClick={() => router.push(`/bands/${slug}/events/${event.id}`)}
                  className={event.isCancelled ? 'opacity-60' : ''}
                >
                  <Flex justify="between" align="start">
                    <Stack spacing="sm">
                      <Flex gap="sm" align="center">
                        <Heading level={3}>{event.title}</Heading>
                        {event.isCancelled && <Badge variant="danger">Cancelled</Badge>}
                        {event.recurrenceRule && <Badge variant="neutral">Recurring</Badge>}
                      </Flex>

                      <Text variant="small" color="muted">
                        {formatEventTime(event.startTime, event.endTime)}
                      </Text>

                      <Flex gap="sm" className="flex-wrap">
                        {getEventTypeBadge(event.eventType)}
                        {event.location && (
                          <Badge variant="neutral">{event.location}</Badge>
                        )}
                        {event.meetingUrl && (
                          <Badge variant="info">Online Link</Badge>
                        )}
                      </Flex>

                      {event.description && (
                        <Text variant="small" className="line-clamp-2">
                          {event.description}
                        </Text>
                      )}

                      <Flex gap="md">
                        <Text variant="small" color="muted">
                          {event._count.rsvps} RSVPs
                        </Text>
                        <Text variant="small" color="muted">
                          By {event.createdBy.name}
                        </Text>
                      </Flex>
                    </Stack>

                    <Stack spacing="sm" align="end">
                      <Button variant="secondary" size="sm">
                        View →
                      </Button>
                      {isUpcoming(event.startTime) && !event.isCancelled && (
                        <Text variant="small" color="muted">
                          {Math.ceil((new Date(event.startTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days away
                        </Text>
                      )}
                    </Stack>
                  </Flex>
                </Card>
              ))}
            </Stack>
          ) : (
            <Alert variant="info">
              <Stack spacing="sm">
                <Text>No events found.</Text>
                {canCreateEvent && (
                  <>
                    <Text variant="small" color="muted">
                      Create your first event to get started.
                    </Text>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push(`/bands/${slug}/events/create`)}
                    >
                      Create Event
                    </Button>
                  </>
                )}
              </Stack>
            </Alert>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}
