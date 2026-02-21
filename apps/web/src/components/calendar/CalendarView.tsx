'use client'

import { useState, useCallback, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, View, NavigateAction } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { useRouter } from 'next/navigation'
import 'react-big-calendar/lib/css/react-big-calendar.css'

// Setup date-fns localizer
const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

// Calendar item type from API
export interface CalendarItem {
  id: string
  type: 'EVENT' | 'PROPOSAL_DEADLINE' | 'PROJECT_TARGET' | 'TASK_DUE' | 'CHECKLIST_DUE'
  title: string
  subtitle?: string
  date: Date | string
  endDate?: Date | string
  allDay: boolean
  bandId: string
  bandName: string
  bandSlug: string
  sourceUrl: string
  color: string
  metadata: {
    eventType?: string
    status?: string
    priority?: string
    isOverdue?: boolean
    isRecurring?: boolean
    recurrenceDescription?: string
    hasNotes?: boolean
    hasRecordings?: boolean
  }
}

// Transform API items to calendar events
interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: CalendarItem
}

export const CALENDAR_COLORS = {
  EVENT: '#3B82F6',           // Blue
  PROPOSAL_DEADLINE: '#8B5CF6', // Purple
  PROJECT_TARGET: '#10B981',   // Green
  TASK_DUE: '#F59E0B',        // Orange/Amber
  CHECKLIST_DUE: '#6B7280',   // Gray
}

export const CALENDAR_LABELS = {
  EVENT: 'Events',
  PROPOSAL_DEADLINE: 'Proposal Deadlines',
  PROJECT_TARGET: 'Project Targets',
  TASK_DUE: 'Task Due Dates',
  CHECKLIST_DUE: 'Checklist Items',
}

interface CalendarViewProps {
  items: CalendarItem[]
  isLoading?: boolean
  currentDate: Date
  onDateChange: (date: Date) => void
  view: View
  onViewChange: (view: View) => void
  filters: {
    events: boolean
    proposals: boolean
    projects: boolean
    tasks: boolean
    checklists: boolean
  }
  onFilterChange: (key: keyof CalendarViewProps['filters']) => void
  showBandFilter?: boolean
  bands?: { id: string; name: string }[]
  selectedBandId?: string
  onBandChange?: (bandId: string | undefined) => void
}

