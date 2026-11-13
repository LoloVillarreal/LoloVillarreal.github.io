import type { Exercise } from '../types'
import { attendanceEntryValid } from './attendance'
import { validDate } from './dates'
import { allExercises } from './exercise-library'
import type { SetEntry } from './workout-sets'

export type PreviousExerciseSets = { date: string; sets: SetEntry[] }

// Older receipts only contain the displayed name. Several plan days can use the same Hevy template.
const legacyIds = new Map<string, string | null>()
for (const exercise of allExercises) {
  const previous = legacyIds.get(exercise.name)
  legacyIds.set(exercise.name, previous === undefined || previous === exercise.hevyId ? exercise.hevyId : null)
}

export function previousExerciseSets(
  confirmedValues: Record<string, unknown>,
  beforeDate: string,
  exercise: Exercise,
): PreviousExerciseSets | undefined {
  if (!validDate(beforeDate)) return
  const cutoff = 'attendance:' + beforeDate
  const keys = Object.keys(confirmedValues).filter(key => key.startsWith('attendance:') && key < cutoff)
  for (const key of keys.sort().reverse()) {
    const receipt = confirmedValues[key]
    if (!attendanceEntryValid(key, receipt) || !receipt.performedSets || !receipt.exerciseNames) continue
    const names = receipt.exerciseNames
    const matches = receipt.performedSets.filter(group => {
      const hevyId = group.hevyId ?? legacyIds.get(names[group.exerciseIndex])
      return hevyId === exercise.hevyId && group.unit === (exercise.unit ?? 'reps') &&
        Boolean(group.perSide) === Boolean(exercise.perSide)
    })
    if (matches.length === 1) return { date: receipt.date, sets: matches[0].sets }
  }
}
