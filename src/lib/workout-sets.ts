import type { Exercise } from '../types'
import { exerciseById } from './exercise-library'

export type SetEntry = { number: number; kg?: number; amount?: number }
export type SetLog = Record<string, SetEntry[]>
export type PerformedExercise = { exerciseIndex: number; hevyId?: string; unit: NonNullable<Exercise['unit']>; sets: SetEntry[]; replaced?: true; perSide?: true }
export const MAX_SET_NUMBER = 50
export const MAX_SET_KG = 9999
export const MAX_SET_AMOUNT = 99999
const maxLoggedExercises = 60

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function positiveInteger(value: unknown, maximum: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= maximum
}

function validExerciseId(id: string) {
  return exerciseById.has(id)
}

function validSet(value: unknown): value is SetEntry {
  if (!isRecord(value) || !positiveInteger(value.number, MAX_SET_NUMBER)) return false
  if (Object.keys(value).some(key => !['number', 'kg', 'amount'].includes(key))) return false
  if (value.kg !== undefined && !(typeof value.kg === 'number' && Number.isFinite(value.kg) && value.kg >= 0 && value.kg <= MAX_SET_KG)) return false
  return value.amount === undefined || positiveInteger(value.amount, MAX_SET_AMOUNT)
}

function validRows(value: unknown): value is SetEntry[] {
  return Array.isArray(value) && value.length > 0 && value.length <= MAX_SET_NUMBER &&
    value.every((row, i) => validSet(row) && (row.amount !== undefined || row.kg !== undefined) &&
      (!i || row.number > value[i - 1].number))
}

export function readSetLog(value: unknown): SetLog | undefined {
  if (!isRecord(value)) return
  const known: SetLog = {}
  let count = 0
  for (const [id, rows] of Object.entries(value)) {
    if (!validExerciseId(id) || !validRows(rows)) continue
    if (count === maxLoggedExercises) break
    known[id] = rows
    count++
  }
  return count ? known : undefined
}

export function replaceSet(log: SetLog | undefined, id: string, entry: SetEntry): SetLog | undefined | false {
  if (!validExerciseId(id) || !validSet(entry)) return false
  const previous = log?.[id] ?? []
  const before = previous.find(row => row.number === entry.number)
  if (before?.kg === entry.kg && before?.amount === entry.amount) return log
  const sets = previous.filter(row => row.number !== entry.number)
  if (entry.kg !== undefined || entry.amount !== undefined) {
    if (!previous.length && log && Object.keys(log).length >= maxLoggedExercises) return false
    sets.push({...entry})
    sets.sort((a, b) => a.number - b.number)
  }
  const next = {...log}
  if (sets.length) next[id] = sets
  else delete next[id]
  return Object.keys(next).length ? next : undefined
}

export function snapshotSets(exercises: Exercise[], draft?: SetLog) {
  const exerciseNames = exercises.map(exercise => exercise.name)
  const performedSets: PerformedExercise[] = []
  const log = readSetLog(draft)
  if (log) {
    const scheduled = new Set(exercises.map(exercise => exercise.id))
    exercises.forEach((exercise, exerciseIndex) => {
      const sets = log[exercise.id]
      if (sets) performedSets.push({exerciseIndex, hevyId: exercise.hevyId, unit: exercise.unit ?? 'reps', ...(exercise.perSide && {perSide:true}), sets: sets.map(row => ({...row}))})
    })
    for (const [id, sets] of Object.entries(log)) {
      if (scheduled.has(id)) continue
      const exercise = exerciseById.get(id)
      if (!exercise) continue
      const exerciseIndex = exerciseNames.length
      exerciseNames.push(exercise.name)
      performedSets.push({exerciseIndex, hevyId: exercise.hevyId, unit: exercise.unit ?? 'reps', ...(exercise.perSide && {perSide:true}), sets: sets.map(row => ({...row})), replaced: true})
    }
  }
  return {exerciseNames, ...(performedSets.length > 0 && {performedSets})}
}

export function validPerformedSets(value: unknown, namesLength: number): value is PerformedExercise[] {
  if (!Array.isArray(value) || !value.length || value.length > Math.min(namesLength, maxLoggedExercises)) return false
  const validGroups = value.every((item, i) => isRecord(item) && Object.keys(item).every(key => ['exerciseIndex', 'hevyId', 'unit', 'sets', 'replaced','perSide'].includes(key)) &&
    (!('hevyId' in item) || (typeof item.hevyId === 'string' && /^[A-Z0-9]{8}$/.test(item.hevyId))) &&
    (!('perSide' in item) || item.perSide === true) &&
    (!('replaced' in item) || item.replaced === true) &&
    typeof item.exerciseIndex === 'number' && Number.isInteger(item.exerciseIndex) &&
    item.exerciseIndex >= 0 && item.exerciseIndex < namesLength && (!i || item.exerciseIndex > value[i - 1].exerciseIndex) &&
    (item.unit === 'reps' || item.unit === 'seconds' || item.unit === 'meters') && validRows(item.sets))
  if (!validGroups) return false
  const replacedGroups = (value as PerformedExercise[]).filter(group => group.replaced)
  const plannedCount = namesLength - replacedGroups.length
  return plannedCount <= 30 && replacedGroups.every((group, i) => group.exerciseIndex === plannedCount + i)
}
