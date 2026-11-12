import { Activity, Play } from 'lucide-react'
import { attendanceEntryValid } from './lib/attendance'
import { shortDate } from './lib/dates'
import { exerciseById, exerciseImage } from './lib/exercise-library'
import type { GuidePosition } from './lib/guide-position'
import { trainingEntryValid } from './lib/training-plan'
import './workout-return.css'

export function pendingWorkout(reader: GuidePosition | null, values: Record<string, unknown>, today: string) {
  if (!reader || reader.date > today) return null
  const { date } = reader
  const saved = values['training:' + date]
  if (!trainingEntryValid('training:' + date, saved) || saved.type === 'recovery') return null
  if (attendanceEntryValid('attendance:' + date, values['attendance:' + date])) return null

  const index = Math.max(0, Math.min(reader.index, saved.exercises.length - 1))
  const exercise = exerciseById.get(saved.exercises[index]?.exerciseId)
  if (saved.type === 'strength' && !exercise) return null
  const step = exercise ? `Ejercicio ${index + 1} de ${saved.exercises.length}` : `Cardio · ${saved.cardio.minutes} min previstos`
  return {
    date, index, title: exercise?.name ?? saved.title, image: exercise && exerciseImage(exercise),
    detail: date === today ? step : `${shortDate(date)} · ${step}`,
  }
}

type PendingWorkout = NonNullable<ReturnType<typeof pendingWorkout>>

export function WorkoutReturn({ workout, typing, onResume }: {
  workout: PendingWorkout; typing: boolean; onResume: () => void
}) {
  return <button type="button" className="workout-return" data-typing={typing || undefined}
    aria-label={`Volver al entrenamiento · ${workout.title} · ${workout.detail}`} onClick={onResume}>
    <span className="workout-return-art" aria-hidden="true">
      {workout.image ? <img src={workout.image} alt="" width="38" height="38"
        onError={event=>{
          const img=event.currentTarget
          if(!img.src.endsWith('/exercise-placeholder.svg'))img.src='./exercise-placeholder.svg'
        }}/> : <Activity size={19}/>}
    </span>
    <span className="workout-return-copy"><small>En curso · {workout.detail}</small><strong>{workout.title}</strong></span>
    <span className="workout-return-action"><Play size={13} aria-hidden="true"/>Volver</span>
  </button>
}
