import type { Attendance } from './attendance'
import { attendanceEntryValid } from './attendance'
import { isoDate, mondayOf, parseDate } from './dates'
import type { HipMark } from './hip-goal'

export function moveMonth(month: string, offset: number) {
  const date = parseDate(month + '-01')
  date.setMonth(date.getMonth() + offset)
  return isoDate(date).slice(0, 7)
}

export function monthSummary(month: string, today: string, entries: Attendance[], marks: HipMark[]) {
  const dates = new Set(entries.filter(entry =>
    entry.date.startsWith(month + '-') && entry.date <= today && attendanceEntryValid('attendance:' + entry.date, entry)
  ).map(entry => entry.date))
  const weeks = new Set([...dates].map(date => mondayOf(date))).size
  const inMonth = marks.filter(mark => mark.date.startsWith(month + '-') && mark.date <= today)
  const best = inMonth.sort((a, b) => b.hipThrustKg - a.hipThrustKg ||
    (b.hipThrustReps ?? 0) - (a.hipThrustReps ?? 0) || b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0]
  return { days: dates.size, weeks, best, bestHasAttendance: !!best && dates.has(best.date) }
}
