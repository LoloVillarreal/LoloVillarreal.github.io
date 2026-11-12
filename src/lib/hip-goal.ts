import type { ProgressLog } from '../types'
import { validDate } from './dates'

export type HipGoal = { kg: number; reps: number }

export function hipGoalValid(value: unknown): value is HipGoal {
  if (!value || typeof value !== 'object') return false
  const { kg, reps } = value as Partial<HipGoal>
  return Object.keys(value).length === 2 &&
    typeof kg === 'number' && Number.isFinite(kg) && kg >= 0 &&
    typeof reps === 'number' && Number.isSafeInteger(reps) && reps >= 1
}

export type HipMark = ProgressLog & { hipThrustKg: number }

export function hipMarksThrough(logs: ProgressLog[], today: string): HipMark[] {
  return logs.filter((log): log is HipMark =>
    validDate(log.date) && log.date <= today && typeof log.hipThrustKg === 'number' &&
    Number.isFinite(log.hipThrustKg) && log.hipThrustKg >= 0
  ).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}

export function goalComparison(goal: HipGoal, marks: HipMark[]) {
  const latest = marks[marks.length - 1]
  const atLoad = marks.filter(mark => mark.hipThrustKg >= goal.kg)
  const withReps = atLoad.filter(mark => Number.isSafeInteger(mark.hipThrustReps) && mark.hipThrustReps! > 0)
  const achieved = withReps.find(mark => mark.hipThrustReps! >= goal.reps)
  const bestReps = withReps.reduce((best, mark) => Math.max(best, mark.hipThrustReps!), 0)
  return { latest, achieved, reachedLoad: atLoad.length > 0, bestReps }
}