export function CalendarView({
  items,
  isLoading = false,
  currentDate,
  onDateChange,
  view,
  onViewChange,
  filters,
  onFilterChange,
  showBandFilter = false,
  bands = [],
  selectedBandId,
  onBandChange,
}: CalendarViewProps) {
  const router = useRouter()
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null)

  // Transform items to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return items
      .filter(item => {
        // Apply filters
        if (item.type === 'EVENT' && !filters.events) return false
        if (item.type === 'PROPOSAL_DEADLINE' && !filters.proposals) return false
        if (item.type === 'PROJECT_TARGET' && !filters.projects) return false
        if (item.type === 'TASK_DUE' && !filters.tasks) return false
        if (item.type === 'CHECKLIST_DUE' && !filters.checklists) return false
        return true
      })
      .map(item => {
        const start = new Date(item.date)
        const end = item.endDate ? new Date(item.endDate) : start
        return {
          id: item.id,
          title: item.title,
          start,
          end,
          allDay: item.allDay,
          resource: item,
        }
      })
  }, [items, filters])

  // Event style getter
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const color = event.resource.color
    const isOverdue = event.resource.metadata.isOverdue

    return {
      style: {
        backgroundColor: color,
        borderRadius: '4px',
        opacity: isOverdue ? 0.7 : 1,
        color: 'white',
        border: 'none',
        fontSize: '12px',
        padding: '2px 4px',
      },
    }
  }, [])

  // Handle event click
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event.resource)
  }, [])

  // Navigate to event source
  const handleNavigateToSource = useCallback(() => {
    if (selectedEvent) {
      router.push(selectedEvent.sourceUrl)
    }
  }, [selectedEvent, router])

  // Handle navigation
  const handleNavigate = useCallback((newDate: Date, view: View, action: NavigateAction) => {
    onDateChange(newDate)
  }, [onDateChange])

  // Custom toolbar
  const CustomToolbar = useCallback(({ label, onNavigate, onView }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('PREV')}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
        >
          Previous
        </button>
        <button
          onClick={() => onNavigate('TODAY')}
          className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium"
        >
          Today
        </button>
        <button
          onClick={() => onNavigate('NEXT')}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
        >
          Next
        </button>
        <span className="ml-4 text-lg font-semibold text-gray-800">{label}</span>
      </div>
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {(['month', 'week', 'agenda'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === v
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </div>
  ), [view])

  return (
    <div className="calendar-container">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">Show:</span>

        {/* Type filters */}
        {Object.entries(CALENDAR_COLORS).map(([type, color]) => (
          <label key={type} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={
                type === 'EVENT' ? filters.events :
                type === 'PROPOSAL_DEADLINE' ? filters.proposals :
                type === 'PROJECT_TARGET' ? filters.projects :
                type === 'TASK_DUE' ? filters.tasks :
                filters.checklists
              }
              onChange={() => {
                const key =
                  type === 'EVENT' ? 'events' :
                  type === 'PROPOSAL_DEADLINE' ? 'proposals' :
                  type === 'PROJECT_TARGET' ? 'projects' :
                  type === 'TASK_DUE' ? 'tasks' :
                  'checklists'
                onFilterChange(key as keyof typeof filters)
              }}
              className="rounded border-gray-300"
              style={{ accentColor: color }}
            />
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-gray-600">
              {CALENDAR_LABELS[type as keyof typeof CALENDAR_LABELS]}
            </span>
          </label>
        ))}

        {/* Band filter */}
        {showBandFilter && bands.length > 0 && (
          <div className="ml-auto">
            <select
              value={selectedBandId || ''}
              onChange={(e) => onBandChange?.(e.target.value || undefined)}
              className="text-sm border-gray-300 rounded-lg px-3 py-1.5"
            >
              <option value="">All Bands</option>
              {bands.map((band) => (
                <option key={band.id} value={band.id}>
                  {band.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Calendar */}
      {!isLoading && (
        <div className="bg-white rounded-lg" style={{ height: 600 }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            date={currentDate}
            view={view}
            onNavigate={handleNavigate}
            onView={onViewChange}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            components={{
              toolbar: CustomToolbar,
            }}
            popup
            selectable={false}
          />
        </div>
      )}

      {/* Event detail popup */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with color indicator */}
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: selectedEvent.color }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {selectedEvent.title}
                </h3>
                {selectedEvent.subtitle && (
                  <p className="text-sm text-gray-500">{selectedEvent.subtitle}</p>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Type:</span>
                <span
                  className="px-2 py-0.5 rounded-full text-white text-xs"
                  style={{ backgroundColor: selectedEvent.color }}
                >
                  {CALENDAR_LABELS[selectedEvent.type]}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Date:</span>
                <span className="text-gray-900">
                  {format(new Date(selectedEvent.date), 'PPP')}
                  {!selectedEvent.allDay && ` at ${format(new Date(selectedEvent.date), 'p')}`}
                </span>
              </div>

              {selectedEvent.metadata.isOverdue && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <span>Overdue</span>
                </div>
              )}

              {selectedEvent.metadata.status && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className="text-gray-900">{selectedEvent.metadata.status}</span>
                </div>
              )}

              {selectedEvent.metadata.priority && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Priority:</span>
                  <span className="text-gray-900">{selectedEvent.metadata.priority}</span>
                </div>
              )}

              {selectedEvent.metadata.isRecurring && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Recurring:</span>
                  <span className="text-gray-900">
                    {selectedEvent.metadata.recurrenceDescription || 'Yes'}
                  </span>
                </div>
              )}

              {(selectedEvent.metadata.hasNotes || selectedEvent.metadata.hasRecordings) && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Attachments:</span>
                  <span className="flex items-center gap-2 text-gray-900">
                    {selectedEvent.metadata.hasNotes && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Notes
                      </span>
                    )}
                    {selectedEvent.metadata.hasRecordings && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recording
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleNavigateToSource}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                View Details
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom styles */}
      <style jsx global>{`
        .calendar-container .rbc-calendar {
          font-family: inherit;
        }
        .calendar-container .rbc-header {
          padding: 8px;
          font-weight: 600;
          color: #374151;
        }
        .calendar-container .rbc-month-view {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .calendar-container .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid #e5e7eb;
        }
        .calendar-container .rbc-month-row + .rbc-month-row {
          border-top: 1px solid #e5e7eb;
        }
        .calendar-container .rbc-today {
          background-color: #eff6ff;
        }
        .calendar-container .rbc-off-range-bg {
          background-color: #f9fafb;
        }
        .calendar-container .rbc-event {
          padding: 2px 4px;
        }
        .calendar-container .rbc-event:focus {
          outline: none;
        }
        .calendar-container .rbc-agenda-view table {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .calendar-container .rbc-agenda-table thead > tr > th {
          padding: 12px;
          background-color: #f9fafb;
          font-weight: 600;
        }
        .calendar-container .rbc-agenda-table tbody > tr > td {
          padding: 12px;
          border-top: 1px solid #e5e7eb;
        }
        .calendar-container .rbc-time-view {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
      `}</style>
    </div>
  )
}
