import { router } from '../../trpc'
import { getCalendarItems, getUpcomingDeadlines } from './calendar.query'

export const calendarRouter = router({
  getCalendarItems,
  getUpcomingDeadlines,
})

export type { CalendarItem, CalendarItemType } from './calendar.query'
export { CALENDAR_COLORS } from './calendar.query'
