import { alternativeExercise, exerciseById } from './exercise-library'
import { planFromRoutine, plannedExercise, trainingEntryValid, workoutForDate, type TrainingPlan } from './training-plan'

export function replaceForDate(date: string, saved: unknown, index: number, sourceId: string, name: string): TrainingPlan {
  const key = `training:${date}`
  if (saved !== undefined && !trainingEntryValid(key, saved)) {
    throw new Error('No se pudo leer la rutina guardada. Vuelve a cargar antes de cambiarla.')
  }
  const plan = saved ?? planFromRoutine(workoutForDate(date))
  const slot = plan.exercises[index]
  const source = exerciseById.get(sourceId)
  const variant = alternativeExercise(name)
  if (!source || !variant || !source.alternatives.includes(name)) {
    throw new Error('Esta variante solo tiene guía de consulta.')
  }
  if (!slot || slot.exerciseId !== sourceId) throw new Error('La rutina ha cambiado. Vuelve a abrir el ejercicio.')
  if (plan.exercises.some((item, position) => position !== index && exerciseById.get(item.exerciseId)?.hevyId === variant.hevyId)) {
    throw new Error('Este ejercicio ya está en la rutina.')
  }
  const nextSlot = (source.unit ?? 'reps') === (variant.unit ?? 'reps')
    ? { ...slot, exerciseId: variant.id }
    : plannedExercise(variant)
  const result = { ...plan, exercises: plan.exercises.map((entry, position) => position === index ? nextSlot : entry) }
  if (!trainingEntryValid(key, result)) throw new Error('Este cambio no está disponible para la fecha seleccionada.')
  return result
}

export function samePlan(first: unknown, second: TrainingPlan) {
  if (!first || typeof first !== 'object') return false
  const plan = first as TrainingPlan
  return plan.title === second.title && plan.type === second.type && plan.notes === second.notes &&
    plan.cardio?.activity === second.cardio.activity && plan.cardio?.minutes === second.cardio.minutes &&
    Array.isArray(plan.exercises) && plan.exercises.length === second.exercises.length &&
    plan.exercises.every((row, i) => {
      const other = second.exercises[i]
      return row.exerciseId === other.exerciseId && row.sets === other.sets && row.rest === other.rest &&
        row.reps[0] === other.reps[0] && row.reps[1] === other.reps[1]
    })
}
