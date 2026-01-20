import { router } from '../../trpc'
import { createEvent } from './event.create'
import { getEventsByBand, getUpcomingEvents, getEventById, getMyEvents } from './event.query'
import { updateEvent, cancelEvent, deleteEvent, createEventException } from './event.update'
import { setRSVP, removeRSVP, getRSVPs } from './event.rsvp'
import { markAttendance, getAttendance, bulkMarkAttendance, getMemberAttendanceHistory } from './event.attendance'
import { processEventReminders, getPendingReminders } from './event.cron'

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

  // RSVP
  setRSVP: setRSVP,
  removeRSVP: removeRSVP,
  getRSVPs: getRSVPs,

  // Attendance
  markAttendance: markAttendance,
  getAttendance: getAttendance,
  bulkMarkAttendance: bulkMarkAttendance,
  getMemberAttendanceHistory: getMemberAttendanceHistory,

  // Cron (for automated reminders)
  processReminders: processEventReminders,
  getPendingReminders: getPendingReminders,
})
