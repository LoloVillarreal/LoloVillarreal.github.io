import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Calculator, ChevronRight } from 'lucide-react'
import type { ProgressLog } from './types'
import { parseDate } from './lib/dates'
import './exercise-weight.css'

type WeightTools={calculator:ReactElement; hipMark?:ProgressLog; prepareHip?:(load?:number)=>void}
const WeightCalculator = createContext<WeightTools | null>(null)
export const ExerciseWeightProvider = WeightCalculator.Provider

export function ExerciseWeightButton({ exerciseName, hevyId }: { exerciseName: string; hevyId: string }) {
  const tools = useContext(WeightCalculator)
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement|null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const exerciseId = useId()
  const lastMarkId = useId()

  useLayoutEffect(() => {
    const sheet = dialog.current
    if (!open || !sheet) return
    sheet.showModal()
    return () => { if (sheet.open) sheet.close() }
  }, [open])

  function returnToExercise() {
    dialog.current?.close()
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }

  if (!tools) return null
  const hip=hevyId==='D57C2EC7'
  const last=hip?tools.hipMark:undefined
  function openCalculator(button:HTMLButtonElement,load?:number) {
    trigger.current=button
    if(hip)tools?.prepareHip?.(load)
    setOpen(true)
  }
  return <>
    {last?.hipThrustKg!==undefined&&<button type="button" className="exercise-last-load" aria-label="Usar este peso"
      aria-describedby={lastMarkId} aria-haspopup="dialog" onClick={e=>openCalculator(e.currentTarget,last.hipThrustKg)}>
      <span className="last-load-copy" id={lastMarkId}><small>Última marca · <time dateTime={last.date}>{new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric'}).format(parseDate(last.date))}</time></small>
        <strong>{last.hipThrustKg.toLocaleString('es-ES')} kg{last.hipThrustReps!==undefined?` × ${last.hipThrustReps} reps`:''}</strong></span>
      <span className="last-load-action">Usar este peso<ChevronRight size={14} aria-hidden="true"/></span>
    </button>}
    <button type="button" className="exercise-weight-open" aria-haspopup="dialog" onClick={e=>openCalculator(e.currentTarget)}>
      <Calculator size={17} aria-hidden="true"/> Calcular peso
    </button>
    {open && createPortal(
      <dialog ref={dialog} className="exercise-weight-sheet" aria-labelledby={titleId} aria-describedby={exerciseId}
        onCancel={event => {
          event.stopPropagation()
          if (event.target !== event.currentTarget) return
          event.preventDefault()
          returnToExercise()
        }}>
        <header className="exercise-weight-toolbar">
          <button type="button" className="text-button" onClick={returnToExercise}><ArrowLeft size={17} aria-hidden="true"/>Volver al ejercicio</button>
          <h2 id={titleId}>Calcular peso</h2>
        </header>
        <div className="exercise-weight-body">
          <p className="exercise-weight-name" id={exerciseId}>{exerciseName}</p>
          {tools.calculator}
        </div>
      </dialog>, document.body
    )}
  </>
}
