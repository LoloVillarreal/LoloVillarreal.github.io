import { describe, expect, it } from 'vitest'
import { alternativeExercise } from './exercise-library'
import { planFromRoutine, workoutForDate } from './training-plan'
import { replaceForDate, samePlan } from './today-replacement'

const monday = '2026-11-09'
const name = 'Hip thrust en máquina'
const machine = alternativeExercise(name)!
const hip = 'hip-thrust'

describe('cambio del ejercicio de una fecha', () => {
  it('conserva el resto de la sesión y la pauta editada, y deja intacto el día original', () => {
    const saved = planFromRoutine(workoutForDate(monday))
    saved.exercises[0] = { ...saved.exercises[0], sets: 4, rest: 105 }
    saved.notes = 'Sesión de prueba'
    const next = replaceForDate(monday, saved, 0, hip, name)
    expect(next).toEqual({ ...saved, exercises: [{ ...saved.exercises[0], exerciseId: machine.id }, ...saved.exercises.slice(1)] })
    expect(saved.exercises[0].exerciseId).toBe(hip)
    expect(workoutForDate(monday, next).exercises[0].hevyId).toBe(machine.hevyId)
    expect(workoutForDate('2026-11-16').exercises[0].id).toBe(hip)
  })
  it('rechaza duplicados y una posición que ya se editó', () => {
    const saved = planFromRoutine(workoutForDate(monday))
    saved.exercises[1].exerciseId = machine.id
    expect(() => replaceForDate(monday, saved, 0, hip, name)).toThrow(/ya está/)
    expect(() => replaceForDate(monday, undefined, 1, hip, name)).toThrow(/cambiado/)
  })
  it('solo permite sustituciones verificadas y mantiene el miércoles de cardio', () => {
    expect(() => replaceForDate(monday, undefined, 0, hip, 'Abducción con banda')).toThrow()
    expect(() => replaceForDate('2026-11-11', undefined, 0, hip, name)).toThrow()
    expect(() => replaceForDate(monday, { type: 'invalid' }, 0, hip, name)).toThrow(/leer/)
  })
  it('acepta el plan devuelto por la nube aunque cambie el orden de sus campos y detecta otras ediciones antes de deshacer', () => {
    const next = replaceForDate(monday, undefined, 0, hip, name)
    const copy = { ...next, cardio: { minutes: next.cardio.minutes, activity: next.cardio.activity } }
    expect(samePlan(copy, next)).toBe(true)
    expect(samePlan({ ...copy, notes: 'Nueva nota' }, next)).toBe(false)
  })
})
