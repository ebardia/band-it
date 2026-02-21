import { router } from '../../trpc'
import { createEvent } from './event.create'
import { getEventsByBand, getUpcomingEvents, getEventById, getMyEvents } from './event.query'
import { updateEvent, cancelEvent, deleteEvent, createEventException } from './event.update'
import { updateEventNotes } from './event.notes'
import { setRSVP, removeRSVP, getRSVPs } from './event.rsvp'
import { markAttendance, getAttendance, bulkMarkAttendance, getMemberAttendanceHistory } from './event.attendance'
import { processEventReminders, getPendingReminders } from './event.cron'

// Split into sub-routers to avoid TypeScript "Type instantiation is excessively deep" error
const rsvpRouter = router({
  set: setRSVP,
  remove: removeRSVP,
  getAll: getRSVPs,
})

const attendanceRouter = router({
  mark: markAttendance,
  get: getAttendance,
  bulkMark: bulkMarkAttendance,
  getMemberHistory: getMemberAttendanceHistory,
})

export const eventRouter = router({
  // Create
  create: createEvent,

  // Read
  getByBand: getEventsByBand,
  getUpcoming: getUpcomingEvents,
  getById: getEventById,
  getMyEvents: getMyEvents,

  // Update
  update: updateEvent,
  cancel: cancelEvent,
  delete: deleteEvent,
  createException: createEventException,
  updateNotes: updateEventNotes,

  // RSVP (nested router)
  rsvp: rsvpRouter,

  // Attendance (nested router)
  attendance: attendanceRouter,

  // Cron (for automated reminders)
  processReminders: processEventReminders,
  getPendingReminders: getPendingReminders,
})
