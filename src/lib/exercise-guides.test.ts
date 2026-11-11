import { describe, expect, it } from 'vitest'
import { workoutDays } from '../data/training'
import { alternativeExercise, exerciseLibrary, matchesExercise } from './exercise-library'
import { guideByName } from './exercise-guides'
import { techniqueFor } from './exercise-technique'

describe('Alternativas de las rutinas', () => {
  it('resuelve cada alternativa a su ficha exacta o a una guía local con fuente', () => {
    const names = new Set(workoutDays.flatMap(day => day.exercises.flatMap(exercise => exercise.alternatives)))
    for (const name of names) {
      const guide = guideByName.get(name)
      expect(guide?.source).toMatch(/^https:\/\//)
      expect(guide?.instruction.length).toBeGreaterThan(40)
      const exercise = alternativeExercise(name)
      if (guide?.id) {
        expect(exercise?.hevyId).toBe(guide.id)
        expect(techniqueFor(exercise!).text).toBe(guide.instruction)
      } else {
        expect(exercise).toBeUndefined()
      }
    }
  })
  it('encuentra el mismo ID desde el alias español con o sin tilde y el nombre original', () => {
    const id = 'BE289E45'
    for (const query of ['elevación lateral en polea', 'polea elevacion', 'lateral raise cable']) {
      expect(exerciseLibrary.filter(e => matchesExercise(e,query)).map(e => e.hevyId)).toContain(id)
    }
  })
})
