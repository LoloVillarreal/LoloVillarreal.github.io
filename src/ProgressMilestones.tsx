import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAccount } from './lib/account'
import type { Attendance } from './lib/attendance'
import { isoDate, parseDate, shortDate } from './lib/dates'
import { goalComparison, hipGoalValid, type HipGoal, type HipMark } from './lib/hip-goal'
import { monthSummary, moveMonth } from './lib/progress-month'

const kg = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 }).format(value) + ' kg'
const labelSeries = (mark: HipMark) => kg(mark.hipThrustKg) +
  (mark.hipThrustReps === undefined ? '' : ' × ' + mark.hipThrustReps)
const sameGoal = (value: unknown, goal?: HipGoal) => value === undefined ? goal === undefined :
  hipGoalValid(value) && value.kg === goal?.kg && value.reps === goal.reps

export function HipGoalPanel({ marks }: { marks: HipMark[] }) {
  const account = useAccount()
  const stored = account.confirmedValues.hipGoal
  const goal = hipGoalValid(stored) ? stored : undefined
  const [draft, setDraft] = useState<{ kg: string; reps: string; original?: HipGoal } | null>(null)
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const opener = useRef<HTMLButtonElement>(null)
  const sending = useRef(false)
  const latest = marks[marks.length - 1]
  const comparison = goal && goalComparison(goal, marks)
  const canSave = account.complete && navigator.onLine && !busy && !account.saving

  function close() {
    setDraft(null)
    setSubmitted(false)
    setError('')
    requestAnimationFrame(() => opener.current?.focus({ preventScroll:true }))
  }

  async function change(action: 'save' | 'remove') {
    if (!draft || !canSave || sending.current) return
    const next = { kg: Number(draft.kg.trim().replace(',', '.')), reps: Number(draft.reps.trim()) }
    if (action === 'save' && (!/^\d+(?:[.,]\d+)?$/.test(draft.kg.trim()) || !/^\d+$/.test(draft.reps.trim()) || !hipGoalValid(next))) {
      setError('Escribe una carga de 0 kg o más y un número entero de repeticiones mayor que cero.')
      return
    }
    if (action === 'remove' && !window.confirm('¿Quitar la meta de hip thrust? Tus marcas guardadas se conservarán.')) return
    sending.current = true
    setBusy(true)
    setError('')
    try {
      await account.flush()
      if (action === 'remove') {
        if (!sameGoal(stored,draft.original)) throw Error('La meta ha cambiado. Cierra el editor y vuelve a abrirla.')
        await account.remove('hipGoal')
      } else if (!submitted && !sameGoal(stored,next)) {
        account.set('hipGoal', (previous: unknown) => {
          if (sameGoal(previous,next)) return previous
          if (!sameGoal(previous,draft.original)) throw Error('La meta ha cambiado. Cierra el editor y vuelve a abrirla.')
          return next
        })
        setSubmitted(true)
        await account.flush()
      }
      close()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo confirmar el cambio. Reintenta cuando tengas conexión.')
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  return <section className="hip-goal-panel" aria-labelledby="hip-goal-heading">
    <div className="milestone-header">
      <h3 id="hip-goal-heading">Mi meta de hip thrust</h3>
      {!draft && <button ref={opener} type="button" className="text-button" disabled={!account.complete} onClick={() => {
        setError('')
        setDraft({ kg:goal ? String(goal.kg).replace('.', ',') : '', reps:goal ? String(goal.reps) : '', original:goal })
      }}>{goal ? 'Editar meta' : 'Elegir meta'}</button>}
    </div>
    {!account.complete ? <p className="small-note">Carga tu cuenta para consultar la meta.</p> : goal && comparison ? <>
      <p className="hip-goal-value">{kg(goal.kg)} × {goal.reps} reps</p>
      {comparison.achieved ? <p className="goal-achieved">Alcanzada el {shortDate(comparison.achieved.date)} · {labelSeries(comparison.achieved)}</p> :
        comparison.bestReps > 0 ? <p>Tu mejor serie con al menos {kg(goal.kg)} es de {comparison.bestReps} {comparison.bestReps === 1 ? 'repetición' : 'repeticiones'}.</p> :
        comparison.reachedLoad ? <p>Ya registraste esa carga o más. Anota las repeticiones de la serie para compararla.</p> :
        !latest ? <p>Cuando anotes una serie, podrás compararla con tu meta.</p> : null}
      {latest && latest.id !== comparison.achieved?.id && <p className="small-note">Última marca · {shortDate(latest.date)} · {labelSeries(latest)}{latest.hipThrustReps === undefined ? ' · sin repeticiones anotadas' : ''}</p>}
    </> : !draft && <p className="small-note">Puedes elegir el peso y las repeticiones que te gustaría alcanzar.</p>}
    {draft && <form className="hip-goal-form" aria-busy={busy} onSubmit={event=>{ event.preventDefault(); void change('save') }}>
      <div className="form-grid">
        <label>Carga de la meta (kg)<input autoFocus inputMode="decimal" required disabled={busy||submitted} value={draft.kg} onChange={event=>setDraft({...draft,kg:event.target.value})}/></label>
        <label>Repeticiones de la meta<input inputMode="numeric" required disabled={busy||submitted} value={draft.reps} onChange={event=>setDraft({...draft,reps:event.target.value})}/></label>
      </div>
      <p className="small-note">Cuenta una serie con al menos esa carga y esas repeticiones. Compara la misma variante de hip thrust.</p>
      {error && <p role="alert" className="warning">{error}</p>}
      {!navigator.onLine && <p className="small-note">Necesitas conexión para guardar tu meta.</p>}
      <div className="button-row">
        <button type="submit" className="primary" disabled={!canSave}>{busy ? 'Confirmando…' : submitted ? 'Reintentar guardado' : 'Guardar meta'}</button>
        <button type="button" className="secondary" onClick={close} disabled={busy}>{submitted ? 'Cerrar' : 'Cancelar'}</button>
        {goal && !submitted && <button type="button" className="text-button" onClick={()=>void change('remove')} disabled={!canSave}>Quitar meta</button>}
      </div>
    </form>}
  </section>
}

export function MonthlyReport({ attendance, marks, complete, onDate }: {
  attendance: Attendance[]; marks: HipMark[]; complete: boolean; onDate: (date:string) => void
}) {
  const today = isoDate(), current = today.slice(0, 7)
  const [selected, setSelected] = useState<string | null>(null)
  const month = selected && selected < current ? selected : current
  const { days, weeks, best, bestHasAttendance } = monthSummary(month, today, attendance, marks)
  const monthLabel = new Intl.DateTimeFormat('es-ES', { month:'long', year:'numeric' }).format(parseDate(month + '-01'))
  return <section className="card progress-month" aria-labelledby="month-report-heading">
    <h2 id="month-report-heading">Tu mes en tres datos</h2>
    <div className="month-switch">
      <button type="button" className="icon-button" aria-label="Ver el mes anterior" onClick={()=>setSelected(moveMonth(month,-1))}><ChevronLeft aria-hidden="true"/></button>
      <strong aria-live="polite">{monthLabel}</strong>
      <button type="button" className="icon-button" aria-label="Ver el mes siguiente" disabled={month===current} onClick={()=>setSelected(moveMonth(month,1))}><ChevronRight aria-hidden="true"/></button>
    </div>
    {complete ? <>
      <dl className="month-activity"><div><dt>Días entrenados</dt><dd>{days}</dd></div><div><dt>Semanas con entreno</dt><dd>{weeks}</dd></div></dl>
      <div className="month-lift"><span>Mejor carga de hip thrust</span>
        {best ? <><button type="button" className="text-button" aria-label={'Ver el día de la marca del ' + shortDate(best.date) + ' en Entrenos'} onClick={()=>onDate(best.date)}>
          <strong>{labelSeries(best)}</strong><small>{shortDate(best.date)}</small><ChevronRight size={17} aria-hidden="true"/>
        </button>{!bestHasAttendance && <p className="small-note">Ese día tiene una marca de fuerza y sigue sin asistencia registrada.</p>}</> : <p className="small-note">Sin marca registrada este mes.</p>}
      </div>
    </> : <p className="small-note">Carga tu cuenta para ver los registros de este mes.</p>}
  </section>
}
