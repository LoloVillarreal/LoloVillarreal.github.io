import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowLeft, Check, ChevronRight, Dumbbell, Leaf, Play } from 'lucide-react'
import { workoutDays } from './data/training'
import { useAccount } from './lib/account'
import { isoDate, parseDate } from './lib/dates'
import { planFromRoutine, trainingEntryValid, type TrainingPlan } from './lib/training-plan'
import { samePlan } from './lib/today-replacement'
import ExercisePhoto from './ExercisePhoto'
import { cardioLabel } from './lib/cardio-options'
import { exerciseImage } from './lib/exercise-library'
import { CardioPicker } from './CardioPicker'
import { TrainingPlanner } from './TrainingPlanner'

const noDirtyChange = () => {}
type DayChoiceProps = {
  date: string
  onBegin: () => void
  onSaved: (start: boolean) => void
  returnToRecord?: boolean
  previousPlan?: TrainingPlan
  onCancel?: () => void
  onDirtyChange?: (dirty: boolean) => void
}
export function DayChoice({date,onBegin,onSaved,onCancel,previousPlan,returnToRecord=false,onDirtyChange=noDirtyChange}:DayChoiceProps) {
  const account=useAccount()
  const [kind,setKind]=useState<TrainingPlan['type']>()
  const [routineDay,setRoutineDay]=useState<number>()
  const [activity,setActivity]=useState(''),[minutes,setMinutes]=useState('')
  const [preview,setPreview]=useState(false)
  const [custom,setCustom]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const previous=useRef(previousPlan)
  const heading=useRef<HTMLHeadingElement>(null)
  const startAfterSave=useRef(false)
  const sending=useRef(false),alive=useRef(true),written=useRef(false)
  const [online,setOnline]=useState(navigator.onLine)
  const weekday=parseDate(date).getDay(),key='training:'+date
  useEffect(()=>{
    alive.current=true
    const connectivity=()=>setOnline(navigator.onLine)
    window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity)
    return ()=>{alive.current=false;window.removeEventListener('online',connectivity);window.removeEventListener('offline',connectivity)}
  },[])
  useEffect(()=>{
    if(custom)return
    onDirtyChange(!!kind)
    return ()=>onDirtyChange(false)
  },[kind,custom,onDirtyChange])

  const strength=workoutDays.find(day=>day.day===routineDay && day.type==='strength')
  const duration=Number(minutes)
  const ready=kind==='recovery'||(kind==='strength'&&!!strength)||(kind==='cardio'&&!!activity&&Number.isInteger(duration)&&duration>=1&&duration<=180)
  function choose(next:TrainingPlan['type']) {
    onBegin()
    setPreview(false);setKind(next);setRoutineDay(undefined);setActivity('');setMinutes('');setError('')
    requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}))
  }
  async function save(start=false) {
    if(sending.current||!ready||!online||!account.complete)return
    let plan:TrainingPlan
    if(kind==='strength'&&strength)plan=planFromRoutine(strength)
    else if(kind==='cardio')plan={...planFromRoutine(workoutDays.find(day=>day.type==='cardio')!),title:cardioLabel(activity),cardio:{activity,minutes:duration}}
    else plan=planFromRoutine(workoutDays.find(day=>day.day===0)!)
    if(!trainingEntryValid(key,plan))return
    if(!written.current)startAfterSave.current=start
    sending.current=true;setBusy(true);setError('')
    try {
      await account.flush()
      if(!alive.current)return
      if(!written.current){
        account.set(key,(current:unknown)=>{
          const changed=previous.current?!samePlan(current,previous.current):current!==undefined
          if(changed)throw Error('La planificación ha cambiado. Vuelve a Inicio para consultar la elección guardada.')
          return plan
        })
        written.current=true
      }
      await account.flush()
      if(alive.current)onSaved(startAfterSave.current)
    } catch(e) {
      if(alive.current)setError(e instanceof Error?e.message:'No se pudo confirmar la elección. Reintenta con conexión.')
    } finally {
      sending.current=false
      if(alive.current)setBusy(false)
    }
  }
  if(custom)return <TrainingPlanner date={date} initial={{...planFromRoutine(workoutDays[0]),title:'Mi rutina',exercises:[]}}
    onDirtyChange={onDirtyChange} onCancel={()=>setCustom(false)} onSaved={onSaved}/>
  return <section className="card day-choice">
    <p className="day-date">{new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(parseDate(date))}</p>
    {kind&&<button type="button" className="choice-type-back" disabled={busy||written.current}
      onClick={()=>{setKind(undefined);setPreview(false);setError('');requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}))}}>
      <ArrowLeft size={16}/>Cambiar tipo de actividad
    </button>}
    <h2 tabIndex={-1} ref={heading}>{kind==='cardio'?'Prepara tu cardio':kind==='strength'?'¿Qué rutina quieres hacer?':kind==='recovery'?'Día de descanso':date===isoDate()?'¿Qué quieres hacer hoy?':'¿Qué quieres hacer este día?'}</h2>
    {!kind&&<>
      {weekday===3 && <p>Los miércoles son de recuperación. Puedes elegir fuerza en otra fecha.</p>}
      {weekday===5 && <p>Entrenar el viernes es opcional.</p>}
      <div className="choice-menu" role="group" aria-label="Tipo de actividad">
        {([
          ['strength','Fuerza','Elige una rutina o crea la tuya',Dumbbell],
          ['cardio','Cardio','Camina, corre o pedalea',Activity],
          ['recovery','Descanso','Reserva el día para recuperar',Leaf]
        ] as const).filter(([type])=>weekday!==3||type!=='strength').map(([type,label,description,Icon])=>
          <button type="button" key={type} className={'choice-menu-row choice-menu-'+type} aria-label={label}
            onClick={()=>choose(type)}>
            <span className="choice-menu-icon"><Icon size={22} aria-hidden="true"/></span>
            <span className="choice-menu-copy"><strong>{label}</strong><small>{description}</small></span>
            <ChevronRight size={17} aria-hidden="true"/>
          </button>
        )}
      </div>
    </>}
    {kind==='strength'&&<div className="day-choice-options" role="group" aria-label="Elige tu rutina">

      {workoutDays.filter(day=>day.type==='strength').map(day=><button key={day.day} disabled={busy||written.current}
        className="day-choice-option secondary" aria-pressed={routineDay===day.day} onClick={()=>{setRoutineDay(day.day);setPreview(false)}}><img src={exerciseImage(day.exercises[0])} width="40" height="40" loading="lazy" alt=""/><span>{day.title}<small>{day.exercises.length} ejercicios</small></span>{routineDay===day.day&&<Check size={17} aria-hidden="true"/>}</button>)}
      <button className="text-button" disabled={busy||written.current} onClick={()=>setCustom(true)}>Crear mi propia rutina</button>
    </div>}
    {kind==='cardio'&&<CardioPicker activity={activity} minutes={minutes} disabled={busy||written.current}
      onActivity={setActivity} onMinutes={setMinutes}/>}
    {kind==='recovery'&&<p>El descanso quedará en tu plan. Tus días entrenados se cuentan por separado.</p>}
    {!online&&<p className="small-note" role="status">Conéctate para guardar tu elección.</p>}
    {ready&&(kind==='strength'||((!online||preview)&&kind==='cardio'))&&<button type="button" className="text-button choice-preview-toggle" aria-expanded={preview} onClick={()=>setPreview(!preview)}>
      {preview?'Ocultar vista previa':!online?'Consultar esta guía sin guardar':`Ver los ${strength?.exercises.length} ejercicios`}<ChevronRight size={16} aria-hidden="true"/>
    </button>}
    {preview&&ready&&kind!=='recovery'&&<section className="day-choice-preview" aria-label="Guía temporal">
      <h3>{kind==='strength'?strength?.title:cardioLabel(activity)}</h3><p className="small-note">{!online?'Consulta temporal. Puedes guardar tu elección cuando vuelvas a tener conexión.':kind==='strength'?'Toca una foto para ver la técnica.':'Tu elección aún no está guardada.'}</p>
      {kind==='strength'?<div className="choice-preview-exercises">{strength?.exercises.map(exercise=><article key={exercise.id}>
        <ExercisePhoto exercise={exercise}/><div><strong>{exercise.name}</strong><small>{exercise.sets} series · {exercise.reps.join('–')} {exercise.unit==='seconds'?'s':'reps'}</small></div>
      </article>)}</div>:<p>{minutes} minutos de {cardioLabel(activity).toLocaleLowerCase('es')}.</p>}
    </section>}
    {kind&&ready&&<div className="choice-save-actions">
      {date===isoDate()&&kind!=='recovery'&&!returnToRecord&&online&&!written.current&&<button type="button" className="primary full" disabled={busy||!account.complete} onClick={()=>save(true)}>
        <Play size={17} aria-hidden="true"/>{busy?'Guardando…':'Guardar y empezar'}
      </button>}
      <button type="button" className={date===isoDate()&&kind!=='recovery'&&!returnToRecord&&online&&!written.current?'text-button':'primary full'} disabled={busy||!online||!account.complete}
        onClick={()=>save(false)}>{busy?'Guardando…':written.current?'Reintentar guardado':kind==='recovery'?'Guardar descanso':'Guardar mi elección'}</button>
    </div>}
    {!account.complete&&online&&!account.loading&&<button className="text-button" onClick={()=>account.refresh().catch(()=>setError('No se pudo cargar el plan. Reintenta con conexión.'))}>Cargar mis datos para elegir</button>}
    {(previous.current || returnToRecord) && !written.current && <button type="button" className="text-button day-choice-back" disabled={busy} onClick={onCancel}>Cancelar cambio</button>}
    {error&&<p role="alert" className="warning">{error}</p>}
  </section>
}
