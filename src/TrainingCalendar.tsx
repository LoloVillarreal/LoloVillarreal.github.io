import { useEffect, useId, useRef, useState } from 'react'
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react'
import { useAccount } from './lib/account'
import { attendanceEntryValid, type Attendance } from './lib/attendance'
import { addDays, isoDate, mondayOf, parseDate, shortDate, validDate } from './lib/dates'
import { trainingEntryValid } from './lib/training-plan'
import type { WorkoutDay } from './types'

const fullDate=(date:string)=>new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(parseDate(date))

export function TrainingCalendar({date,onChange}:{date:string;onChange:(date:string)=>void}){
  const account=useAccount(),headingId=useId(),today=isoDate()
  const [expanded,setExpanded]=useState(false)
  const first=`${date.slice(0,7)}-01`,monthDate=parseDate(first),offset=(monthDate.getDay()+6)%7
  const nextMonth=parseDate(first);nextMonth.setMonth(nextMonth.getMonth()+1)
  const days=parseDate(addDays(isoDate(nextMonth),-1)).getDate(),cells=Math.ceil((offset+days)/7)*7
  const loaded=!!account.session&&!account.loading
  const moveMonth=(direction:number)=>{const next=parseDate(first);next.setMonth(next.getMonth()+direction);const value=isoDate(next);if(validDate(value))onChange(value)}
  return <section className={`card training-calendar${expanded?'':' is-compact'}`} aria-labelledby={headingId}>
    <header className="training-calendar-header">
      <div><p className="eyebrow">TU CALENDARIO</p><h2 id={headingId}>{new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(monthDate)}</h2></div>
      <div className="training-calendar-arrows"><button className="icon-button" aria-label={expanded?'Mes anterior':'Semana anterior'} onClick={()=>expanded?moveMonth(-1):onChange(addDays(date,-7))}><ChevronLeft/></button><button className="icon-button" aria-label={expanded?'Mes siguiente':'Semana siguiente'} onClick={()=>expanded?moveMonth(1):onChange(addDays(date,7))}><ChevronRight/></button></div>
    </header>
    <div className="training-calendar-date"><label>Consultar entrenamiento<input type="date" value={date} onChange={event=>{if(validDate(event.target.value))onChange(event.target.value)}}/></label><button className="secondary" onClick={()=>onChange(today)}>Hoy</button></div>
    <button className="text-button calendar-expand" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Ver solo la semana':'Ver calendario completo'}</button>
    {!expanded?<div className="training-week-strip" aria-label="Días de la semana">{Array.from({length:7},(_,i)=>addDays(mondayOf(date),i)).map(value=>{const trained=loaded&&attendanceEntryValid(`attendance:${value}`,account.values[`attendance:${value}`]);return <button key={value} className={date===value?'selected':''} aria-pressed={date===value} aria-label={`${fullDate(value)}${trained?', entrenado':''}`} onClick={()=>onChange(value)}><small>{['D','L','M','X','J','V','S'][parseDate(value).getDay()]}</small><b>{parseDate(value).getDate()}</b>{trained&&<Check size={10}/>}</button>})}</div>:<>    <div className="training-calendar-weekdays" aria-hidden="true">{['L','M','X','J','V','S','D'].map(day=><span key={day}>{day}</span>)}</div>
    <div className="training-calendar-grid" aria-label="Días del mes">
      {Array.from({length:cells},(_,index)=>{
        const number=index-offset+1
        if(number<1||number>days)return <span key={`empty-${index}`} aria-hidden="true"/>
        const value=`${date.slice(0,7)}-${String(number).padStart(2,'0')}`,plan=loaded?account.values[`training:${value}`]:undefined,entry=loaded?account.values[`attendance:${value}`]:undefined
        const planned=trainingEntryValid(`training:${value}`,plan),trained=value<=today&&attendanceEntryValid(`attendance:${value}`,entry)
        return <button key={value} className={`training-calendar-day${date===value?' is-selected':''}${value===today?' is-today':''}${trained?' is-trained':''}`} aria-pressed={date===value} aria-current={value===today?'date':undefined} aria-label={`${fullDate(value)}${trained?`, entrenado: ${entry.title}`:''}${planned?`, planificado: ${plan.title}`:''}${!trained&&!planned?', sin registro':''}`} onClick={()=>onChange(value)}>
          <span>{number}</span><span className="training-calendar-markers" aria-hidden="true">{planned&&<i className="calendar-plan-marker"/>}{trained&&<Check className="calendar-attendance-marker" size={12} strokeWidth={3}/>}</span>
        </button>
      })}
    </div>
</>}
    <footer className="training-calendar-legend"><span><i className="calendar-plan-marker"/>Planificado</span><span><Check className="calendar-attendance-marker" size={14} strokeWidth={3}/>Entrenado</span></footer>
    {account.loading&&<p className="training-calendar-note" role="status">Cargando tus días guardados…</p>}
    {!account.loading&&account.session&&account.error&&<p className="training-calendar-note">La conexión de tu cuenta requiere atención; revisa el aviso de guardado.</p>}
  </section>
}

