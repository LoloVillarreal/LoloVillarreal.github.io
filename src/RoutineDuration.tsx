import './training-duration.css'

export function RoutineDuration({ short, onChange, disabled = false }: {
  short: boolean; onChange: (short: boolean) => void; disabled?: boolean
}) {
  return <div className="routine-duration" role="group" aria-label="Duración de la rutina para este día">
    <button type="button" disabled={disabled} aria-pressed={!short} onClick={()=>onChange(false)}>Completa</button>
    <button type="button" disabled={disabled} aria-pressed={short} onClick={()=>onChange(true)}>Tengo 20 min</button>
  </div>
}
