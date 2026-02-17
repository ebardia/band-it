'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { View } from 'react-big-calendar'
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Text,
  Stack,
  Button,
  Loading,
  Alert,
  BandLayout
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { CalendarView, CalendarItem } from '@/components/calendar'

export default function BandCalendarPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<View>('month')
  const [filters, setFilters] = useState({
    events: true,
    proposals: true,
    projects: true,
    tasks: true,
    checklists: true,
  })

  // Calculate date range for API query (fetch 2 months before and after for smooth navigation)
  const dateRange = useMemo(() => {
    const start = startOfMonth(subMonths(currentDate, 2))
    const end = endOfMonth(addMonths(currentDate, 2))
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    }
  }, [currentDate])

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

  const { data: calendarData, isLoading: calendarLoading } = trpc.calendar.getCalendarItems.useQuery(
    {
      userId: userId || '',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      bandId: bandData?.band?.id,
      includeEvents: filters.events,
      includeProposals: filters.proposals,
      includeProjects: filters.projects,
      includeTasks: filters.tasks,
      includeChecklists: filters.checklists,
    },
    { enabled: !!userId && !!bandData?.band?.id }
  )

  const handleFilterChange = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (bandLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Calendar"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading calendar..." />
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
          pageTitle="Calendar"
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
  const isMember = !!currentMember
  const canCreateEvent = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)
  const canAccessAdminTools = canCreateEvent

  // Transform API items to CalendarItem format
  const calendarItems: CalendarItem[] = (calendarData?.items || []).map((item: any) => ({
    ...item,
    date: new Date(item.date),
    endDate: item.endDate ? new Date(item.endDate) : undefined,
  }))

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="Calendar"
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        bandId={band.id}
        userId={userId || undefined}
        actions={
          canCreateEvent && (
            <Button
              variant="primary"
              onClick={() => router.push(`/bands/${slug}/calendar/create`)}
            >
              + Create Event
            </Button>
          )
        }
      >
        <Stack spacing="md">
          <CalendarView
            items={calendarItems}
            isLoading={calendarLoading}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            view={view}
            onViewChange={setView}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </Stack>
      </BandLayout>
    </>
  )
}
