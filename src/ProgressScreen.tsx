import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronRight, Dumbbell, Heart, Ruler, Scale } from 'lucide-react'
import { AccountGate, useAccount, useCloudValue } from './lib/account'
import { attendanceFromValues, attendanceStats } from './lib/attendance'
import { hipThrustProgress, movingAverage } from './lib/calculations'
import { addDays, isoDate, mondayOf, parseDate, shortDate, validDate } from './lib/dates'
import { emptyProgress, progressDraft, progressEntry } from './lib/progress-entry'
import { hipMarksThrough } from './lib/hip-goal'
import { HipGoalPanel, MonthlyReport } from './ProgressMilestones'
import type { ProgressDraft, ProgressLog } from './types'

const ProgressChart = lazy(() => import('./ProgressChart'))
const chartLoading = <p role="status">Cargando gráfica…</p>
const fmt=(n:number)=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(n)
const markDate=(date:string)=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric'}).format(parseDate(date))
const energyLabels=['Muy baja','Baja','Normal','Buena','Mucha energía']
type Notify=(message:string)=>void
type Capture='weight'|'strength'|'measures'|'wellbeing'
const captures:[Capture,string][]=[['weight','Peso'],['strength','Hip thrust'],['measures','Medidas'],['wellbeing','Bienestar']]
const captureIcons={weight:Scale,strength:Dumbbell,measures:Ruler,wellbeing:Heart}
function draftCategory(draft:ProgressDraft,hide:boolean):Capture|null{
  if(draft.hipThrustKg||draft.hipThrustReps)return 'strength'
  if(!hide&&draft.weight)return 'weight'
  if(!hide&&(draft.waist||draft.hip))return 'measures'
  if(draft.energy!==''||draft.sleep||draft.notes)return 'wellbeing'
  return hide?null:'weight'
}
const hasDraft=(form:ProgressDraft)=>['weight','waist','hip','hipThrustKg','hipThrustReps','sleep','notes'].some(key=>String(form[key as keyof ProgressDraft]??'').trim())||form.energy!==''
function sameDraft(a:ProgressDraft,b:ProgressDraft) {
  return (Object.keys(b) as (keyof ProgressDraft)[]).every(key=>(a[key]??'')===(b[key]??''))
}
function Metric({label,value,sub}:{label:string;value:string;sub:string}){return <article className="metric"><p>{label}</p><strong>{value}</strong><small>{sub}</small></article>}

export function AttendanceSummary({compact=false,onTraining}:{compact?:boolean;onTraining?:()=>void}){
  const account=useAccount(),entries=attendanceFromValues(account.confirmedValues),today=isoDate()
  const stats=attendanceStats(entries,today),trainedDates=new Set(entries.map(entry=>entry.date))
  if(!account.session)return null
  if(account.loading)return <section className="card attendance-summary" role="status">Recuperando tus días entrenados…</section>
  return <section className={`card attendance-summary ${compact?'attendance-summary--compact':''}`} aria-label="Resumen de días entrenados">
    <div className="attendance-heading">
      <div>
        <h2>{compact?'Tu asistencia':'Días entrenados'}</h2>
        <p className="week-count"><strong>{stats.week}</strong> {stats.week===1?'día esta semana':'días esta semana'}</p>
      </div>
      {onTraining&&<button className="text-button" aria-label="Ver calendario de entrenamientos" onClick={()=>onTraining()}><CalendarDays size={17} aria-hidden="true"/>Calendario</button>}
    </div>
    <ol className="progress-week" aria-label="Asistencia de la semana">
      {['L','M','X','J','V','S','D'].map((letter,index)=>{
        const date=addDays(mondayOf(today),index),trained=date<=today&&trainedDates.has(date)
        const status=trained?'entrenado':date>today?'próximo':'sin registro'
        return <li key={date} data-trained={trained||undefined} aria-current={date===today?'date':undefined}
          aria-label={`${shortDate(date)}, ${status}`}><small aria-hidden="true">{letter}</small>
          <b aria-hidden="true">{parseDate(date).getDate()}</b><span aria-hidden="true">{trained?'✓':date<=today?'—':' '}</span></li>
      })}
    </ol>
    {!compact&&<details className="attendance-history">
      <summary>Últimas 8 semanas</summary>
      <p>{stats.month} {stats.month===1?'día':'días'} este mes · {stats.total} en total.</p>
      <ol className="frequency-chart" aria-label="Días entrenados por semana">{stats.weeks.map((week,index)=><li key={week.start} aria-label={`Semana del ${shortDate(week.start)}: ${week.count} días${index===7?', en curso':''}`}>
        <strong>{week.count}</strong><div className="frequency-track"><span style={{height:`${week.count/7*100}%`}}/></div>
        <small>{new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'numeric'}).format(parseDate(week.start))}</small>{index===7&&<small>Ahora</small>}
      </li>)}</ol>
      <p className="small-note">Últimos 28 días: <b>{stats.last28}</b> días entrenados · 28 días anteriores: <b>{stats.previous28}</b>.</p>
    </details>}
  </section>
}

