import { useId, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Exercise } from './types'
import { MAX_SET_AMOUNT, MAX_SET_KG, MAX_SET_NUMBER, type SetEntry } from './lib/workout-sets'
import './exercise-set-log.css'

type Props = {
  exercise: Exercise
  sets: SetEntry[]
  onChange: (entry: SetEntry) => boolean | void
  disabled?: boolean
}

function SetField({ label, value, weight, disabled, onChange }: {
  label: string
  value?: number
  weight?: boolean
  disabled?: boolean
  onChange: (value: number | undefined) => boolean | void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState('')
  const messageId = useId()
  const display = value === undefined ? '' : String(value).replace('.', ',')
  function save(next: number | undefined) {
    setError(onChange(next) === false ? 'No se pudo guardar este cambio en el borrador.' : '')
  }

  function update(raw: string) {
    setDraft(raw)
    const text = raw.trim()
    if (!text) {
      save(undefined)
      return
    }
    const numeric = Number(text.replace(',', '.'))
    const valid = weight
      ? /^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text) && numeric <= MAX_SET_KG
      : /^\d+$/.test(text) && numeric >= 1 && numeric <= MAX_SET_AMOUNT
    if (!valid) {
      setError(weight ? `Usa un peso de 0 a ${MAX_SET_KG} kg. Este valor no se ha guardado.` : `Usa un entero de 1 a ${MAX_SET_AMOUNT}. Este valor no se ha guardado.`)
      return
    }
    save(numeric)
  }

  return <>
    <input type="text" inputMode={weight ? 'decimal' : 'numeric'} autoComplete="off" spellCheck={false}
      aria-label={label} aria-invalid={!!error || undefined} aria-describedby={error ? messageId : undefined}
      disabled={disabled} placeholder="—" value={draft ?? display}
      onChange={event => update(event.target.value)}
      onBlur={() => { if (!error) setDraft(null) }}/>
    {error && <small id={messageId} className="set-field-error">{error}</small>}
  </>
}

export function ExerciseSetLog({ exercise, sets, onChange, disabled }: Props) {
  const titleId = useId()
  const [extra, setExtra] = useState(0)
  const table = useRef<HTMLTableElement>(null)
  const unit = exercise.unit === 'seconds' ? 'Segundos' : exercise.unit === 'meters' ? 'Metros' : 'Repeticiones'
  const count = Math.max(exercise.sets, extra, ...sets.map(set => set.number))

  function addSet() {
    setExtra(count + 1)
    requestAnimationFrame(() => table.current?.rows[count + 1]?.querySelector('input')?.focus())
  }

  return <section aria-labelledby={titleId} className="exercise-set-log">
    <h3 id={titleId}>Mis series</h3>
    <table ref={table} aria-labelledby={titleId}>
      <thead><tr><th scope="col">Serie</th><th scope="col">Peso (kg)</th><th scope="col">{unit}{exercise.perSide && <small>por lado</small>}</th></tr></thead>
      <tbody>{Array.from({ length: count }, (_, index) => {
        const number = index + 1
        const row = sets.find(set => set.number === number) ?? { number }
        return <tr key={exercise.id + ':' + number}>
          <th scope="row">{number}</th>
          <td><SetField label={`Peso en kg, serie ${number}`} value={row.kg} weight disabled={disabled}
            onChange={kg => onChange({ ...row, kg })}/></td>
          <td><SetField label={`${unit}, serie ${number}`} value={row.amount} disabled={disabled}
            onChange={amount => onChange({ ...row, amount })}/></td>
        </tr>
      })}</tbody>
    </table>
    {count < MAX_SET_NUMBER && <button type="button" className="text-button set-add" disabled={disabled} onClick={addSet}>
      <Plus size={16} aria-hidden="true"/>Añadir serie
    </button>}
  </section>
}
