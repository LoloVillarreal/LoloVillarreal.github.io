import type { WorkoutDay } from '../types'
import type { TrainingPlan } from './training-plan'

// Keep the main movement and a complementary one, with the plan's usual rest.
const shortExercises: Record<number, readonly string[]> = {
  1: ['hip-thrust', 'lying-curl'],
  2: ['pulldown', 'chest-press', 'plank'],
  4: ['leg-press', 'hip-thrust-thu'],
  5: ['kickback', 'cable-crunch-fri'],
}

export function twentyMinuteRoutine(day: WorkoutDay): WorkoutDay {
  const selected = shortExercises[day.day]
  if (day.type !== 'strength' || !selected) return day
  return {
    ...day,
    title: day.title + ' · 20 min',
    exercises: day.exercises.filter(exercise => selected.includes(exercise.id))
      .map(exercise => ({ ...exercise, sets: Math.min(2, exercise.sets) })),
  }
}

export function shortCustomPlan(plan: TrainingPlan): TrainingPlan {
  const suffix = ' · 20 min'
  const title = plan.title.trim().replace(/ · 20 min$/, '').slice(0,100 - suffix.length).trimEnd()
  return { ...plan, title: title + suffix,
    exercises: plan.exercises.slice(0,2).map(exercise=>({...exercise,sets:Math.min(2,exercise.sets)})) }
}
