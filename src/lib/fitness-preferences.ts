import { gymInventoryValid } from './gym-inventory'
import { hipGoalValid } from './hip-goal'

export const machineNoteKey = (exerciseId: string) => 'machineNote:' + exerciseId
export const machineNoteLimit = 240

export function fitnessPreferenceValid(key: string, value: unknown): boolean {
  if (key === 'gymInventory') return gymInventoryValid(value)
  if (key === 'hipGoal') return hipGoalValid(value)
  return /^machineNote:[A-Z0-9]{8}$/.test(key) && typeof value === 'string' &&
    value.trim().length > 0 && value.length <= machineNoteLimit
}

// JSON transport omits undefined fields; JSONB may return keys in another order.
export function samePreference(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  const left = Object.entries(a).filter(([,value])=>value!==undefined)
  return left.length === Object.values(b).filter(value=>value!==undefined).length && left.every(([key, value]) =>
    Object.prototype.hasOwnProperty.call(b, key) && samePreference(value, (b as Record<string, unknown>)[key]))
}
