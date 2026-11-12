import { expect, it } from 'vitest'
import { exerciseById } from '../lib/exercise-library'
import { hevyExport, workoutDays } from './training'

it('exporta las repeticiones, los segundos y los metros con la unidad de cada ejercicio', () => {
  const exercises = ['hip-thrust', 'plank', 'hevy-50C613D0'].map(id => exerciseById.get(id)!)
  const [hipThrust, plank, carry] = hevyExport([{ ...workoutDays[0], exercises }]).workouts[0].exercises

  expect(hipThrust).toEqual({ template_id: 'D57C2EC7', exercise_name: 'Hip Thrust (Barbell)', sets: 3, rep_range: [8, 12], rest_seconds: 150, rir: 2 })
  expect(plank).toEqual({ template_id: 'C6C9B8A0', exercise_name: 'Plank', sets: 2, duration_range_seconds: [30, 45], rest_seconds: 60, rir: 2 })
  expect(carry).toEqual({ template_id: '50C613D0', exercise_name: 'Farmers Walk', sets: 1, distance_range_meters: [10, 20], rest_seconds: 90, rir: 3 })
})