export function AttendanceControl({date,day,notify}:{date:string;day:WorkoutDay;notify:(message:string)=>void}){
  const account=useAccount(),key=`attendance:${date}`,value=account.values[key],today=isoDate()
  const entry=attendanceEntryValid(key,value)?value:undefined
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[removed,setRemoved]=useState<Attendance|null>(null),[online,setOnline]=useState(()=>navigator.onLine)
  const context=`${account.session?.user.id??''}:${date}`,contextRef=useRef(context);contextRef.current=context
  useEffect(()=>{setBusy(false);setError('');setRemoved(null)},[context])
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[])
  const disabled=busy||account.saving||!online
  const allowed=date<=today&&(day.type==='cardio'||day.type==='strength'&&day.exercises.length>0)&&(parseDate(date).getDay()!==3||day.type==='cardio')
  const mark=async()=>{
    if(disabled||entry||!allowed||!account.session||account.loading)return
    setBusy(true);setError('')
    try{
      await account.flush()
      if(contextRef.current!==context)return
      const snapshot:Attendance={date,title:day.title,type:day.type==='strength'?'strength':'cardio',completedAt:new Date().toISOString()}
      account.set(key,snapshot)
      await account.flush()
      if(contextRef.current===context){setRemoved(null);notify('Día entrenado guardado en tu cuenta.')}
    }catch{if(contextRef.current===context)setError('No se pudo confirmar el guardado. Revisa la conexión y pulsa Reintentar guardado.')}
    finally{if(contextRef.current===context)setBusy(false)}
  }
  const remove=async()=>{
    if(disabled||!entry||!confirm(`¿Quitar el día entrenado del ${shortDate(date)}? Dejará de contar en tus estadísticas. Tu rutina y tus medidas se conservarán.`))return
    setBusy(true);setError('')
    try{
      await account.flush()
      if(contextRef.current!==context)return
      await account.remove(key)
      if(contextRef.current===context){setRemoved(entry);notify('Día retirado de las estadísticas. Puedes deshacerlo.')}
    }catch{if(contextRef.current===context)setError('No se pudo quitar el día entrenado. Comprueba la conexión y vuelve a intentarlo.')}
    finally{if(contextRef.current===context)setBusy(false)}
  }
  const undo=async()=>{
    if(disabled||!removed||entry)return
    setBusy(true);setError('')
    try{
      await account.flush()
      if(contextRef.current!==context)return
      account.set(key,removed)
      await account.flush()
      if(contextRef.current===context){setRemoved(null);notify('Día entrenado recuperado.')}
    }catch{if(contextRef.current===context)setError('No se pudo confirmar la recuperación. Revisa la conexión y pulsa Reintentar guardado.')}
    finally{if(contextRef.current===context)setBusy(false)}
  }
  const retry=async(reload=false)=>{
    if(disabled)return
    setBusy(true);setError('')
    try{if(reload)await account.discardAndReload();else await account.flush()}
    catch{if(contextRef.current===context)setError('No se pudo confirmar el cambio. Comprueba tu conexión y vuelve a intentarlo.')}
    finally{if(contextRef.current===context)setBusy(false)}
  }
  if(account.loading)return <section className="card attendance-control"><p role="status">Cargando tu historial de entrenamiento…</p></section>
  if(!account.session)return <section className="card attendance-control"><p>Inicia sesión en Progreso para guardar tus días entrenados.</p></section>
  return <section className={`card attendance-control${entry?' attendance-control--done':''}`} aria-busy={busy}>
    {entry?<><div className="attendance-heading"><CheckCircle2 aria-hidden="true"/><div><p className="eyebrow">DÍA ENTRENADO · {shortDate(entry.date)}</p><h3>{entry.title}</h3></div></div><p>{entry.type==='strength'?'Fuerza':'Cardio'} · {account.error||error?'Pendiente de confirmar.':busy||account.saving?'Confirmando el cambio en tu cuenta…':'Este día cuenta en tus estadísticas.'}</p><button className="text-button attendance-remove" disabled={disabled} onClick={remove}>Quitar día entrenado</button></>:<>
      <h3>{date>today?'Una sesión por venir':day.type==='recovery'?'Un día para recuperar':'¿Ya entrenaste este día?'}</h3>
      <p>{date>today?'Podrás registrarlo cuando llegue la fecha.':day.type==='recovery'?'El descanso no suma días entrenados.':day.type==='strength'&&!day.exercises.length?'Añade ejercicios a la rutina antes de registrar este día.':'Márcalo al terminar. Abrir la guía o guardar una rutina no cuenta como entrenamiento realizado.'}</p>
      {allowed&&<button className="primary full" disabled={disabled} onClick={mark}><Check size={18}/>{busy?'Guardando…':'Marcar día como entrenado'}</button>}
    </>}
    {removed&&!entry&&<div className="attendance-undo" role="status"><span>Día retirado de las estadísticas.</span><button className="secondary" disabled={disabled} onClick={undo}><Undo2 size={16}/>Deshacer</button></div>}
    {!online&&<p className="small-note" role="status">Necesitas conexión a internet para guardar, quitar o recuperar un día entrenado.</p>}
    {(account.error||error)&&<p className="warning" role="alert">{account.error||error}</p>}
    {account.error&&<div className="button-row"><button className="secondary" disabled={disabled} onClick={()=>retry()}>Reintentar guardado</button>{account.error.includes('otro dispositivo')&&<button className="secondary" disabled={disabled} onClick={()=>retry(true)}>Volver a cargar</button>}</div>}
  </section>
}
