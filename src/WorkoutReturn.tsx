import { Activity, ChevronRight, Timer } from 'lucide-react'
import { useId } from 'react'
import { attendanceEntryValid } from './lib/attendance'
import { shortDate } from './lib/dates'
import { exerciseById, exerciseImage } from './lib/exercise-library'
import { formatSessionDuration, useElapsedSeconds, type GuidePosition } from './lib/guide-position'
import { trainingEntryValid } from './lib/training-plan'
import './workout-return.css'

export function pendingWorkout(reader: GuidePosition | null, values: Record<string, unknown>, today: string, confirmed = values) {
  if (!reader || reader.date > today) return null
  const { date } = reader
  const saved = values['training:' + date]
  if (!trainingEntryValid('training:' + date, saved) || saved.type === 'recovery') return null
  if (attendanceEntryValid('attendance:' + date, confirmed['attendance:' + date])) return null

  const index = Math.max(0, Math.min(reader.index, saved.exercises.length - 1))
  const exercise = exerciseById.get(saved.exercises[index]?.exerciseId)
  if (saved.type === 'strength' && !exercise) return null
  const step = exercise ? `Ejercicio ${index + 1} de ${saved.exercises.length}` : `Cardio · ${saved.cardio.minutes} min previstos`
  return {
    date, index, clock: reader.clock, routine: saved.title, title: exercise?.name ?? saved.title, image: exercise && exerciseImage(exercise),
    detail: date === today ? step : `${shortDate(date)} · ${step}`,
  }
}

export type PendingWorkout = NonNullable<ReturnType<typeof pendingWorkout>>

export function WorkoutReturn({ workout, typing = false, home = false, onResume }: {
  workout: PendingWorkout; typing?: boolean; home?: boolean; onResume: () => void
}) {
  const seconds = useElapsedSeconds(workout.clock)
  const paused = workout.clock?.runningSince === null
  const state = !workout.clock ? 'Sesión pendiente' : paused ? 'Entrenamiento en pausa' : 'Entrenamiento en curso'
  const action = paused ? 'Reanudar' : 'Continuar'
  const timeId = useId()
  return <section className={'workout-return'+(home?' workout-return--home':'')} data-typing={typing || undefined} aria-label={state}>
    <div className="workout-return-heading">
      <span className="workout-return-state"><i data-paused={paused || undefined} aria-hidden="true"/>{state}</span>
      {seconds !== null && <span id={timeId} className="workout-return-time" role="timer" aria-live="off">
        <Timer size={15} aria-hidden="true"/><span className="sr-only">Tiempo de entrenamiento </span>{formatSessionDuration(seconds)}
      </span>}
    </div>
    {home && workout.routine !== workout.title && <h2 className="workout-return-title">{workout.routine}</h2>}
    <button type="button" className="workout-return-open" aria-label={action+' entrenamiento · '+workout.title+' · '+workout.detail}
      aria-describedby={seconds === null ? undefined : timeId} onClick={onResume}>
      <span className="workout-return-art" aria-hidden="true">
        {workout.image ? <img src={workout.image} alt="" width="40" height="40" onError={event=>{
          const img=event.currentTarget
          if(!img.src.endsWith('/exercise-placeholder.svg'))img.src='./exercise-placeholder.svg'
        }}/> : <Activity size={20}/>}
      </span>
      <span className="workout-return-copy"><small>{workout.detail}</small><strong>{workout.title}</strong></span>
      <span className="workout-return-action">{action}<ChevronRight size={16} aria-hidden="true"/></span>
    </button>
  </section>
}
