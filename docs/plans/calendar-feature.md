# Calendar Feature Implementation Plan

## Summary
Transform the Events feature into a Calendar that aggregates all time-sensitive items across the user's bands: events, proposal voting deadlines, project target dates, task due dates, and checklist item due dates.

## Data Sources

| Source | Date Field | What it represents |
|--------|------------|-------------------|
| Events | `startTime` | Scheduled event start |
| Proposals | `votingEndsAt` | Voting deadline |
| Projects | `targetDate` | Project target completion date |
| Tasks | `dueDate` | Task due date |
| ChecklistItems | `dueDate` | Checklist item due date |

---

## Database Changes

None required - all date fields already exist.

---

## Backend Implementation

### New Router: `apps/api/src/server/routers/calendar/calendar.query.ts`

```typescript
interface CalendarItem {
  id: string
  type: 'EVENT' | 'PROPOSAL_DEADLINE' | 'PROJECT_TARGET' | 'TASK_DUE' | 'CHECKLIST_DUE'
  title: string
  subtitle?: string        // e.g., band name, project name
  date: Date
  endDate?: Date           // Only for events
  allDay: boolean          // Tasks/deadlines are all-day, events have times
  bandId: string
  bandName: string
  bandSlug: string
  sourceUrl: string        // URL to navigate to the item
  metadata: {
    // Type-specific data
    eventType?: string     // For events
    status?: string        // For proposals/projects/tasks
    priority?: string      // For tasks
    isOverdue?: boolean    // For deadlines
  }
}
```

### Procedures

| Procedure | Type | Description |
|-----------|------|-------------|
| `getCalendarItems` | query | Get all calendar items for a user within a date range |
| `getUpcomingDeadlines` | query | Get next N deadlines (for dashboard widget) |

### `getCalendarItems` Logic

```typescript
getCalendarItems: publicProcedure
  .input(z.object({
    userId: z.string(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    // Filters
    includeEvents: z.boolean().default(true),
    includeProposals: z.boolean().default(true),
    includeProjects: z.boolean().default(true),
    includeTasks: z.boolean().default(true),
    includeChecklists: z.boolean().default(true),
    // Optional band filter
    bandId: z.string().optional(),
  }))
  .query(async ({ input }) => {
    // 1. Get user's active band memberships
    // 2. Query each source in parallel
    // 3. Transform to CalendarItem format
    // 4. Expand recurring events (up to 6 months)
    // 5. Sort by date
    // 6. Return combined list
  })
```

### Recurring Event Expansion

For events with `recurrenceRule`:
- Parse RRULE format
- Generate occurrences within the requested date range
- Cap at 6 months from today
- Respect `recurrenceEndDate` if set
- Exclude dates in `exceptions`

Use library: `rrule` (npm package)

---

## Frontend Implementation

### Route Structure

Keep existing structure but rename:
```
apps/web/src/app/bands/[slug]/calendar/
├── page.tsx                    # Calendar view for specific band
└── create/
    └── page.tsx                # Create event (existing)

apps/web/src/app/calendar/
└── page.tsx                    # User's unified calendar (all bands)
```

### Sidebar Changes

**File: `apps/web/src/components/ui/BandSidebar.tsx`**
- Change `Events` → `Calendar`
- Update path from `/events` to `/calendar`

**File: `apps/web/src/components/ui/BandLayout.tsx`**
- Update mobile nav similarly

### Calendar Page Components

#### 1. Main Calendar View (`CalendarView.tsx`)

```typescript
interface CalendarViewProps {
  items: CalendarItem[]
  view: 'month' | 'week' | 'agenda'
  onDateChange: (date: Date) => void
  onItemClick: (item: CalendarItem) => void
}
```

Features:
- Month view (default): Grid with date cells, items shown as colored dots/chips
- Week view: Time grid for events, all-day section for deadlines
- Agenda view: Simple list sorted by date

#### 2. Filter Panel (`CalendarFilters.tsx`)

Toggle visibility of:
- [ ] Events (blue)
- [ ] Proposal Deadlines (purple)
- [ ] Project Targets (green)
- [ ] Task Due Dates (orange)
- [ ] Checklist Items (gray)

For unified calendar only:
- Band filter dropdown

#### 3. Item Colors

