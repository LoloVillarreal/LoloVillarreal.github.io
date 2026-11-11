import { useId, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'
import { twelveWeekPlan } from './data/training'
import { useStored } from './lib/storage'
import './week-plan.css'

export function WeekPlan() {
  const [week,setWeek] = useStored('guideWeek',1)
  const [viewed,setViewed] = useState(week)
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const titleId = useId()
  const phase = twelveWeekPlan.find(({weeks}) => {
    const [first,last=first] = weeks.split('–').map(Number)
    return viewed>=first && viewed<=last
  }) ?? twelveWeekPlan[0]

  function open() {
    setViewed(week)
    dialog.current?.showModal()
    heading.current?.focus({preventScroll:true})
  }
  function close() { dialog.current?.close() }

  return <>
    <button ref={trigger} type="button" className="week-plan-link" onClick={open} aria-haspopup="dialog">
      <span><strong>Ver plan de 12 semanas</strong><small>Ahora sigues la semana {week}</small></span><ChevronRight size={18} aria-hidden="true"/>
    </button>
    <dialog className="week-plan-dialog" ref={dialog} aria-labelledby={titleId} onClose={()=>trigger.current?.focus({preventScroll:true})}>
      <button type="button" className="text-button week-plan-back" onClick={close}><ArrowLeft size={16}/>Volver a Inicio</button>
      <h2 ref={heading} tabIndex={-1} id={titleId}>Plan de 12 semanas</h2>
      <p className="week-plan-label">Toca una semana para ver su objetivo.</p>
      <div role="group" aria-label="Semanas del plan" className="week-plan-grid">
        {Array.from({length:12},(_,i)=>i+1).map(n=><button key={n} type="button" aria-label={`Semana ${n}${n===week?', actual':''}`}
          aria-pressed={viewed===n} onClick={()=>setViewed(n)}>{n}{n===week&&<Check size={12} aria-hidden="true"/>}</button>)}
      </div>
      <section className="week-plan-phase" aria-live="polite">
        <small>{phase.weeks.includes('–')?'Semanas':'Semana'} {phase.weeks}</small>
        <h3>{phase.name}</h3>
        <p>{phase.guidance.replace('deja 2–3 RIR','termina cada serie sintiendo que podrías hacer 2 o 3 repeticiones más').replace('con el RIR previsto','con las repeticiones en reserva previstas')}</p>
      </section>
      {viewed===week ? <p className="week-plan-current"><Check size={16}/>Esta es tu semana actual</p> :
        <button type="button" className="primary full" onClick={()=>{setWeek(viewed);close()}}>Seguir la semana {viewed}</button>}
    </dialog>
  </>
}