type ProgressProps={hide:boolean;notify:Notify;onTraining:(date?:string)=>void;initialCapture?:'strength'}

export function ProgressScreen({hide,notify,onTraining,initialCapture}:ProgressProps){
  return <AccountGate><ProgressDashboard hide={hide} notify={notify} onTraining={onTraining} initialCapture={initialCapture}/></AccountGate>
}

function ProgressDashboard({hide,notify,onTraining,initialCapture}:ProgressProps){
  const account=useAccount()
  const logs=Object.entries(account.values).filter(([key])=>key.startsWith('progress:')).map(([,value])=>value as ProgressLog)
  const confirmedLogs=Object.entries(account.confirmedValues).filter(([key])=>key.startsWith('progress:')).map(([,value])=>value as ProgressLog)
  const confirmedMarks=hipMarksThrough(confirmedLogs,isoDate())
  const [form,setForm]=useCloudValue<ProgressDraft>('progressDraft',emptyProgress)
  const [goal,setGoal]=useCloudValue('personalGoal','')
  const [capture,setCapture]=useState<Capture|null>(hide?null:'weight'),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const [deleted,setDeleted]=useState<ProgressLog|null>(null)
  const formRef=useRef<HTMLElement>(null)
  const captureMenu=useRef<HTMLElement>(null)
  const launcher=useRef<HTMLElement|null>(null)
  const existing=logs.find(log=>log.id===form.id)
  const pendingDraft=existing?!sameDraft(form,progressDraft(existing)):Boolean(hasDraft(form))
  const weights=movingAverage(confirmedLogs),lastWeight=weights[weights.length-1],firstWeight=weights[0]
  const {history:strength,best,first,latest,gain}=hipThrustProgress(confirmedMarks)
  const [strengthExpanded,setStrengthExpanded]=useState(false)
  const [weightExpanded,setWeightExpanded]=useState(false)
  const latestOnDate=(date:string)=>[...logs].reverse().find(log=>log.date===date)
  const focusForm=()=>requestAnimationFrame(()=>{
    formRef.current?.focus({preventScroll:true})
    formRef.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})
  })
  const begin=(kind:Capture,trigger?:HTMLElement)=>{
    if(!pendingDraft){const previous=latestOnDate(isoDate());setForm(previous?progressDraft(previous):emptyProgress())}
    launcher.current=trigger??null
    setCapture(kind);setOpen(true);setMessage('');focusForm()
  }
  const closeForm=()=>{
    setOpen(false)
    requestAnimationFrame(()=>{
      const target=launcher.current?.isConnected?launcher.current:captureMenu.current?.querySelector<HTMLButtonElement>(`button[data-category="${capture}"]`)??captureMenu.current?.querySelector('button')
      target?.focus()
    })
  }
  const openedFromToday=useRef(false)
  useEffect(()=>{
    if(!initialCapture){openedFromToday.current=false;return}
    if(!openedFromToday.current&&!account.loading){
      openedFromToday.current=true
      begin(initialCapture)
    }
  },[initialCapture,account.loading])
  const edit=(log:ProgressLog,trigger:HTMLElement)=>{if(pendingDraft&&!confirm('Hay un borrador pendiente. ¿Quieres sustituirlo por este registro?'))return;const draft=progressDraft(log);launcher.current=trigger;setForm(draft);setCapture(draftCategory(draft,hide));setOpen(true);setMessage('');focusForm()}
  const changeDate=(date:string)=>{
    if(!validDate(date)||date===form.date)return
    if(pendingDraft&&!confirm('Al cambiar de fecha se cargará el registro de ese día. ¿Quieres dejar este borrador?'))return
    const previous=latestOnDate(date);setForm(previous?progressDraft(previous):emptyProgress(date));if(hide)setCapture(null);setMessage('')
  }
  const save=async()=>{
    let log:ProgressLog
    try{log=progressEntry(form)}catch(error){setMessage((error as Error).message);return}
    setBusy(true);setMessage('')
    try{
      await account.flush()
      if(!existing){const previous=latestOnDate(log.date);if(previous){setMessage('Ya hay un registro de esta fecha. Ábrelo desde el historial para completar sus datos.');return}log.id=`day-${log.date}`}
      const savedDraft={...form,id:log.id}
      if(form.id!==log.id)setForm(savedDraft)
      account.set(`progress:${log.id}`,log);await account.flush()
      setForm(previous=>sameDraft(previous,savedDraft)?emptyProgress():previous);await account.flush();closeForm();notify('Progreso guardado en tu cuenta.')
    }catch{setMessage('No se pudo confirmar el guardado. Conservamos tu borrador; reintenta con conexión.')}
    finally{setBusy(false)}
  }
  const setField=(key:keyof ProgressDraft,value:string)=>setForm(previous=>({...previous,[key]:value}))
  const weightDelta=lastWeight&&firstWeight?lastWeight.weight!-firstWeight.weight!:undefined
  return <>
    <AttendanceSummary onTraining={onTraining}/>
    {!open&&<section ref={captureMenu} className="card progress-capture" aria-labelledby="progress-capture-heading"><h2 id="progress-capture-heading">¿Qué quieres registrar?</h2>
      <div className="capture-options">{captures.map(([id,label])=>{
        const Icon=captureIcons[id]
        return <button className="secondary" key={id} data-category={id} disabled={busy} onClick={event=>begin(id,event.currentTarget)}><Icon size={18} aria-hidden="true"/>{label}</button>
      })}</div>
      {pendingDraft&&<button className="text-button draft-resume" onClick={event=>{launcher.current=event.currentTarget;setCapture(draftCategory(form,hide));setMessage('');setOpen(true);focusForm()}}>Continuar {existing?'edición':'borrador'} del {shortDate(form.date)}<ChevronRight size={16}/></button>}
    </section>}
    {open&&<section ref={formRef} tabIndex={-1} className="card progress-entry" aria-label="Registro de progreso"><div className="section-head"><h2>{existing?'Editar registro':'Nuevo registro'}</h2><button className="text-button" disabled={busy} onClick={closeForm}>Cerrar</button></div><p className="small-note">{existing?'Los demás datos de esta fecha se conservan.':'Elige los datos que quieras anotar para esta fecha.'}</p>
      <form onSubmit={event=>{event.preventDefault();void save()}}><fieldset className="progress-inputs" disabled={busy}>
        <label>Fecha del registro<input type="date" max={isoDate()} value={form.date} onChange={event=>changeDate(event.target.value)} required/></label>
        {hide&&<p className="small-note">Para ver o editar el peso o las medidas, selecciona su categoría.</p>}
        <div className="capture-tabs" role="group" aria-label="Dato que quieres registrar">{captures.map(([id,label])=><button type="button" key={id} aria-pressed={capture===id} onClick={()=>setCapture(id)}>{label}</button>)}</div>
        {capture==='weight'&&<fieldset><legend>Peso corporal</legend><label>Peso corporal (kg)<input inputMode="decimal" value={form.weight} onChange={e=>setField('weight',e.target.value)} placeholder="Por ejemplo, 54,5"/></label>{lastWeight&&!hide&&<p className="small-note">Último registrado: {fmt(lastWeight.weight!)} kg · {shortDate(lastWeight.date)}. No se rellena automáticamente.</p>}</fieldset>}
        {capture==='strength'&&<fieldset><legend>Hip thrust</legend><div className="form-grid"><label>Carga máxima hip thrust (kg)<input inputMode="decimal" value={form.hipThrustKg??''} onChange={e=>setField('hipThrustKg',e.target.value)} placeholder="Barra y discos"/></label><label>Repeticiones de esa serie<input inputMode="numeric" value={form.hipThrustReps??''} onChange={e=>setField('hipThrustReps',e.target.value)} placeholder="Opcional"/></label></div><p className="small-note">Carga externa total, incluida la barra. Compara la misma variante, recorrido y repeticiones.</p></fieldset>}
        {capture==='measures'&&<fieldset><legend>Medidas corporales</legend><div className="form-grid"><label>Cintura (cm)<input inputMode="decimal" value={form.waist} onChange={e=>setField('waist',e.target.value)} placeholder="Opcional"/></label><label>Cadera (cm)<input inputMode="decimal" value={form.hip} onChange={e=>setField('hip',e.target.value)} placeholder="Opcional"/></label></div></fieldset>}
        {capture==='wellbeing'&&<fieldset><legend>Cómo te has sentido</legend><p id="energy-help">¿Cómo te has sentido de energía hoy?</p><p className="small-note">Valora cómo te has sentido durante el día, de muy baja energía a mucha energía.</p><div className="energy-scale" role="group" aria-labelledby="energy-help">{energyLabels.map((label,index)=><button type="button" key={label} aria-pressed={form.energy===index+1} onClick={()=>setForm(previous=>({...previous,energy:previous.energy===index+1?'':index+1}))}><b>{index+1}</b><span>{label}</span></button>)}</div><p className="small-note">{form.energy===''?'Sin registrar · opcional':'Toca de nuevo tu selección para dejarla sin registrar.'}</p><label>Horas dormidas la noche anterior<input inputMode="decimal" value={form.sleep} onChange={e=>setField('sleep',e.target.value)} placeholder="Opcional, por ejemplo 7,5"/></label></fieldset>}
        <label>Nota (opcional)<textarea maxLength={2000} value={form.notes} onChange={e=>setField('notes',e.target.value)} placeholder="Algo que quieras recordar"/></label>
        {message&&<p className="warning" role="alert">{message}</p>}
        <button className="primary full" disabled={busy||account.saving||!navigator.onLine}>{busy?'Confirmando en tu cuenta…':existing?'Guardar cambios':'Guardar registro'}</button>
        {pendingDraft&&<button className="text-button account-switch" type="button" disabled={busy} onClick={()=>{if(confirm('¿Descartar este borrador? Los registros guardados se conservan.')){setForm(emptyProgress());closeForm()}}}>Descartar borrador</button>}
        <p className="small-note">{navigator.onLine?'Al cerrar, podrás continuar este borrador.':'Sin conexión. Vuelve a conectarte para guardar este registro.'}</p>
      </fieldset></form>
    </section>}
    <section className="card hip-thrust-card strength-snapshot" aria-labelledby="strength-heading">
      <h2 id="strength-heading">Hip thrust</h2>
      {best&&first&&latest?<>
        <p className="record-label">Tu carga máxima</p>
        <p className="strength-latest"><strong>{fmt(best.hipThrustKg!)} <small>kg</small></strong>
          {best.hipThrustReps!==undefined&&<span>× {best.hipThrustReps} reps</span>}
        </p>
        <time dateTime={best.date}>{markDate(best.date)}</time>
        {gain>0&&<p className="record-gain">+{fmt(gain)} kg desde tu primera marca</p>}
        {strength.length>1?<details onToggle={event=>setStrengthExpanded(event.currentTarget.open)}>
          <summary>Ver evolución del hip thrust</summary>
          <div className="strength-metrics">{([['Primera marca',first],['Última marca',latest]] as const).map(([label,log])=><Metric key={label} label={label} value={`${fmt(log.hipThrustKg!)} kg`} sub={`${markDate(log.date)}${log.hipThrustReps===undefined?'':' · '+log.hipThrustReps+' reps'}`}/>)}</div>
          {strengthExpanded&&<Suspense fallback={chartLoading}><ProgressChart kind="strength" points={strength.map(log=>({fecha:shortDate(log.date),carga:log.hipThrustKg}))}/></Suspense>}
          <p className="small-note">Compara marcas de la misma variante, recorrido y repeticiones.</p>
        </details>:<p className="small-note">Con tu próxima marca podrás comparar las dos sesiones.</p>}
      </>:<p className="progress-empty">Anota tu primera serie en «Hip thrust» para ver aquí tu carga máxima y su evolución.</p>}
      <HipGoalPanel key={account.session?.user.id} marks={confirmedMarks}/>
    </section>
    <MonthlyReport attendance={attendanceFromValues(account.confirmedValues)} marks={confirmedMarks} complete={account.complete} onDate={onTraining}/>
    <section className="card progress-overview"><h2>Peso corporal</h2>
      {hide?<p className="progress-empty">Has ocultado el peso y las medidas en Ajustes.</p>:lastWeight&&firstWeight?<>
        <div className="progress-key-metrics">
          <Metric label="Último peso" value={`${fmt(lastWeight.weight!)} kg`} sub={markDate(lastWeight.date)}/>
          {weights.length>1&&<Metric label="Cambio de peso" value={`${weightDelta!>0?'+':''}${fmt(weightDelta!)} kg`} sub={`Desde ${shortDate(firstWeight.date)}`}/>}
        </div>
        {weights.length>1?<details className="progress-weight" onToggle={event=>setWeightExpanded(event.currentTarget.open)}><summary>Ver tendencia de peso</summary>{weightExpanded&&<Suspense fallback={chartLoading}><ProgressChart kind="weight" points={weights.map(log=>({fecha:shortDate(log.date),peso:log.weight,media:+log.average.toFixed(2)}))}/></Suspense>}<p className="small-note">Peso registrado y media de los últimos 3 registros con peso.</p></details>:<p className="small-note">La tendencia aparece al registrar un segundo peso.</p>}
      </>:<p className="progress-empty">Cuando anotes tu peso, aquí verás cómo cambia con el tiempo.</p>}
    </section>
    <section className="card progress-history"><div className="section-head"><h2>Historial de progreso</h2><span className="status">{confirmedLogs.length}</span></div>{confirmedLogs.length===0&&<p className="empty">Tus registros aparecerán aquí por fecha. Podrás editarlos o eliminarlos.</p>}{[...confirmedLogs].sort((a,b)=>b.date.localeCompare(a.date)).map(log=><article className="history-entry" key={log.id}><div><strong>{new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric'}).format(parseDate(log.date))}</strong>{!hide&&(log.weight!==undefined||log.waist!==undefined||log.hip!==undefined)&&<p>{[log.weight===undefined?'':`Peso ${fmt(log.weight)} kg`,log.waist===undefined?'':`Cintura ${fmt(log.waist)} cm`,log.hip===undefined?'':`Cadera ${fmt(log.hip)} cm`].filter(Boolean).join(' · ')}</p>}{log.hipThrustKg!==undefined&&<p>Hip thrust: <b>{fmt(log.hipThrustKg)} kg{log.hipThrustReps?` × ${log.hipThrustReps}`:''}</b></p>}{(log.energy!==undefined||log.sleep!==undefined)&&<p>{[log.energy===undefined?'':`Energía del día: ${energyLabels[log.energy-1]??log.energy} (${log.energy}/5)`,log.sleep===undefined?'':`Sueño: ${fmt(log.sleep)} h`].filter(Boolean).join(' · ')}</p>}{hide&&(log.weight!==undefined||log.waist!==undefined||log.hip!==undefined)&&<p className="small-note">Peso y medidas ocultos</p>}{log.notes&&<p className="entry-notes">{log.notes}</p>}</div><div className="button-row"><button className="secondary" disabled={busy} onClick={event=>edit(log,event.currentTarget)}>Editar</button><button className="text-button" disabled={busy} onClick={async()=>{if(!confirm(`¿Eliminar el registro del ${shortDate(log.date)}? Se recalcularán sus gráficas y podrás deshacerlo.`))return;setBusy(true);try{await account.remove(`progress:${log.id}`);setDeleted(log);if(form.id===log.id){setForm(emptyProgress());setOpen(false)}notify('Registro eliminado. Puedes deshacerlo.')}catch{notify('No se pudo eliminar. Comprueba la conexión y reintenta.')}finally{setBusy(false)}}}>Eliminar</button></div></article>)}{deleted&&<div className="undo-strip"><span>Registro eliminado · {shortDate(deleted.date)}{logs.some(log=>log.date===deleted.date)&&' · Ya hay otro registro de esta fecha; revísalo antes de recuperar este.'}</span><button className="secondary" disabled={busy||logs.some(log=>log.date===deleted.date)} onClick={async()=>{setBusy(true);try{account.set(`progress:${deleted.id}`,deleted);await account.flush();setDeleted(null);notify('Registro recuperado.')}catch{notify('No se pudo recuperar. Reintenta con conexión.')}finally{setBusy(false)}}}>Deshacer</button></div>}</section>
    <section className="card progress-goal"><details><summary>Mi objetivo personal</summary><label>¿Qué te gustaría conseguir?<input maxLength={500} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="Por ejemplo, mejorar mi hip thrust con buena técnica"/></label><p className="small-note">Se guarda en tu cuenta. Puedes cambiarlo cuando quieras.</p></details></section>
  </>
}
