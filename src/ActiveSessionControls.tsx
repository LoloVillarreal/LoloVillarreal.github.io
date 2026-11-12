import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Flag, Pause, Play, Timer } from 'lucide-react'
import { AttendanceControl } from './TrainingCalendar'
import { elapsedSeconds, formatSessionDuration, useElapsedSeconds, type SessionClock } from './lib/guide-position'
import type { WorkoutDay } from './types'
import './active-session.css'

export type SessionReview = 'finish' | 'discard' | null

type Props = {
  day: WorkoutDay
  date: string
  clock?: SessionClock
  review: SessionReview
  setReview: (review: SessionReview) => void
  pause: () => void
  resume: () => void
  minimize?: () => void
  continueWorkout?: () => void
  unavailable?: string
  discard: () => void
  onRegistered: () => void
  notify: (message: string) => void
  pendingSave: boolean
}

export function ActiveSessionControls({day,date,clock,review,setReview,pause,resume,minimize,continueWorkout,unavailable,discard,onRegistered,notify,pendingSave}:Props) {
  const seconds = useElapsedSeconds(clock)
  const paused = clock?.runningSince === null
  const state = paused ? 'Entrenamiento en pausa' : 'Entrenamiento en curso'
  const timerLabel = useId()
  const headingId = useId()
  const descriptionId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const stay = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement|null>(null)
  const [saving,setSaving] = useState(false)

  useEffect(() => {
    if (!review || !dialog.current) return
    const element = dialog.current
    const previous = opener.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    opener.current=null
    element.showModal()
    stay.current?.focus()
    return () => {
      element.close()
      if(previous?.isConnected)previous.focus({preventScroll:true})
    }
  }, [review])

  function stopClock() {
    const duration = elapsedSeconds(clock)
    if (clock && !paused) pause()
    return duration ?? undefined
  }

  return <section className="live-session-panel" aria-label="Estado del entrenamiento">
    <header>
      <strong className="live-session-state" data-paused={paused}><span aria-hidden="true"/>{state}</strong>
      {minimize&&<button type="button" className="live-minimize" onClick={minimize}><ChevronDown size={17} aria-hidden="true"/>Minimizar</button>}
    </header>
    <div className="live-session-time">
      <div><span id={timerLabel}><Timer size={15} aria-hidden="true"/>Tiempo de entrenamiento</span>
        <strong role="timer" aria-live="off" aria-labelledby={timerLabel} className={seconds===null?'unknown-time':undefined}>
          {seconds===null?'Sin medir':formatSessionDuration(seconds)}
        </strong>
      </div>
      {!(continueWorkout&&paused)&&<button type="button" className="secondary" onClick={paused||!clock?resume:pause}>
        {paused||!clock?<Play size={17} aria-hidden="true"/>:<Pause size={17} aria-hidden="true"/>}
        {paused?'Reanudar':!clock?'Iniciar cronómetro':'Pausar'}
      </button>}
    </div>
    {unavailable&&<p>{unavailable}</p>}
    {continueWorkout&&<button type="button" className="primary full live-session-return" onClick={()=>{if(paused)resume();continueWorkout()}}>
      <Play size={17} aria-hidden="true"/>{paused?'Reanudar entrenamiento':'Continuar entrenamiento'}
    </button>}
    <div className="live-session-actions">
      {!unavailable&&<button type="button" className={continueWorkout?'secondary':'primary'} aria-haspopup="dialog" onClick={e=>{opener.current=e.currentTarget;setReview('finish')}}><Flag size={16} aria-hidden="true"/>Finalizar</button>}
      <button type="button" className="live-discard" disabled={pendingSave} aria-haspopup="dialog" onClick={e=>{opener.current=e.currentTarget;setReview('discard')}}>Cancelar entrenamiento</button>
    </div>
    {review && <dialog ref={dialog} className="live-session-dialog" aria-labelledby={headingId} aria-describedby={descriptionId}
      onCancel={event=>{event.preventDefault();if(!saving)setReview(null)}}>
      <h2 id={headingId}>{review==='discard'?'¿Cancelar este entrenamiento?':'¿Finalizar entrenamiento?'}</h2>
      <p id={descriptionId}>{review==='discard'
        ?'Se descartará el tiempo de esta sesión y no contará como día entrenado. Tu rutina y tus registros anteriores se conservarán.'
        :'Al guardar, esta sesión contará como día entrenado en Progreso.'}</p>
      {review==='finish'&&<div className="live-review-summary"><strong>{day.title}</strong>
        {seconds!==null&&<span>Tiempo de entrenamiento <b>{formatSessionDuration(seconds)}</b></span>}</div>}
      <div className="live-review-actions">
        {review==='finish'&&<AttendanceControl date={date} day={day} notify={notify} finishGuide onRegistered={onRegistered}
          sessionReview={{stopClock,setBusy:setSaving}}/>}
        <button type="button" ref={stay} className={review==='discard'?'primary full':'secondary full'} disabled={saving} onClick={()=>setReview(null)}>
          {paused?'Volver a la sesión':'Seguir entrenando'}
        </button>
        {review==='discard'&&<button type="button" className="live-discard" disabled={pendingSave} onClick={discard}>Descartar sesión</button>}
      </div>
    </dialog>}
  </section>
}
