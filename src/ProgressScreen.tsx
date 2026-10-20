import { useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, ChevronRight, Plus, TrendingUp } from 'lucide-react'
import { AccountGate, useAccount, useCloudValue } from './lib/account'
import { attendanceFromValues, attendanceStats } from './lib/attendance'
import { hipThrustProgress, movingAverage } from './lib/calculations'
import { addDays, isoDate, parseDate, shortDate, validDate } from './lib/dates'
import { emptyProgress, progressDraft, progressEntry } from './lib/progress-entry'
import type { ProgressDraft, ProgressLog } from './types'

const fmt=(n:number)=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(n)
const energyLabels=['Muy baja','Baja','Normal','Buena','Mucha energía']
type Notify=(message:string)=>void
type Capture='weight'|'strength'|'measures'|'wellbeing'
const captures:[Capture,string][]=[['weight','Peso'],['strength','Hip thrust'],['measures','Medidas'],['wellbeing','Bienestar']]
const hasDraft=(form:ProgressDraft)=>['weight','waist','hip','hipThrustKg','hipThrustReps','sleep','notes'].some(key=>String(form[key as keyof ProgressDraft]??'').trim())||form.energy!==''
function Metric({label,value,sub}:{label:string;value:string;sub:string}){return <article className="metric"><p>{label}</p><strong>{value}</strong><small>{sub}</small></article>}

export function AttendanceSummary({compact=false,onTraining}:{compact?:boolean;onTraining?:()=>void}){
  const account=useAccount(),stats=attendanceStats(attendanceFromValues(account.values))
  if(!account.session)return null
  if(account.loading)return <section className="card attendance-summary" role="status">Recuperando tus días entrenados…</section>
  return <section className={`card attendance-summary ${compact?'attendance-summary--compact':''}`} aria-label="Resumen de días entrenados">
    <div className="section-head"><div><p className="eyebrow"><CalendarDays size={15}/> TU CONSTANCIA</p><h2>{compact?'Cada día cuenta':'Así vas entrenando'}</h2></div>{onTraining&&<button className="text-button" onClick={onTraining}>Ver calendario<ChevronRight size={16}/></button>}</div>
    <div className="attendance-metrics"><Metric label="Esta semana" value={String(stats.week)} sub="días · lunes a domingo"/><Metric label="Este mes" value={String(stats.month)} sub="días entrenados"/><Metric label="En total" value={String(stats.total)} sub="días registrados"/></div>
    {!compact&&<><div className="section-head frequency-heading"><h3>Últimas 8 semanas</h3><span className="small-note">La actual está en curso</span></div><ol className="frequency-chart" aria-label="Días entrenados por semana">{stats.weeks.map((week,index)=><li key={week.start} aria-label={`Semana del ${shortDate(week.start)}: ${week.count} días${index===7?', en curso':''}`}><strong>{week.count}</strong><div className="frequency-track"><span style={{height:`${week.count/7*100}%`}}/></div><small>{new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'numeric'}).format(parseDate(week.start))}</small>{index===7&&<small>Ahora</small>}</li>)}</ol><p className="small-note">Últimos 28 días: <b>{stats.last28}</b> días entrenados · 28 días anteriores: <b>{stats.previous28}</b>.</p></>}
    <p className="small-note">{stats.total===0?'Marca tu primer día entrenado en el calendario para empezar.':'Cada fecha cuenta una vez, tanto si haces fuerza como cardio.'} Los días solo planificados no se suman.</p>
  </section>
}

export function ProgressScreen({hide,notify,onTraining}:{hide:boolean;notify:Notify;onTraining:()=>void}){
  return <AccountGate><ProgressDashboard hide={hide} notify={notify} onTraining={onTraining}/></AccountGate>
}

