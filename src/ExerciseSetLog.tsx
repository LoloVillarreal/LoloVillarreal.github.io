import { useId, useRef, useState } from 'react'
import { Check, Copy, Plus } from 'lucide-react'
import type { Exercise } from './types'
import { parseDate } from './lib/dates'
import type { PreviousExerciseSets } from './lib/previous-exercise-sets'
import { MAX_SET_AMOUNT, MAX_SET_KG, MAX_SET_NUMBER, type SetEntry } from './lib/workout-sets'
import './exercise-set-log.css'

type Props = {
  exercise: Exercise
  sets: SetEntry[]
  previous?: PreviousExerciseSets
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

const historyDate = new Intl.DateTimeFormat('es-ES', {day:'numeric', month:'short', year:'numeric'})

function SetRow({ row, previous, showPrevious, unit, perSide, onChange, disabled }: {
  row: SetEntry
  previous?: SetEntry
  showPrevious: boolean
  unit: 'Repeticiones' | 'Segundos' | 'Metros'
  perSide?: boolean
  onChange: Props['onChange']
  disabled?: boolean
}) {
  const [copies, setCopies] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [copied, setCopied] = useState(false)
  const weight = previous?.kg !== undefined ? `${String(previous.kg).replace('.', ',')} kg` : ''
  const suffix = {Repeticiones:'reps', Segundos:'s', Metros:'m'}[unit]
  const amount = previous?.amount !== undefined ? `${previous.amount} ${suffix}${perSide ? ' por lado' : ''}` : ''

  function edit(next: SetEntry) {
    setCopied(false)
    setFeedback('')
    return onChange(next)
  }

  function copy() {
    if (!previous) return
    const next = {...row}
    if (previous.kg !== undefined) next.kg = previous.kg
    if (previous.amount !== undefined) next.amount = previous.amount
    if (onChange(next) === false) {
      setCopied(false)
      setFeedback('No se pudo copiar la serie.')
      return
    }
    setCopies(n => n + 1)
    setCopied(true)
    setFeedback(`Serie ${row.number} copiada.`)
  }

  return <tr data-set-number={row.number}>
    <th scope="row">{row.number}</th>
    <td><SetField key={weight ? copies : 0} label={`Peso en kg, serie ${row.number}`} value={row.kg} weight disabled={disabled}
      onChange={kg => edit({ ...row, kg })}/></td>
    <td><SetField key={amount ? copies : 0} label={`${unit}, serie ${row.number}`} value={row.amount} disabled={disabled}
      onChange={amount => edit({ ...row, amount })}/></td>
    {showPrevious && <td className="set-reference">
      {previous ? <button type="button" className="set-reference-copy" disabled={disabled} onClick={copy}
        aria-label={[`Copiar serie ${row.number}`, weight, amount].filter(Boolean).join(', ')}>
        {copied ? <Check size={15} aria-hidden="true"/> : <Copy size={15} aria-hidden="true"/>}
        <span>{weight && <span>{weight}</span>}{amount && <span>{amount}</span>}</span>
      </button> : <span className="set-reference-empty" aria-label="Sin serie anterior">—</span>}
      <span role="status" className={copied ? 'sr-only' : 'set-field-error'}>{feedback}</span>
    </td>}
  </tr>
}

export function ExerciseSetLog({ exercise, sets, previous, onChange, disabled }: Props) {
  const titleId = useId()
  const [addedRows, setAddedRows] = useState<number[]>([])
  const table = useRef<HTMLTableElement>(null)
  const unit = exercise.unit === 'seconds' ? 'Segundos' : exercise.unit === 'meters' ? 'Metros' : 'Repeticiones'
  const scheduled = Array.from({length: exercise.sets}, (_, index) => index + 1)
  const rows = [...new Set([...scheduled, ...addedRows, ...sets.map(set => set.number),
    ...(previous?.sets.map(set => set.number) ?? [])])].sort((a,b) => a-b)

  function addSet() {
    let number = 1
    while (rows.includes(number)) number++
    if (number > MAX_SET_NUMBER) return
    setAddedRows(current => [...current, number])
    requestAnimationFrame(() => table.current?.querySelector<HTMLInputElement>(`tr[data-set-number="${number}"] input`)?.focus())
  }

  return <section aria-labelledby={titleId} className={`exercise-set-log${previous ? ' has-previous-sets' : ''}`}>
    <div className="set-log-heading"><h3 id={titleId}>Mis series</h3>
      {previous && <p>Última vez · <time dateTime={previous.date}>{historyDate.format(parseDate(previous.date))}</time></p>}
    </div>
    <table ref={table} aria-labelledby={titleId}>
      <thead><tr><th scope="col">Serie</th><th scope="col">Peso (kg)</th><th scope="col">{unit === 'Repeticiones' && previous ? <abbr title="Repeticiones">Reps</abbr> : unit}{exercise.perSide && <small>por lado</small>}</th>{previous && <th scope="col">Copiar anterior</th>}</tr></thead>
      <tbody>{rows.map(number => {
        const row = sets.find(set => set.number === number) ?? { number }
        return <SetRow key={exercise.id + ':' + number} row={row} unit={unit} perSide={exercise.perSide}
          previous={previous?.sets.find(set => set.number === number)} showPrevious={!!previous}
          onChange={onChange} disabled={disabled}/>
      })}</tbody>
    </table>
    {rows.length < MAX_SET_NUMBER && <button type="button" className="text-button set-add" disabled={disabled} onClick={addSet}>
      <Plus size={16} aria-hidden="true"/>Añadir serie
    </button>}
  </section>
}
