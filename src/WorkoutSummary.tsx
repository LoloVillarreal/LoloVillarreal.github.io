import { useId } from 'react'
import { CircleCheck, Clock3 } from 'lucide-react'
import type { Attendance } from './lib/attendance'
import { parseDate } from './lib/dates'
import { formatSessionDuration } from './lib/guide-position'
import './workout-summary.css'

const summaryDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

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
          ? <ol>{names.map((name, index) => <li key={index}>{name}</li>)}</ol>
          : <p className="summary-activity">{names.join(', ')}</p>
        : <p className="summary-missing">{strength ? 'Ese día no se guardó la lista de ejercicios.' : 'Ese día no se guardó la actividad de cardio.'}</p>}
    </div>
  </section>
}
