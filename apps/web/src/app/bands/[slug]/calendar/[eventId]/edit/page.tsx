'use client'

import { useState, useEffect } from 'react'
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
  Loading,
  Alert,
  BandLayout,
  Input,
  Textarea,
  useToast
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

type EventType = 'ONLINE_MEETING' | 'IN_PERSON_MEETING' | 'SOCIAL' | 'HYBRID'

export default function EditEventPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const eventId = params.eventId as string
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState<EventType>('IN_PERSON_MEETING')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [address, setAddress] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [meetingId, setMeetingId] = useState('')
  const [meetingPassword, setMeetingPassword] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('WEEKLY')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')

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

  const { data: eventData, isLoading: eventLoading } = trpc.event.getById.useQuery(
    { eventId, userId: userId || undefined },
    { enabled: !!eventId }
  )

  // Pre-populate form once event data is loaded
  useEffect(() => {
    if (!eventData?.event || initialized) return

    const event = eventData.event
    setTitle(event.title)
    setDescription(event.description || '')
    setEventType(event.eventType as EventType)
    setLocation(event.location || '')
    setAddress(event.address || '')
    setMeetingUrl(event.meetingUrl || '')
    setMeetingId(event.meetingId || '')
    setMeetingPassword(event.meetingPassword || '')

    // Parse start/end times into date + time parts
    const start = new Date(event.startTime)
    const end = new Date(event.endTime)
    setStartDate(start.toISOString().split('T')[0])
    setStartTime(start.toTimeString().slice(0, 5))
    setEndDate(end.toISOString().split('T')[0])
    setEndTime(end.toTimeString().slice(0, 5))

    // Recurrence
    if (event.recurrenceRule) {
      setIsRecurring(true)
      const match = event.recurrenceRule.match(/FREQ=(\w+)/)
      if (match) setRecurrenceFrequency(match[1])
    }
    if (event.recurrenceEndDate) {
      setRecurrenceEndDate(new Date(event.recurrenceEndDate).toISOString().split('T')[0])
    }

    setInitialized(true)
  }, [eventData, initialized])

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - tRPC type instantiation too deep with large routers
  const updateEventMutation = trpc.event.update.useMutation({
    onSuccess: () => {
      showToast('Event updated successfully!', 'success')
      router.push(`/bands/${slug}/calendar/${eventId}`)
    },
    onError: (error: { message: string }) => {
      showToast(error.message, 'error')
    }
  })

  if (bandLoading || eventLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Edit Event"
          isMember={false}
        >
          <Loading message="Loading event..." />
        </BandLayout>
      </>
    )
  }

  if (!bandData?.band || !eventData?.event) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Edit Event"
          isMember={false}
        >
          <Alert variant="danger">
            <Text>Event not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const band = bandData.band
  const event = eventData.event
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const isMember = !!currentMember
  const isCreator = event.createdById === userId
  const canManage = currentMember && ['FOUNDER', 'GOVERNOR'].includes(currentMember.role)
  const canEdit = isCreator || canManage

  if (!canEdit) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName={band.name}
          bandImageUrl={band.imageUrl}
          pageTitle="Edit Event"
          isMember={isMember}
        >
          <Alert variant="danger">
            <Text>You do not have permission to edit this event</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    const startDateTime = new Date(`${startDate}T${startTime}`)
    const endDateTime = new Date(`${endDate}T${endTime}`)

    if (endDateTime <= startDateTime) {
      showToast('End time must be after start time', 'error')
      return
    }

    let recurrenceRule: string | undefined = undefined
    if (isRecurring) {
      recurrenceRule = `FREQ=${recurrenceFrequency}`
    }

    updateEventMutation.mutate({
      eventId,
      userId,
      title,
      description: description || null,
      eventType,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      location: location || null,
      address: address || null,
      meetingUrl: meetingUrl || null,
      meetingId: meetingId || null,
      meetingPassword: meetingPassword || null,
      recurrenceRule: recurrenceRule || null,
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : null,
    })
  }

  const requiresLocation = eventType === 'IN_PERSON_MEETING' || eventType === 'SOCIAL' || eventType === 'HYBRID'
  const requiresMeetingUrl = eventType === 'ONLINE_MEETING' || eventType === 'HYBRID'

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="Edit Event"
        isMember={isMember}
      >
        <form onSubmit={handleSubmit}>
          <Stack spacing="xl">
            {/* Basic Info */}
            <Card>
              <Stack spacing="lg">
                <Heading level={3}>Event Details</Heading>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">Event Title *</label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Weekly Band Meeting"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Description</label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this event about?"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
                  <Flex gap="sm" className="flex-wrap mt-2">
                    {[
                      { value: 'IN_PERSON_MEETING', label: 'In Person' },
                      { value: 'ONLINE_MEETING', label: 'Online' },
                      { value: 'HYBRID', label: 'Hybrid' },
                      { value: 'SOCIAL', label: 'Social' },
                    ].map((type) => (
                      <Button
                        key={type.value}
                        type="button"
                        variant={eventType === type.value ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setEventType(type.value as EventType)}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </Flex>
                </div>
              </Stack>
            </Card>

            {/* Date & Time */}
            <Card>
              <Stack spacing="lg">
                <Heading level={3}>Date & Time</Heading>

                <Flex gap="md" className="flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="startDate">Start Date *</label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value)
                        if (!endDate || e.target.value > endDate) {
                          setEndDate(e.target.value)
                        }
                      }}
                      required
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="startTime">Start Time *</label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                </Flex>

                <Flex gap="md" className="flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="endDate">End Date *</label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      required
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="endTime">End Time *</label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </Flex>

                {/* Recurrence */}
                <div>
                  <Flex gap="sm" align="center">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="isRecurring" className="mb-0 cursor-pointer text-sm font-medium text-gray-700">
                      This is a recurring event
                    </label>
                  </Flex>
                </div>

                {isRecurring && (
                  <Flex gap="md" className="flex-wrap">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="frequency">Repeats</label>
                      <select
                        id="frequency"
                        value={recurrenceFrequency}
                        onChange={(e) => setRecurrenceFrequency(e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="recurrenceEnd">Until (optional)</label>
                      <Input
                        id="recurrenceEnd"
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        min={startDate}
                      />
                    </div>
                  </Flex>
                )}
              </Stack>
            </Card>

            {/* Location */}
            {requiresLocation && (
              <Card>
                <Stack spacing="lg">
                  <Heading level={3}>Location</Heading>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="location">Venue Name *</label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Community Center"
                      required={requiresLocation}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="address">Address</label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full address for navigation"
                      rows={2}
                    />
                  </div>
                </Stack>
              </Card>
            )}

            {/* Online Meeting */}
            {requiresMeetingUrl && (
              <Card>
                <Stack spacing="lg">
                  <Heading level={3}>Online Meeting Details</Heading>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="meetingUrl">Meeting Link *</label>
                    <Input
                      id="meetingUrl"
                      type="url"
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      placeholder="https://zoom.us/j/..."
                      required={requiresMeetingUrl}
                    />
                  </div>

                  <Flex gap="md" className="flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="meetingId">Meeting ID (optional)</label>
                      <Input
                        id="meetingId"
                        value={meetingId}
                        onChange={(e) => setMeetingId(e.target.value)}
                        placeholder="123 456 7890"
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="meetingPassword">Password (optional)</label>
                      <Input
                        id="meetingPassword"
                        value={meetingPassword}
                        onChange={(e) => setMeetingPassword(e.target.value)}
                        placeholder="Meeting password"
                      />
                    </div>
                  </Flex>
                </Stack>
              </Card>
            )}

            {/* Submit */}
            <Flex gap="md" justify="end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push(`/bands/${slug}/calendar/${eventId}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={updateEventMutation.isPending}
              >
                {updateEventMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </Flex>
          </Stack>
        </form>
      </BandLayout>
    </>
  )
}
