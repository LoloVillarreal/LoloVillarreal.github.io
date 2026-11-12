import { useId } from 'react'
import { CircleCheck, Clock3 } from 'lucide-react'
import type { Attendance } from './lib/attendance'
import type { PerformedExercise } from './lib/workout-sets'
import { parseDate } from './lib/dates'
import { formatSessionDuration } from './lib/guide-position'
import './workout-summary.css'

const summaryDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
const weightFormat = new Intl.NumberFormat('es-ES', { maximumSignificantDigits: 16 })
const units = { reps: 'reps', seconds: 's', meters: 'm' }

function LoggedSets({ exercise, name }: { exercise: PerformedExercise; name: string }) {
  return <dl className="summary-sets" aria-label={`Series anotadas de ${name}`}>
    {exercise.sets.map(set => <div key={set.number}>
      <dt>Serie {set.number}</dt>
      <dd>{[
        set.kg !== undefined && `${weightFormat.format(set.kg)} kg`,
        set.amount !== undefined && `${set.amount} ${units[exercise.unit]}${exercise.perSide?' por lado':''}`,
      ].filter(Boolean).join(' · ')}</dd>
    </div>)}
  </dl>
}

export function WorkoutSummary({ entry }: { entry: Attendance }) {
  const headingId = useId()
  const strength = entry.type === 'strength'
  const names = entry.exerciseNames

  return <section className="workout-summary" id={`workout-summary-${entry.date}`} tabIndex={-1} aria-labelledby={headingId}>
    <header>
      <h2 id={headingId}><CircleCheck size={16} aria-hidden="true"/>Resumen del entrenamiento</h2>
      <h3>{entry.title}</h3>
      <p><time dateTime={entry.date}>{summaryDate.format(parseDate(entry.date))}</time> · {strength ? 'Fuerza' : 'Cardio'}</p>
    </header>
    <dl className="summary-duration">
      <dt><Clock3 size={17} aria-hidden="true"/>Tiempo de entrenamiento</dt>
      <dd>{entry.durationSeconds === undefined
        ? 'Sin registrar'
        : <time dateTime={`PT${entry.durationSeconds}S`}>{formatSessionDuration(entry.durationSeconds)}</time>}
      </dd>
    </dl>
    <div>
      <h4>{strength ? 'Ejercicios de la rutina' : 'Actividad de cardio'}</h4>
      {names?.length
        ? strength
          ? <>
            {!entry.performedSets && <p className="summary-missing">Sin series anotadas.</p>}
            <ol>{names.map((name, index) => {
              const logged = entry.performedSets?.find(group => group.exerciseIndex === index)
              return <li key={index}><span>{name}</span>
                {logged?.replaced && <small className="summary-set-note">Sustituido durante la sesión</small>}
                {logged && <LoggedSets exercise={logged} name={name}/>}
                {entry.performedSets && !logged && <small className="summary-set-note">Sin series anotadas</small>}
              </li>
            })}</ol>
          </>
          : <p className="summary-activity">{names.join(', ')}</p>
        : <p className="summary-missing">{strength ? 'Ese día no se guardó la lista de ejercicios.' : 'Ese día no se guardó la actividad de cardio.'}</p>}
    </div>
  </section>
}
