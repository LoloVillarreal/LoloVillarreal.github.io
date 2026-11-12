import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Calculator } from 'lucide-react'
import './exercise-weight.css'

const WeightCalculator = createContext<ReactElement | null>(null)
export const ExerciseWeightProvider = WeightCalculator.Provider

export function ExerciseWeightButton({ exerciseName }: { exerciseName: string }) {
  const calculator = useContext(WeightCalculator)
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const exerciseId = useId()

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

  if (!calculator) return null
  return <>
    <button ref={trigger} type="button" className="exercise-weight-open" aria-haspopup="dialog" onClick={() => setOpen(true)}>
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
          {calculator}
        </div>
      </dialog>, document.body
    )}
  </>
}