function ProgressDashboard({hide,notify,onTraining}:{hide:boolean;notify:Notify;onTraining:()=>void}){
  const account=useAccount()
  const logs=Object.entries(account.values).filter(([key])=>key.startsWith('progress:')).map(([,value])=>value as ProgressLog)
  const [form,setForm]=useCloudValue<ProgressDraft>('progressDraft',emptyProgress)
  const [goal,setGoal]=useCloudValue('personalGoal','')
  const [capture,setCapture]=useState<Capture>('weight'),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const [deleted,setDeleted]=useState<ProgressLog|null>(null)
  const formRef=useRef<HTMLElement>(null)
  const existing=logs.find(log=>log.id===form.id)
  const weights=movingAverage(logs),lastWeight=weights[weights.length-1],firstWeight=weights[0]
  const {history:strength,best,first,gain}=hipThrustProgress(logs)
  const latestOnDate=(date:string)=>[...logs].reverse().find(log=>log.date===date)
  const focusForm=()=>requestAnimationFrame(()=>formRef.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}))
  const begin=(kind:Capture)=>{
    if(!hasDraft(form)){const previous=latestOnDate(isoDate());setForm(previous?progressDraft(previous):emptyProgress())}
    setCapture(kind);setOpen(true);setMessage('');focusForm()
  }
  const edit=(log:ProgressLog)=>{if(hasDraft(form)&&(!existing||JSON.stringify(form)!==JSON.stringify(progressDraft(existing)))&&!confirm('Hay un borrador pendiente. ¿Quieres sustituirlo por este registro?'))return;setForm(progressDraft(log));setOpen(true);setMessage('');focusForm()}
  const changeDate=(date:string)=>{
    if(!validDate(date)||date===form.date)return
    if(hasDraft(form)&&!confirm('Al cambiar de fecha se cargará el registro de ese día. ¿Quieres dejar este borrador?'))return
    const previous=latestOnDate(date);setForm(previous?progressDraft(previous):emptyProgress(date));setMessage('')
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
      setForm(previous=>JSON.stringify(previous)===JSON.stringify(savedDraft)?emptyProgress():previous);await account.flush();setOpen(false);notify('Progreso guardado en tu cuenta.')
    }catch{setMessage('No se pudo confirmar el guardado. Conservamos tu borrador; reintenta con conexión.')}
    finally{setBusy(false)}
  }
  const setField=(key:keyof ProgressDraft,value:string)=>setForm(previous=>({...previous,[key]:value}))
  const weightDelta=lastWeight&&firstWeight?lastWeight.weight!-firstWeight.weight!:undefined
  return <>
    <AttendanceSummary onTraining={onTraining}/>
    <section className="card progress-capture"><div className="section-head"><div><p className="eyebrow">UN DATO, UN PEQUEÑO PASO</p><h2>Añadir progreso</h2></div><Plus size={24}/></div><p>Elige qué quieres guardar. Basta con un dato.</p><div className="capture-options">{captures.map(([id,label])=><button className="secondary" key={id} disabled={busy} onClick={()=>begin(id)}>{label}<Plus size={16}/></button>)}</div>{hasDraft(form)&&!open&&<button className="text-button draft-resume" onClick={()=>{setOpen(true);focusForm()}}>Continuar {existing?'edición':'borrador'} del {shortDate(form.date)}<ChevronRight size={16}/></button>}</section>
    {open&&<section ref={formRef} className="card progress-entry" aria-label="Registro de progreso"><div className="section-head"><div><p className="eyebrow">{existing?'COMPLETAR O CORREGIR':'GUARDAR UN DATO'}</p><h2>{existing?'Editar registro':'Nuevo registro'}</h2></div><button className="text-button" disabled={busy} onClick={()=>setOpen(false)}>Cerrar</button></div><p className="small-note">{existing?'Los datos de esta fecha están cargados; puedes completarlos sin crear otra entrada.':'Peso, fuerza, medidas y bienestar son opcionales. Los campos vacíos se quedan sin registrar.'}</p>
      <form onSubmit={event=>{event.preventDefault();void save()}}><fieldset className="progress-inputs" disabled={busy}>
        <label>Fecha del registro<input type="date" max={isoDate()} value={form.date} onChange={event=>changeDate(event.target.value)} required/></label>
        <div className="capture-tabs" role="group" aria-label="Dato que quieres registrar">{captures.map(([id,label])=><button type="button" key={id} aria-pressed={capture===id} onClick={()=>setCapture(id)}>{label}</button>)}</div>
        {(capture==='weight'||!!form.weight)&&<fieldset><legend>Peso corporal</legend><label>Peso corporal (kg)<input inputMode="decimal" value={form.weight} onChange={e=>setField('weight',e.target.value)} placeholder="Por ejemplo, 54,5"/></label>{lastWeight&&!hide&&<p className="small-note">Último registrado: {fmt(lastWeight.weight!)} kg · {shortDate(lastWeight.date)}. No se rellena automáticamente.</p>}</fieldset>}
        {(capture==='strength'||!!form.hipThrustKg||!!form.hipThrustReps)&&<fieldset><legend>Hip thrust</legend><div className="form-grid"><label>Carga máxima hip thrust (kg)<input inputMode="decimal" value={form.hipThrustKg??''} onChange={e=>setField('hipThrustKg',e.target.value)} placeholder="Barra y discos"/></label><label>Repeticiones de esa serie<input inputMode="numeric" value={form.hipThrustReps??''} onChange={e=>setField('hipThrustReps',e.target.value)} placeholder="Opcional"/></label></div><p className="small-note">Carga externa total, incluida la barra. Compara la misma variante, recorrido y repeticiones.</p></fieldset>}
        {(capture==='measures'||!!form.waist||!!form.hip)&&<fieldset><legend>Medidas corporales</legend><div className="form-grid"><label>Cintura (cm)<input inputMode="decimal" value={form.waist} onChange={e=>setField('waist',e.target.value)} placeholder="Opcional"/></label><label>Cadera (cm)<input inputMode="decimal" value={form.hip} onChange={e=>setField('hip',e.target.value)} placeholder="Opcional"/></label></div></fieldset>}
        {(capture==='wellbeing'||form.energy!==''||!!form.sleep)&&<fieldset><legend>Cómo te has sentido</legend><p id="energy-help">¿Cómo te has sentido de energía hoy?</p><p className="small-note">Tu sensación general durante el día, no las calorías que has gastado ni la energía que queda después de entrenar.</p><div className="energy-scale" role="group" aria-labelledby="energy-help">{energyLabels.map((label,index)=><button type="button" key={label} aria-pressed={form.energy===index+1} onClick={()=>setForm(previous=>({...previous,energy:previous.energy===index+1?'':index+1}))}><b>{index+1}</b><span>{label}</span></button>)}</div><p className="small-note">{form.energy===''?'Sin registrar · opcional':'Toca de nuevo tu selección para dejarla sin registrar.'}</p><label>Horas dormidas la noche anterior<input inputMode="decimal" value={form.sleep} onChange={e=>setField('sleep',e.target.value)} placeholder="Opcional, por ejemplo 7,5"/></label></fieldset>}
        <label>Nota (opcional)<textarea maxLength={2000} value={form.notes} onChange={e=>setField('notes',e.target.value)} placeholder="Algo que quieras recordar"/></label>
        {message&&<p className="warning" role="alert">{message}</p>}
        <button className="primary full" disabled={busy||account.saving||!navigator.onLine}>{busy?'Confirmando en tu cuenta…':existing?'Guardar cambios':'Guardar registro'}</button>
        <button className="text-button account-switch" type="button" disabled={busy} onClick={()=>{if(confirm('¿Descartar este borrador? Los registros guardados se conservan.')){setForm(emptyProgress());setOpen(false)}}}>Descartar borrador</button>
        <p className="small-note">El borrador se conserva en tu cuenta mientras escribes. Pulsa Guardar para que cuente en el historial; necesitas conexión.</p>
      </fieldset></form>
    </section>}
    <section className="card progress-overview"><p className="eyebrow"><TrendingUp size={15}/> TU EVOLUCIÓN</p><h2>Peso y fuerza, con perspectiva</h2><div className="progress-key-metrics"><Metric label="Último peso" value={hide?'Oculto':lastWeight?`${fmt(lastWeight.weight!)} kg`:'—'} sub={hide?'Puedes mostrarlo en Ajustes':lastWeight?shortDate(lastWeight.date):'Añade tu primer peso'}/><Metric label="Cambio de peso" value={hide?'Oculto':weights.length>1?`${weightDelta!>0?'+':''}${fmt(weightDelta!)} kg`:'—'} sub={hide?'Medidas privadas':firstWeight?`Desde ${shortDate(firstWeight.date)}`:'Respecto al primer registro'}/><Metric label="Máximo hip thrust" value={best?`${fmt(best.hipThrustKg!)} kg`:'—'} sub={best?`${shortDate(best.date)}${best.hipThrustReps?` · ${best.hipThrustReps} reps`:''}`:'Carga externa registrada'}/></div></section>
    <section className="card chart-card progress-weight"><h2>Tendencia de peso corporal</h2>{weights.length&&!hide?<ResponsiveContainer width="100%" height={230}><LineChart data={weights.map(log=>({fecha:shortDate(log.date),peso:log.weight,media:+log.average.toFixed(2)}))}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="fecha" fontSize={11}/><YAxis domain={['dataMin - 1','dataMax + 1']} width={45}/><Tooltip/><Line dataKey="peso" name="Peso (kg)" stroke="var(--coral)" dot/><Line dataKey="media" name="Media de 3 registros (kg)" stroke="var(--olive)" strokeWidth={3}/></LineChart></ResponsiveContainer>:<p className="empty">{hide?'Medidas ocultas por tu preferencia de privacidad.':'Tu gráfica aparecerá al guardar un peso.'}</p>}<p className="small-note">Peso registrado y media de los últimos 3 registros con peso. Una variación aislada no describe toda la tendencia.</p></section>
    <section className="card hip-thrust-card"><p className="eyebrow">FUERZA EN HIP THRUST</p><h2>Tu carga máxima registrada</h2><p className="strength-gain">{strength.length>1?`+${fmt(gain)} kg desde el primer registro`:'Tu primer registro será el punto de partida.'}</p>{strength.length>0&&<ResponsiveContainer width="100%" height={230}><LineChart data={strength.map(log=>({fecha:shortDate(log.date),carga:log.hipThrustKg}))}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="fecha" fontSize={11}/><YAxis unit=" kg" width={58}/><Tooltip/><Line dataKey="carga" name="Carga (kg)" stroke="var(--olive)" strokeWidth={3} dot/></LineChart></ResponsiveContainer>}<p className="small-note">{first?`Desde ${shortDate(first.date)}. `:''}Más kilos con condiciones comparables muestran evolución del rendimiento; no miden por sí solos la fuerza del glúteo.</p></section>
    <section className="card progress-history"><div className="section-head"><h2>Historial de progreso</h2><span className="status">{logs.length}</span></div>{logs.length===0&&<p className="empty">Empieza con el dato que te resulte útil. No hace falta registrarlo todo.</p>}{[...logs].sort((a,b)=>b.date.localeCompare(a.date)).map(log=><article className="history-entry" key={log.id}><div><strong>{new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric'}).format(parseDate(log.date))}</strong>{!hide&&(log.weight!==undefined||log.waist!==undefined||log.hip!==undefined)&&<p>{[log.weight===undefined?'':`Peso ${fmt(log.weight)} kg`,log.waist===undefined?'':`Cintura ${fmt(log.waist)} cm`,log.hip===undefined?'':`Cadera ${fmt(log.hip)} cm`].filter(Boolean).join(' · ')}</p>}{log.hipThrustKg!==undefined&&<p>Hip thrust: <b>{fmt(log.hipThrustKg)} kg{log.hipThrustReps?` × ${log.hipThrustReps}`:''}</b></p>}{(log.energy!==undefined||log.sleep!==undefined)&&<p>{[log.energy===undefined?'':`Energía del día: ${energyLabels[log.energy-1]??log.energy} (${log.energy}/5)`,log.sleep===undefined?'':`Sueño: ${fmt(log.sleep)} h`].filter(Boolean).join(' · ')}</p>}{hide&&(log.weight!==undefined||log.waist!==undefined||log.hip!==undefined)&&<p className="small-note">Peso y medidas ocultos</p>}{log.notes&&<p className="entry-notes">{log.notes}</p>}</div><div className="button-row"><button className="secondary" disabled={busy} onClick={()=>edit(log)}>Editar</button><button className="text-button" disabled={busy} onClick={async()=>{if(!confirm(`¿Eliminar el registro del ${shortDate(log.date)}? Se recalcularán sus gráficas y podrás deshacerlo.`))return;setBusy(true);try{await account.remove(`progress:${log.id}`);setDeleted(log);if(form.id===log.id){setForm(emptyProgress());setOpen(false)}notify('Registro eliminado. Puedes deshacerlo.')}catch{notify('No se pudo eliminar. Comprueba la conexión y reintenta.')}finally{setBusy(false)}}}>Eliminar</button></div></article>)}{deleted&&<div className="undo-strip"><span>Registro eliminado · {shortDate(deleted.date)}{logs.some(log=>log.date===deleted.date)&&' · Ya hay otro registro de esta fecha; revísalo antes de recuperar este.'}</span><button className="secondary" disabled={busy||logs.some(log=>log.date===deleted.date)} onClick={async()=>{setBusy(true);try{account.set(`progress:${deleted.id}`,deleted);await account.flush();setDeleted(null);notify('Registro recuperado.')}catch{notify('No se pudo recuperar. Reintenta con conexión.')}finally{setBusy(false)}}}>Deshacer</button></div>}</section>
    <section className="card progress-goal"><details><summary>Mi objetivo personal</summary><label>¿Qué te gustaría conseguir?<input maxLength={500} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="Por ejemplo, mejorar mi hip thrust con buena técnica"/></label><p className="small-note">Se guarda en tu cuenta. Puedes cambiarlo cuando quieras.</p></details></section>
  </>
}
