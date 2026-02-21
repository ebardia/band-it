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
  Badge,
  Loading,
  Alert,
  BandLayout,
  Textarea,
  Input,
  useToast
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import ReactMarkdown from 'react-markdown'

interface RecordingLink {
  url: string
  label?: string
}

export default function EventDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const eventId = params.eventId as string
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [rsvpNote, setRsvpNote] = useState('')
  const [showRsvpForm, setShowRsvpForm] = useState(false)

  // Notes and recording links editing
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editedNotes, setEditedNotes] = useState('')
  const [editedLinks, setEditedLinks] = useState<RecordingLink[]>([])
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkLabel, setNewLinkLabel] = useState('')

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

  const { data: eventData, isLoading: eventLoading, refetch: refetchEvent } = trpc.event.getById.useQuery(
    { eventId, userId: userId || undefined },
    { enabled: !!eventId }
  )

  const setRsvpMutation = trpc.event.setRSVP.useMutation({
    onSuccess: () => {
      showToast('RSVP updated!', 'success')
      refetchEvent()
      setShowRsvpForm(false)
      setRsvpNote('')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const removeRsvpMutation = trpc.event.removeRSVP.useMutation({
    onSuccess: () => {
      showToast('RSVP removed', 'success')
      refetchEvent()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const cancelEventMutation = trpc.event.cancel.useMutation({
    onSuccess: () => {
      showToast('Event cancelled', 'success')
      refetchEvent()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const updateNotesMutation = trpc.event.updateNotes.useMutation({
    onSuccess: () => {
      showToast('Notes saved!', 'success')
      refetchEvent()
      setIsEditingNotes(false)
    },
    onError: (error) => {
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
          pageTitle="Event"
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
          pageTitle="Event"
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
  const userRSVP = eventData.userRSVP
  const rsvpCounts = eventData.rsvpCounts

  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const isMember = !!currentMember
  const isCreator = event.createdById === userId
  const canManage = currentMember && ['FOUNDER', 'GOVERNOR'].includes(currentMember.role)
  const canEdit = isCreator || canManage

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'ONLINE_MEETING':
        return <Badge variant="info">Online Meeting</Badge>
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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const handleRsvp = (status: 'GOING' | 'NOT_GOING' | 'MAYBE') => {
    if (!userId) return
    setRsvpMutation.mutate({
      eventId,
      userId,
      status,
      note: rsvpNote || undefined,
    })
  }

  const handleRemoveRsvp = () => {
    if (!userId) return
    removeRsvpMutation.mutate({ eventId, userId })
  }

  const handleCancelEvent = () => {
    if (!userId || !confirm('Are you sure you want to cancel this event?')) return
    cancelEventMutation.mutate({
      eventId,
      userId,
      cancellationNote: 'Event cancelled by organizer',
    })
  }

  const isUpcoming = new Date(event.startTime) > new Date()
  const isPast = new Date(event.endTime) < new Date()

  // Start editing notes
  const handleStartEditingNotes = () => {
    setEditedNotes(event.meetingNotes || '')
    setEditedLinks((event.recordingLinks as unknown as RecordingLink[]) || [])
    setIsEditingNotes(true)
  }

  // Save notes and links
  const handleSaveNotes = () => {
    if (!userId) return
    updateNotesMutation.mutate({
      eventId,
      userId,
      meetingNotes: editedNotes || null,
      recordingLinks: editedLinks.length > 0 ? editedLinks : null,
    })
  }

  // Cancel editing
  const handleCancelEditingNotes = () => {
    setIsEditingNotes(false)
    setEditedNotes('')
    setEditedLinks([])
    setNewLinkUrl('')
    setNewLinkLabel('')
  }

  // Add a new recording link
  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return
    try {
      new URL(newLinkUrl.trim())
      setEditedLinks([...editedLinks, { url: newLinkUrl.trim(), label: newLinkLabel.trim() || undefined }])
      setNewLinkUrl('')
      setNewLinkLabel('')
    } catch {
      showToast('Please enter a valid URL', 'error')
    }
  }

  // Remove a recording link
  const handleRemoveLink = (index: number) => {
    setEditedLinks(editedLinks.filter((_, i) => i !== index))
  }

  const recordingLinks = (event.recordingLinks as unknown as RecordingLink[]) || []
  const hasNotesOrRecordings = event.meetingNotes || recordingLinks.length > 0

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle={event.title}
        isMember={isMember}
        actions={
          canEdit && !event.isCancelled && (
            <Flex gap="sm">
              <Button
                variant="secondary"
                onClick={() => router.push(`/bands/${slug}/calendar/${eventId}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={handleCancelEvent}
                disabled={cancelEventMutation.isPending}
              >
                Cancel Event
              </Button>
            </Flex>
          )
        }
      >
        <Stack spacing="xl">
          {/* Status Banners */}
          {event.isCancelled && (
            <Alert variant="danger">
              <Stack spacing="sm">
                <Text weight="semibold">This event has been cancelled</Text>
                {event.cancellationNote && (
                  <Text variant="small">{event.cancellationNote}</Text>
                )}
              </Stack>
            </Alert>
          )}

          {isPast && !event.isCancelled && (
            <Alert variant="info">
              <Text>This event has ended</Text>
            </Alert>
          )}

          {/* Event Details */}
          <Card>
            <Stack spacing="lg">
              <Flex gap="sm" className="flex-wrap">
                {getEventTypeBadge(event.eventType)}
                {event.recurrenceRule && <Badge variant="neutral">Recurring</Badge>}
              </Flex>

              <Stack spacing="md">
                <div>
                  <Text variant="small" color="muted">When</Text>
                  <Text>{formatDateTime(event.startTime)}</Text>
                  <Text color="muted">to {formatDateTime(event.endTime)}</Text>
                </div>

                {event.location && (
                  <div>
                    <Text variant="small" color="muted">Where</Text>
                    <Text weight="semibold">{event.location}</Text>
                    {event.address && <Text variant="small">{event.address}</Text>}
                  </div>
                )}

                {event.meetingUrl && (
                  <div>
                    <Text variant="small" color="muted">Online Meeting</Text>
                    <a
                      href={event.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {event.meetingUrl}
                    </a>
                    {event.meetingId && (
                      <Text variant="small">Meeting ID: {event.meetingId}</Text>
                    )}
                    {event.meetingPassword && (
                      <Text variant="small">Password: {event.meetingPassword}</Text>
                    )}
                  </div>
                )}

                {event.description && (
                  <div>
                    <Text variant="small" color="muted">Description</Text>
                    <Text className="whitespace-pre-wrap">{event.description}</Text>
                  </div>
                )}

                <div>
                  <Text variant="small" color="muted">Organized by</Text>
                  <Text>{event.createdBy.name}</Text>
                </div>
              </Stack>
            </Stack>
          </Card>

          {/* RSVP Section */}
          {isMember && !event.isCancelled && isUpcoming && (
            <Card>
              <Stack spacing="lg">
                <Heading level={3}>RSVP</Heading>

                {userRSVP ? (
                  <Stack spacing="md">
                    <Flex gap="sm" align="center">
                      <Text>Your response:</Text>
                      <Badge
                        variant={
                          userRSVP.status === 'GOING' ? 'success' :
                          userRSVP.status === 'NOT_GOING' ? 'danger' : 'warning'
                        }
                      >
                        {userRSVP.status === 'GOING' ? 'Going' :
                         userRSVP.status === 'NOT_GOING' ? 'Not Going' : 'Maybe'}
                      </Badge>
                    </Flex>

                    {userRSVP.note && (
                      <Text variant="small" color="muted">"{userRSVP.note}"</Text>
                    )}

                    <Flex gap="sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRsvpForm(true)}
                      >
                        Change Response
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveRsvp}
                        disabled={removeRsvpMutation.isPending}
                      >
                        Remove RSVP
                      </Button>
                    </Flex>
                  </Stack>
                ) : (
                  <Stack spacing="md">
                    <Flex gap="sm" className="flex-wrap">
                      <Button
                        variant="primary"
                        onClick={() => handleRsvp('GOING')}
                        disabled={setRsvpMutation.isPending}
                      >
                        Going
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleRsvp('MAYBE')}
                        disabled={setRsvpMutation.isPending}
                      >
                        Maybe
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleRsvp('NOT_GOING')}
                        disabled={setRsvpMutation.isPending}
                      >
                        Not Going
                      </Button>
                    </Flex>
                  </Stack>
                )}

                {showRsvpForm && (
                  <Stack spacing="md">
                    <Textarea
                      value={rsvpNote}
                      onChange={(e) => setRsvpNote(e.target.value)}
                      placeholder="Add a note (optional)"
                      rows={2}
                    />
                    <Flex gap="sm">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleRsvp('GOING')}
                        disabled={setRsvpMutation.isPending}
                      >
                        Going
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRsvp('MAYBE')}
                        disabled={setRsvpMutation.isPending}
                      >
                        Maybe
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRsvp('NOT_GOING')}
                        disabled={setRsvpMutation.isPending}
                      >
                        Not Going
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowRsvpForm(false)
                          setRsvpNote('')
                        }}
                      >
                        Cancel
                      </Button>
                    </Flex>
                  </Stack>
                )}
              </Stack>
            </Card>
          )}

          {/* Attendees */}
          <Card>
            <Stack spacing="lg">
              <Heading level={3}>Responses ({event.rsvps.length})</Heading>

              <Flex gap="lg" className="flex-wrap">
                <Stack spacing="xs">
                  <Text variant="small" color="muted">Going</Text>
                  <Text weight="semibold" className="text-green-600">{rsvpCounts.going}</Text>
                </Stack>
                <Stack spacing="xs">
                  <Text variant="small" color="muted">Maybe</Text>
                  <Text weight="semibold" className="text-yellow-600">{rsvpCounts.maybe}</Text>
                </Stack>
                <Stack spacing="xs">
                  <Text variant="small" color="muted">Not Going</Text>
                  <Text weight="semibold" className="text-red-600">{rsvpCounts.notGoing}</Text>
                </Stack>
              </Flex>

              {event.rsvps.length > 0 ? (
                <Stack spacing="sm">
                  {/* Going */}
                  {event.rsvps.filter((r: any) => r.status === 'GOING').length > 0 && (
                    <div>
                      <Text variant="small" weight="semibold" color="muted" className="mb-2">
                        Going
                      </Text>
                      <Flex gap="sm" className="flex-wrap">
                        {event.rsvps
                          .filter((r: any) => r.status === 'GOING')
                          .map((rsvp: any) => (
                            <Badge key={rsvp.id} variant="success">
                              {rsvp.user.name}
                            </Badge>
                          ))}
                      </Flex>
                    </div>
                  )}

                  {/* Maybe */}
                  {event.rsvps.filter((r: any) => r.status === 'MAYBE').length > 0 && (
                    <div>
                      <Text variant="small" weight="semibold" color="muted" className="mb-2">
                        Maybe
                      </Text>
                      <Flex gap="sm" className="flex-wrap">
                        {event.rsvps
                          .filter((r: any) => r.status === 'MAYBE')
                          .map((rsvp: any) => (
                            <Badge key={rsvp.id} variant="warning">
                              {rsvp.user.name}
                            </Badge>
                          ))}
                      </Flex>
                    </div>
                  )}

                  {/* Not Going */}
                  {event.rsvps.filter((r: any) => r.status === 'NOT_GOING').length > 0 && (
                    <div>
                      <Text variant="small" weight="semibold" color="muted" className="mb-2">
                        Not Going
                      </Text>
                      <Flex gap="sm" className="flex-wrap">
                        {event.rsvps
                          .filter((r: any) => r.status === 'NOT_GOING')
                          .map((rsvp: any) => (
                            <Badge key={rsvp.id} variant="danger">
                              {rsvp.user.name}
                            </Badge>
                          ))}
                      </Flex>
                    </div>
                  )}
                </Stack>
              ) : (
                <Text variant="small" color="muted">No responses yet</Text>
              )}
            </Stack>
          </Card>

          {/* Meeting Notes & Recordings */}
          {isMember && (
            <Card>
              <Stack spacing="lg">
                <Flex justify="between" align="center">
                  <Heading level={3}>
                    {isUpcoming ? 'Agenda & Materials' : 'Notes & Recordings'}
                  </Heading>
                  {!isEditingNotes && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleStartEditingNotes}
                    >
                      {hasNotesOrRecordings ? 'Edit' : 'Add Notes'}
                    </Button>
                  )}
                </Flex>

                {isEditingNotes ? (
                  <Stack spacing="lg">
                    {/* Notes Editor */}
                    <div>
                      <Text variant="small" color="muted" className="mb-2">
                        Notes (Markdown supported)
                      </Text>
                      <Textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        placeholder={isUpcoming ? 'Add agenda or pre-meeting notes...' : 'Add meeting notes, decisions, action items...'}
                        rows={8}
                      />
                    </div>

                    {/* Recording Links Editor */}
                    <div>
                      <Text variant="small" color="muted" className="mb-2">
                        Recording Links
                      </Text>

                      {/* Existing links */}
                      {editedLinks.length > 0 && (
                        <Stack spacing="sm" className="mb-4">
                          {editedLinks.map((link, index) => (
                            <Flex key={index} gap="sm" align="center" className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <div className="flex-1 min-w-0">
                                <Text className="truncate">{link.label || link.url}</Text>
                                {link.label && (
                                  <Text variant="small" color="muted" className="truncate">{link.url}</Text>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveLink(index)}
                              >
                                Remove
                              </Button>
                            </Flex>
                          ))}
                        </Stack>
                      )}

                      {/* Add new link */}
                      <Stack spacing="sm">
                        <Flex gap="sm" className="flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <Input
                              value={newLinkUrl}
                              onChange={(e) => setNewLinkUrl(e.target.value)}
                              placeholder="https://..."
                              type="url"
                            />
                          </div>
                          <div className="w-32">
                            <Input
                              value={newLinkLabel}
                              onChange={(e) => setNewLinkLabel(e.target.value)}
                              placeholder="Label (optional)"
                            />
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleAddLink}
                            disabled={!newLinkUrl.trim()}
                          >
                            Add Link
                          </Button>
                        </Flex>
                      </Stack>
                    </div>

                    {/* Save/Cancel buttons */}
                    <Flex gap="sm">
                      <Button
                        variant="primary"
                        onClick={handleSaveNotes}
                        disabled={updateNotesMutation.isPending}
                      >
                        {updateNotesMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleCancelEditingNotes}
                        disabled={updateNotesMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </Flex>
                  </Stack>
                ) : (
                  <Stack spacing="md">
                    {/* Display Recording Links */}
                    {recordingLinks.length > 0 && (
                      <div>
                        <Text variant="small" color="muted" className="mb-2">Recordings</Text>
                        <Stack spacing="sm">
                          {recordingLinks.map((link, index) => (
                            <a
                              key={index}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:underline"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {link.label || 'Recording'}
                            </a>
                          ))}
                        </Stack>
                      </div>
                    )}

                    {/* Display Notes */}
                    {event.meetingNotes ? (
                      <div>
                        <Text variant="small" color="muted" className="mb-2">Notes</Text>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{event.meetingNotes}</ReactMarkdown>
                        </div>
                      </div>
                    ) : !recordingLinks.length && (
                      <Text color="muted" variant="small">
                        {isUpcoming
                          ? 'No agenda or materials added yet. Click "Add Notes" to share pre-meeting information.'
                          : 'No notes or recordings added yet. Click "Add Notes" to document this meeting.'}
                      </Text>
                    )}
                  </Stack>
                )}
              </Stack>
            </Card>
          )}

          {/* Photos */}
          {event.files && event.files.length > 0 && (
            <Card>
              <Stack spacing="md">
                <Heading level={3}>Photos ({event.files.length})</Heading>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {event.files.map((file: any) => (
                    <div key={file.id} className="relative aspect-square">
                      <img
                        src={file.url}
                        alt={file.originalName}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </Stack>
            </Card>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}