```typescript
const CALENDAR_COLORS = {
  EVENT: '#3B82F6',           // Blue
  PROPOSAL_DEADLINE: '#8B5CF6', // Purple
  PROJECT_TARGET: '#10B981',   // Green
  TASK_DUE: '#F59E0B',        // Orange/Amber
  CHECKLIST_DUE: '#6B7280',   // Gray
}
```

#### 4. Calendar Item Popup

On click/hover:
- Item title
- Type badge (colored)
- Date/time
- Band name (for unified view)
- Status if applicable
- "View Details" link → navigates to source

### Library Choice

**Option A: react-big-calendar** (recommended)
- Mature, well-maintained
- Month/week/day/agenda views
- Good customization
- ~50KB gzipped

**Option B: @fullcalendar/react**
- More features
- Better mobile support
- Larger bundle (~100KB)

**Option C: Custom implementation**
- Smallest bundle
- Most work
- Full control

Recommendation: Start with `react-big-calendar` for faster implementation.

---

## API Response Shape

```typescript
// GET /api/trpc/calendar.getCalendarItems
{
  items: [
    {
      id: "evt_123",
      type: "EVENT",
      title: "Weekly Standup",
      subtitle: "My Band",
      date: "2024-01-15T10:00:00Z",
      endDate: "2024-01-15T11:00:00Z",
      allDay: false,
      bandId: "band_123",
      bandName: "My Band",
      bandSlug: "my-band",
      sourceUrl: "/bands/my-band/calendar/evt_123",
      metadata: {
        eventType: "ONLINE_MEETING"
      }
    },
    {
      id: "prop_456",
      type: "PROPOSAL_DEADLINE",
      title: "Vote: New Equipment Budget",
      subtitle: "My Band",
      date: "2024-01-20T23:59:59Z",
      allDay: true,
      bandId: "band_123",
      bandName: "My Band",
      bandSlug: "my-band",
      sourceUrl: "/bands/my-band/proposals/prop_456",
      metadata: {
        status: "OPEN",
        isOverdue: false
      }
    }
  ]
}
```

---

## Files to Create

| File | Description |
|------|-------------|
| `apps/api/src/server/routers/calendar/index.ts` | Router aggregation |
| `apps/api/src/server/routers/calendar/calendar.query.ts` | Calendar queries |
| `apps/web/src/app/calendar/page.tsx` | Unified user calendar |
| `apps/web/src/components/calendar/CalendarView.tsx` | Main calendar component |
| `apps/web/src/components/calendar/CalendarFilters.tsx` | Filter toggles |
| `apps/web/src/components/calendar/CalendarItemPopup.tsx` | Item details popup |

## Files to Modify

| File | Changes |
|------|---------|
| `apps/api/src/server/routers/_app.ts` | Add calendarRouter |
| `apps/web/src/components/ui/BandSidebar.tsx` | Events → Calendar |
| `apps/web/src/components/ui/BandLayout.tsx` | Events → Calendar in mobile nav |
| `apps/web/src/app/bands/[slug]/events/page.tsx` | Rename to calendar or redirect |

---

## Implementation Order

### Phase 1: Backend (Calendar API)
1. Create calendar router with `getCalendarItems`
2. Implement queries for each data source
3. Add RRULE parsing for recurring events
4. Add `getUpcomingDeadlines` for dashboard

### Phase 2: Frontend (Basic Calendar)
1. Install `react-big-calendar`
2. Create CalendarView component
3. Rename Events → Calendar in navigation
4. Move/rename route from `/events` to `/calendar`
5. Implement band-specific calendar page

### Phase 3: Unified Calendar
1. Create `/calendar` page (user-level)
2. Add band filter for multi-band users
3. Add filter toggles for item types

### Phase 4: Polish
1. Calendar item popup/details
2. Mobile responsive improvements
3. Agenda view for simple list
4. Dashboard widget for upcoming deadlines

---

## Migration Notes

- Keep event CRUD operations in existing `event.*` routers
- `/bands/[slug]/events/[eventId]` → `/bands/[slug]/calendar/[eventId]`
- `/bands/[slug]/events/create` → `/bands/[slug]/calendar/create`
- Old URLs should redirect to new ones

---

## Testing

1. Create events, proposals, projects, tasks with various dates
2. Verify all item types appear on calendar
3. Test date range filtering
4. Test recurring event expansion (verify 6-month cap)
5. Test filters (show/hide item types)
6. Test navigation from calendar item to source
7. Test with user in multiple bands
