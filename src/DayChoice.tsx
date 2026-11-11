import { useEffect, useRef, useState } from 'react'
import { Activity, Check, Dumbbell, Leaf } from 'lucide-react'
import { workoutDays } from './data/training'
import { useAccount } from './lib/account'
import { isoDate, parseDate } from './lib/dates'
import { cardioActivities, planFromRoutine, trainingEntryValid, type TrainingPlan } from './lib/training-plan'
import { samePlan } from './lib/today-replacement'
import ExercisePhoto from './ExercisePhoto'
import { TrainingPlanner } from './TrainingPlanner'

const noDirtyChange = () => {}
type DayChoiceProps = {
  date: string
  onBegin: () => void
  onSaved: (start: boolean) => void
  previousPlan?: TrainingPlan
  onCancel?: () => void
  onDirtyChange?: (dirty: boolean) => void
}
export function DayChoice({date,onBegin,onSaved,onCancel,previousPlan,onDirtyChange=noDirtyChange}:DayChoiceProps) {
  const account=useAccount()
  const [kind,setKind]=useState<TrainingPlan['type']>()
  const [routineDay,setRoutineDay]=useState<number>()
  const [activity,setActivity]=useState(''),[minutes,setMinutes]=useState('')
  const [preview,setPreview]=useState(false)
  const [custom,setCustom]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const previous=useRef(previousPlan)
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
  }
  async function save() {
    if(sending.current||!ready||!online||!account.complete)return
    let plan:TrainingPlan
    if(kind==='strength'&&strength)plan=planFromRoutine(strength)
    else if(kind==='cardio')plan={...planFromRoutine(workoutDays.find(day=>day.type==='cardio')!),title:activity,cardio:{activity,minutes:duration}}
    else plan=planFromRoutine(workoutDays.find(day=>day.day===0)!)
    if(!trainingEntryValid(key,plan))return
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
      if(alive.current)onSaved(false)
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
    <h2>{date===isoDate()?'¿Qué quieres hacer hoy?':'¿Qué quieres hacer este día?'}</h2>
    {weekday===3 && <p>Los miércoles puedes hacer cardio o descansar.</p>}
    {weekday===5 && <p>Entrenar el viernes es opcional.</p>}
    <div className="day-choice-types" role="group" aria-label="Tipo de actividad">
      {weekday!==3&&<button className="day-choice-type secondary" disabled={busy||written.current} aria-pressed={kind==='strength'} onClick={()=>choose('strength')}><Dumbbell size={20}/>Fuerza</button>}
      <button className="day-choice-type secondary" disabled={busy||written.current} aria-pressed={kind==='cardio'} onClick={()=>choose('cardio')}><Activity size={20}/>Cardio</button>
      <button className="day-choice-type secondary" disabled={busy||written.current} aria-pressed={kind==='recovery'} onClick={()=>choose('recovery')}><Leaf size={20}/>Descanso</button>
    </div>
    {kind==='strength'&&<div className="day-choice-options" role="group" aria-label="Elige tu rutina">
      <h3>Elige tu rutina</h3>
      {workoutDays.filter(day=>day.type==='strength').map(day=><button key={day.day} disabled={busy||written.current}
        className="day-choice-option secondary" aria-pressed={routineDay===day.day} onClick={()=>setRoutineDay(day.day)}><span>{day.title}</span><small>{day.exercises.length} ejercicios</small></button>)}
      <button className="text-button" disabled={busy||written.current} onClick={()=>setCustom(true)}>Crear mi propia rutina</button>
    </div>}
    {kind==='cardio'&&<div className="day-choice-options">
      <label>Actividad<select aria-label="Actividad" disabled={busy||written.current} value={activity} onChange={e=>setActivity(e.target.value)}>
        <option value="">Elige la actividad</option>
        {cardioActivities.map(value=><option key={value}>{value}</option>)}
      </select></label>
      <label>Duración en minutos<input type="number" inputMode="numeric" min="1" max="180" disabled={busy||written.current} value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>
    </div>}
    {kind==='recovery'&&<p>El descanso quedará en tu plan. Tus días entrenados se cuentan por separado.</p>}
    {kind&&<button className="primary day-choice-confirm full" disabled={!ready||busy||!online||!account.complete}
      onClick={save}><Check size={17}/>{busy?'Guardando…':written.current?'Reintentar guardado':kind==='recovery'?'Guardar descanso':'Guardar mi elección'}</button>}
    {!online&&<p className="small-note" role="status">Conéctate para guardar tu elección.</p>}
    {!online&&ready&&kind!=='recovery'&&!preview&&<button className="secondary full" onClick={()=>setPreview(true)}>Consultar esta guía sin guardar</button>}
    {preview&&ready&&kind!=='recovery'&&<section className="day-choice-preview" aria-label="Guía temporal">
      <h3>{kind==='strength'?strength?.title:activity}</h3><p className="small-note">Consulta temporal. Puedes guardar tu elección cuando vuelvas a tener conexión.</p>
      {kind==='strength'?<div className="tools-exercises">{strength?.exercises.map(exercise=><article key={exercise.id}>
        <ExercisePhoto exercise={exercise}/><div><strong>{exercise.name}</strong><small>{exercise.sets} series · {exercise.reps.join('–')} {exercise.unit==='seconds'?'s':'reps'}</small></div>
      </article>)}</div>:<p>{minutes} minutos de {activity.toLocaleLowerCase('es')}.</p>}
      <button className="text-button" onClick={()=>setPreview(false)}>Cerrar la guía</button>
    </section>}
    {!account.complete&&online&&!account.loading&&<button className="text-button" onClick={()=>account.refresh().catch(()=>setError('No se pudo cargar el plan. Reintenta con conexión.'))}>Cargar mis datos para elegir</button>}
    {previous.current && !written.current && <button type="button" className="text-button day-choice-back" disabled={busy} onClick={onCancel}>Cancelar cambio</button>}
    {error&&<p role="alert" className="warning">{error}</p>}
  </section>
}
