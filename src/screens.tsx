import { techniqueFor } from './lib/exercise-technique'
import ExercisePhoto from './ExercisePhoto'
import { exerciseUnit } from './lib/exercise-library'
import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import { Apple, ArrowLeft, Calculator, Check, ChevronDown, ChevronRight, Dumbbell, Heart, Play, Salad } from 'lucide-react'
import { workoutDays, hevyExport } from './data/training'
import { foods, menu } from './data/nutrition'
import { bmi, carbsForCalories, dayNutrients, hipThrustProgress, macroCalories, maintenanceRange, mifflin, movingAverage } from './lib/calculations'
import { backupJson, download, progressCsv } from './lib/files'
import { loadBackup, validateBackup } from './lib/db'
import { useStorage, useStored } from './lib/storage'
import { AccountGate, AccountPanel, useAccount, useCloudValue } from './lib/account'
import { addDays, isoDate, parseDate, shortDate, validDate, weekDates } from './lib/dates'
import type { AppSettings, Backup, CalculatorProfile, Exercise, NavSection, ProgressDraft, ProgressLog, WorkoutDay, WorkoutLog } from './types'
import type { GuidePosition } from './lib/guide-position'
import { attendanceEntryValid } from './lib/attendance'
import TodayReplacement from './TodayReplacement'
import { TrainingPlanner } from './TrainingPlanner'
import { LoveNote } from './LoveNote'
import { ActivityMenu, DayChoice } from './DayChoice'
import { planFromRoutine, trainingEntryValid, workoutForDate, type TrainingPlan } from './lib/training-plan'
import { currentTheme, themes } from './lib/appearance'
import { RestTimer } from './RestTimer'
import { WeekPlan } from './WeekPlan'
import './daily-simple.css'
import './home-journey.css'
import { cardioLabel } from './lib/cardio-options'
import { TrainingCalendar, AttendanceControl } from './TrainingCalendar'
export { ProgressScreen } from './ProgressScreen'

const fmt=(n:number,digits=0)=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:digits}).format(n)
const uid=()=>crypto.randomUUID()
const dateLabel=(date:string)=>new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(parseDate(date))
type Notify=(message:string)=>void
type Setter<T>=(value:SetStateAction<T>)=>void
const failure='No se ha podido guardar. Tus cambios siguen en pantalla; reintenta.'
function Metric({label,value,sub}:{label:string;value:string;sub:string}){return <article className="metric"><p>{label}</p><strong>{value}</strong><small>{sub}</small></article>}
function Empty({text}:{text:string}){return <p className="empty">{text}</p>}

function SavedDayChoice({date,plan,onChoose,onStart,onDetails,edit=false}:{
  date:string;plan:TrainingPlan;onChoose:(kind:TrainingPlan['type'])=>void;onStart:()=>void;onDetails:()=>void;edit?:boolean
}){
  const future=date>isoDate()
  const action=future?'Consultar guía':plan.type==='recovery'?'Ver descanso':plan.type==='cardio'?'Empezar cardio':'Empezar entrenamiento'
  return <section className={'card day-choice day-choice-index saved-day-choice'+(edit?' training-overview':'')} tabIndex={-1}>
    <p className="day-date">{dateLabel(date)}</p>
    <h2>{date===isoDate()?'¿Qué quieres hacer hoy?':'¿Qué quieres hacer este día?'}</h2>
    <ActivityMenu date={date} onChoose={onChoose}/>
    <div className="saved-day-shortcut">
      <button type="button" className="saved-plan-link" onClick={onDetails} aria-label={(edit?'Editar detalles: ':'Ver el plan de hoy: ')+plan.title}><span><small>Tu plan guardado</small><strong>{plan.title}</strong></span><ChevronRight size={16} aria-hidden="true"/></button>
      <button className="secondary" disabled={plan.type==='strength'&&!plan.exercises.length} aria-label={action} onClick={onStart}>
        {future?<ChevronRight size={15} aria-hidden="true"/>:<Play size={15} aria-hidden="true"/>}{future?'Consultar guía':plan.type==='recovery'?'Ver guía':'Empezar'}
      </button>
    </div>
  </section>
}

export function HomeScreen({go,reader,startTraining,onStrength,onDirtyChange,onSelectionSaved}:{onSelectionSaved?:()=>void;onDirtyChange?:(dirty:boolean)=>void;onStrength:()=>void;go:(section:NavSection,date?:string,tab?:'calc'|'tips'|'settings')=>void;reader:{date:string;index:number}|null;startTraining:(date:string,index?:number)=>void}){
  const account=useAccount(),today=isoDate(),saved=account.values[`training:${today}`]
  const hasPlan=trainingEntryValid(`training:${today}`,saved)
  const [pickingDate,setPickingDate]=useState(''),[startChosen,setStartChosen]=useState(false)
  const choiceTrigger=useRef<HTMLButtonElement>(null)
  const initialKind=useRef<TrainingPlan['type']>()
  const day=workoutForDate(today,hasPlan?saved:undefined)
  useEffect(()=>{
    if(startChosen&&hasPlan){setStartChosen(false);startTraining(today,0)}
  },[startChosen,hasPlan,today,startTraining])
  const attendanceKey = 'attendance:' + today
  const attendance = account.values[attendanceKey]
  const trainedToday = attendanceEntryValid(attendanceKey, attendance)
  const waitingForPlan = reader && !account.complete && !hasPlan && !trainedToday &&
    !trainingEntryValid('training:'+reader.date,account.values['training:'+reader.date])
  const resumeToday = reader?.date === today && !trainedToday
  const resumeIndex = resumeToday ? Math.min(reader.index, Math.max(0, day.exercises.length - 1)) : 0
  const guideLabel = day.exercises.length
    ? `Continuar · ejercicio ${resumeIndex + 1} de ${day.exercises.length}` : 'Continuar sesión'
  const weekStrip = weekDates(today).map(date => ({
    date, trained: date <= today && attendanceEntryValid('attendance:' + date, account.values['attendance:' + date])
  }))
  const trainingDays = weekStrip.filter(day => day.trained).length
  const showNext = !account.loading && !account.error && pickingDate!==today &&
    (trainedToday || parseDate(today).getDay()===3 || (hasPlan && saved.type==='recovery'))
  let nextDate = addDays(today,1)
  if(showNext) {
    while (true) {
      const nextPlan = account.values['training:'+nextDate]
      const available = !trainingEntryValid('training:'+nextDate,nextPlan) || nextPlan.type==='strength'
      if(parseDate(nextDate).getDay()!==3 && available && !attendanceEntryValid('attendance:'+nextDate,account.values['attendance:'+nextDate])) break
      nextDate=addDays(nextDate,1)
    }
  }
  const daySummary = day.type === 'strength' ? `${day.exercises.length} ejercicios` : day.objective
  return <div className="simple-day-home">
    <div className="home-decision">
    {account.loading ? <section className="card" role="status">Recuperando tu elección…</section>
      : waitingForPlan && reader ? <section className="card simple-day-intro">
        <p className="day-date">{dateLabel(reader.date)}</p>
        <h2>Tu sesión está en pausa</h2>
        <p>{reader.index>0 ? `Te quedaste en el ejercicio ${reader.index+1}. ` : ''}Al recuperar la conexión podrás volver a tu rutina. Las fotos siguen en la biblioteca de ejercicios.</p>
        <button className="secondary" onClick={()=>go('nutrition')}>Abrir herramientas</button>
      </section>
      : trainedToday && pickingDate!==today ? <section className="card training-completed-home">
        <p className="day-date">{dateLabel(today)}</p>
        <div className="completed-headline"><span className="completed-icon"><Check aria-hidden="true"/></span>
          <div><small>Entrenamiento registrado</small><h2>{attendance.title}</h2></div>
        </div>
        <div className="completed-actions">
          <button className="secondary" onClick={()=>go('training',today)}>Ver mi registro<ChevronRight size={16}/></button>
          {attendance.type==='strength' && <button className="text-button" onClick={onStrength}>Anotar marca de hip thrust</button>}
        </div>
      </section> : !hasPlan || pickingDate===today ? <>
        <DayChoice key={today} date={today} initialKind={hasPlan&&pickingDate===today?initialKind.current:undefined} previousPlan={hasPlan?saved:undefined} onCancel={()=>{
          setPickingDate('')
          requestAnimationFrame(()=>(choiceTrigger.current??document.getElementById('choose-activity-'+initialKind.current))?.focus())
        }} onDirtyChange={onDirtyChange} onBegin={()=>setPickingDate(today)}
          onSaved={start=>{onSelectionSaved?.();setPickingDate('');onDirtyChange?.(false);setStartChosen(start)}}/>
      </> : !resumeToday ? <SavedDayChoice date={today} plan={saved} onChoose={kind=>{initialKind.current=kind;setPickingDate(today)}}
        onStart={()=>startTraining(today,0)} onDetails={()=>go('training',today)}/>
      : <section className="card home-today simple-day-intro">
      <p className="day-date">{dateLabel(today)}</p>
      <h2>{day.title}</h2>
      <p>{daySummary}{day.optional ? ' · Opcional' : ''}</p>
      <div className="home-actions">
        <button className="primary full" disabled={account.loading || (day.type === 'strength' && !day.exercises.length)}
          onClick={() => startTraining(today,resumeIndex)}><Play size={17}/>{guideLabel}</button>
        <button ref={choiceTrigger} className="text-button" onClick={()=>{initialKind.current=undefined;setPickingDate(today)}}>Cambiar mi elección</button>
        <button className="text-button" onClick={() => go('training',today)}>Ver el plan de hoy<ChevronRight size={16}/></button>
      </div>
    </section> }
    {reader && reader.date < today && trainingEntryValid('training:'+reader.date,account.values['training:'+reader.date]) && <button className="secondary" onClick={()=>startTraining(reader.date,reader.index)}>
      Continuar la sesión del {shortDate(reader.date)}<ChevronRight size={16}/>
    </button>}
    </div>
    <div className="home-notebook">
    {showNext && <button className="next-strength-link" onClick={()=>go('training',nextDate)}>
      <Dumbbell size={19} aria-hidden="true"/><span><small>Fuerza otro día</small><strong>
        {dateLabel(nextDate)}
      </strong></span><ChevronRight size={16} aria-hidden="true"/>
    </button>}
    <section className="card home-week-card">
      <button className="home-week-open" onClick={()=>go('progress')}><span>
        <strong>Mi progreso</strong><small>{account.loading?'Cargando…':account.error?'Consultar mis registros':`${trainingDays} ${trainingDays===1?'día entrenado':'días entrenados'} esta semana`}</small>
      </span><ChevronRight size={18}/></button>
      {!account.loading && !account.error && <><ol aria-label="Actividad de la semana" className="home-week-strip">
        {weekStrip.map(({date,trained},i)=><li key={date} className={trained?'trained':''}><button type="button" onClick={()=>go('training',date)} aria-current={date===today?'date':undefined}
          aria-label={dateLabel(date)+(date===today?', hoy':'')+(trained?', entrenado':date<=today?', sin registro':', próximo')}>
          <span aria-hidden="true">{['L','M','X','J','V','S','D'][i]}</span>
          <i aria-hidden="true">{parseDate(date).getDate()}{trained&&<Check size={10} strokeWidth={3}/>}</i>
        </button></li>)}
      </ol></>}
    </section>
    <div className="card simple-day-links home-secondary-links">
      <WeekPlan/>
    </div>
    </div>
  </div>
}

export function MoreScreen({tab,setTab,settings,saveSettings,legacyAvailable,notify}:{tab:'calc'|'tips'|'settings';setTab:(tab:'calc'|'tips'|'settings')=>void;settings:AppSettings;saveSettings:Setter<AppSettings>;legacyAvailable:boolean;notify:Notify}){
  return <><div className="segmented settings-sections" role="group" aria-label="Apartados de ajustes">{([['settings','Mi cuenta'],['tips','Ayuda']] as const).map(([id,label])=><button key={id} className={tab===id?'active':''} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</div>{tab==='tips'?<>
    <section className="card simple-day-links"><a href="#prueba-gimnasio"><span><strong>Practicar con un ejemplo</strong><small>Prueba una sesión sin cambiar tu plan ni tu progreso.</small></span><ChevronRight size={18} aria-hidden="true"/></a></section>
    <section className="card install-card"><Apple/><div><h2>Llévala a tu pantalla de inicio</h2><ol><li>Abre la web en Safari del iPhone.</li><li>Toca Compartir.</li><li>Elige «Añadir a pantalla de inicio».</li><li>Abre el plan e inicia sesión con tu cuenta.</li></ol></div></section>
  </>:<SettingsScreen settings={settings} saveSettings={saveSettings} legacyAvailable={legacyAvailable} notify={notify}/>}</>
}

export function Calculators({notify}:{notify:Notify}){
  const account=useAccount()
  const [v,setV]=useCloudValue<CalculatorProfile>('calculator',{age:'',height:'',weight:'',activity:1.55,sex:'female',calories:'',protein:'',fat:''})
  const validBody=[v.age,v.height,v.weight].every(x=>x!==''&&Number.isFinite(+x)&&+x>0)
  const validMacros=[v.calories,v.protein,v.fat].every(x=>x!==''&&Number.isFinite(+x)&&+x>=0)&&+v.calories>0
  const b=validBody?bmi(+v.weight,+v.height):0,basal=validBody?mifflin({weightKg:+v.weight,heightCm:+v.height,age:+v.age,sex:v.sex}):0,maint=maintenanceRange(basal,v.activity),carbs=validMacros?carbsForCalories(+v.calories,+v.protein,+v.fat):0
  const incompatible=validMacros&&+v.protein*4+ +v.fat*9>+v.calories
  return <><section className="card"><p className="eyebrow">TUS DATOS, RECORDADOS EN TU CUENTA</p><h2>IMC y energía estimada</h2><div className="form-grid"><label>Edad<input type="number" min="1" value={v.age} onChange={e=>setV(p=>({...p,age:e.target.value}))}/></label><label>Altura (cm)<input type="number" min="1" value={v.height} onChange={e=>setV(p=>({...p,height:e.target.value}))}/></label><label>Peso para el cálculo (kg)<input type="number" min="1" step=".1" value={v.weight} onChange={e=>setV(p=>({...p,weight:e.target.value}))}/></label><label>Fórmula<select value={v.sex} onChange={e=>setV(p=>({...p,sex:e.target.value as 'female'|'male'}))}><option value="female">Mifflin mujer</option><option value="male">Mifflin hombre</option></select></label><label>Actividad<select value={v.activity} onChange={e=>setV(p=>({...p,activity:+e.target.value}))}><option value="1.2">Sedentaria</option><option value="1.375">Ligera</option><option value="1.55">Moderada</option><option value="1.725">Alta</option></select></label></div>{validBody?<div className="result-grid"><Metric label="IMC" value={fmt(b,1)} sub="No mide grasa corporal"/><Metric label="Metabolismo basal" value={`${fmt(basal)} kcal`} sub="Estimación de energía en reposo"/><Metric label="Mantenimiento estimado" value={`${fmt(maint.low)}–${fmt(maint.high)}`} sub="kcal/día · rango orientativo"/></div>:<Empty text="Introduce edad, altura y peso positivos para ver la estimación."/>}<p className="source-note">Son estimaciones poblacionales, no una prescripción clínica ni un objetivo automático de alimentación.</p></section><section className="card"><h2>Distribución de macronutrientes</h2><p>Introduce una referencia que hayas elegido para explorar la distribución.</p><div className="form-grid"><label>Calorías de referencia<input type="number" min="1" value={v.calories} onChange={e=>setV(p=>({...p,calories:e.target.value}))}/></label><label>Proteína de referencia (g)<input type="number" min="0" value={v.protein} onChange={e=>setV(p=>({...p,protein:e.target.value}))}/></label><label>Grasas de referencia (g)<input type="number" min="0" value={v.fat} onChange={e=>setV(p=>({...p,fat:e.target.value}))}/></label></div>{incompatible?<p className="warning">Proteína y grasas ya superan las calorías introducidas. Revisa la combinación.</p>:validMacros?<div className="result-callout"><strong>{fmt(+v.protein)} g proteína · {fmt(+v.fat)} g grasas · {fmt(carbs)} g carbohidratos</strong><span>Suma: {fmt(macroCalories(+v.protein,carbs,+v.fat))} kcal</span></div>:<Empty text="Completa los tres campos con valores válidos."/>}<button className="secondary full" disabled={!validMacros||incompatible} onClick={async()=>{account.set('goalDraft',{calorieTarget:v.calories,proteinTarget:v.protein,fatTarget:v.fat,carbTarget:String(carbs)});try{await account.flush();notify('Referencia guardada en tu cuenta.')}catch{notify(failure)}}}>Guardar esta referencia</button></section></>
}

function SettingsScreen({settings,saveSettings,legacyAvailable,notify}:{settings:AppSettings;saveSettings:Setter<AppSettings>;legacyAvailable:boolean;notify:Notify}){
  const account=useAccount(),storage=useStorage()
  const [candidate,setCandidate]=useState<Backup|null>(null),[busy,setBusy]=useState(false)
  const cloudLogs=Object.entries(account.values).filter(([key])=>key.startsWith('progress:')).map(([,value])=>value as ProgressLog)
  const copyingUnavailable=busy||account.loading||account.saving||!account.complete
  const downloadBackup=(data:Backup)=>download(backupJson(data),`plan-la-copia-${isoDate()}.json`)
  const exportCloud=async(format:'json'|'csv')=>{
    if(copyingUnavailable)return
    setBusy(true)
    try{
      const backup=await account.getBackup()
      if(format==='json')downloadBackup(backup)
      else download(progressCsv(backup.progressLogs),`progreso-${isoDate()}.csv`,'text/csv')
    }catch{notify('No se pudo obtener una copia completa. Actualiza tus datos y vuelve a intentarlo.')}
    finally{setBusy(false)}
  }
  const readFile=async(file?:File)=>{if(!file)return;try{const data=JSON.parse(await file.text());if(!validateBackup(data))throw new Error();setCandidate(data)}catch{notify('El archivo no es una copia válida. No se ha cambiado ningún dato.')}}
  const restore=async()=>{if(!candidate||copyingUnavailable)return;setBusy(true);try{await account.restore(candidate,downloadBackup);setCandidate(null);notify('Copia restaurada en tu cuenta.')}catch{notify('No se pudo confirmar la restauración. Actualiza tus datos antes de reintentar.')}finally{setBusy(false)}}
  return <><AccountPanel/><section className="card"><h2>El espacio de Lolo</h2><p>Organiza tu preparación con la misma cuenta del plan.</p><button className="secondary full" onClick={()=>{location.hash='#police'}}>Entrar al apartado Policía Nacional</button></section><section className="card"><h2>A tu manera</h2><p>Apariencia</p><div className="theme-options" role="group" aria-label="Elegir apariencia">{themes.map(theme=><button key={theme.id} className={`theme-option theme-option--${theme.id}`} aria-pressed={currentTheme(settings)===theme.id} onClick={()=>saveSettings(v=>({...v,theme:theme.id,darkMode:theme.id==='dark'}))}><span className="theme-sample" aria-hidden="true"><i/><i/><i/></span><strong>{theme.label}</strong><span>{theme.id==='glass'?'Blanco y multicolor':theme.id==='dark'?'Suave por la noche':'Cálido y natural'}</span></button>)}</div><label className="toggle-row">Ocultar peso y medidas<input type="checkbox" checked={settings.hideSensitive} onChange={e=>saveSettings(v=>({...v,hideSensitive:e.target.checked}))}/></label><p className="privacy-note">La guía y sus imágenes funcionan sin conexión tras cargarse. El progreso y las calculadoras se guardan en una cuenta privada en Supabase; necesitan conexión para sincronizar. Al cerrar sesión, sus datos salen de la pantalla.</p></section>
    {account.session&&<section className="card"><h2>Tus copias de seguridad</h2>{!account.complete&&<p role="status">Para exportar o restaurar, primero carga la cuenta completa desde «Actualizar datos».</p>}<div className="button-stack"><button className="primary" disabled={copyingUnavailable} onClick={()=>void exportCloud('json')}>Exportar copia de mi cuenta</button><button className="secondary" disabled={copyingUnavailable||!cloudLogs.length} onClick={()=>void exportCloud('csv')}>Exportar progreso CSV</button><label className="file-label">Importar copia JSON<input type="file" accept="application/json" onChange={e=>{void readFile(e.target.files?.[0]);e.target.value=''}}/></label></div>{candidate&&<div className="import-review"><h3>Revisar antes de restaurar</h3><p>{candidate.progressLogs.length} registros de progreso y {Object.keys(candidate.localState??{}).filter(key=>key.startsWith('training:')).length} entrenamientos planificados y {Object.keys(candidate.localState??{}).filter(key=>key.startsWith('attendance:')).length} días entrenados. Se sustituirán los datos de esta cuenta y se descargará primero una copia de la versión actual.</p><p className="small-note">Las fotos y los registros de entreno de versiones anteriores no se subirán a la nube.</p><div className="button-row"><button className="primary" disabled={copyingUnavailable} onClick={restore}>Restaurar y sustituir mis datos</button><button className="secondary" onClick={()=>setCandidate(null)}>Cancelar</button></div></div>}</section>}
    {legacyAvailable&&<section className="card"><h2>Datos de la versión anterior</h2><p>Se han conservado en este dispositivo; no se suben automáticamente a ninguna cuenta.</p><button className="secondary full" onClick={async()=>{try{await storage.flush();download(backupJson(await loadBackup()),'plan-la-copia-anterior.json')}catch{notify('No se pudo exportar la copia anterior.')}}}>Descargar copia anterior</button></section>}
    <section className="card"><details><summary>Compatibilidad con Hevy</summary><p>La guía usa únicamente nombres, IDs e imágenes del catálogo estándar de ejercicios. No contiene historial de ninguna cuenta ni sincroniza entrenamientos.</p><button className="secondary full" onClick={()=>download(JSON.stringify(hevyExport(),null,2),'plan-la-hevy-manual.json')}>Exportar rutina para uso manual</button></details><p className="small-note">PLAN Lolo & alexia · guía orientativa de entrenamiento y alimentación.</p></section><LoveNote/>
  </>
}

export function TrainingScreen({date,setDate,notify,reader,bookmark,setReader,finish,onDirtyChange}:{date:string;setDate:(date:string)=>void;notify:Notify;reader:GuidePosition|null;bookmark:GuidePosition|null;setReader:(position:GuidePosition|null)=>void;finish:(date:string)=>void;onDirtyChange:(dirty:boolean)=>void}){
  const account=useAccount(),[editing,setEditing]=useState(false),[removing,setRemoving]=useState(false),[deletedPlan,setDeletedPlan]=useState<TrainingPlan|null>(null)
  useEffect(()=>setDeletedPlan(null),[date,account.session?.user.id])
  const [recentRegistration,setRecentRegistration]=useState<string|null>(null)
  const [preview,setPreview]=useState<GuidePosition|null>(null)
  const [pickingDate,setPickingDate]=useState('')
  const choiceTrigger=useRef<HTMLButtonElement>(null)
  const initialKind=useRef<TrainingPlan['type']>()
  const choiceDirty=useRef(false)
  const trackChoice=useCallback((dirty:boolean)=>{
    choiceDirty.current=dirty
    onDirtyChange(dirty)
  },[onDirtyChange])
  const saved=account.values[`training:${date}`],hasPlan=trainingEntryValid(`training:${date}`,saved)
  const selected=workoutForDate(date,hasPlan?saved:undefined)
  const recorded = attendanceEntryValid('attendance:'+date,account.values['attendance:'+date])
  const consult = date>isoDate() || recorded
  const openGuide=(index=0)=>consult?setPreview({date,index}):setReader({date,index})
  useEffect(()=>{document.getElementById('fitness-scroll')?.scrollTo(0,0)},[editing,reader?.date,reader?.index,preview?.date,preview?.index])
  function closeGuide(destination:'summary'|'registration') {
    if(preview?.date===date)setPreview(null)
    else setReader(null)
    requestAnimationFrame(()=>{
      const selector=destination==='summary'?(consult?'.recorded-plan-options button, .saved-day-shortcut > .secondary':'.training-overview, .attendance-control--done'):'.attendance-control'
      const target=document.querySelector<HTMLElement>(selector)
      target?.focus({preventScroll:true})
      target?.scrollIntoView({block:'center'})
    })
  }
  if(account.session&&account.loading)return <><TrainingCalendar date={date} onChange={setDate}/><section className="card" role="status"><p>Recuperando tu entrenamiento…</p></section></>
  if(editing&&hasPlan)return <>{!account.session&&<button className="text-button" onClick={()=>setEditing(false)}>Volver al resumen</button>}<AccountGate><TrainingPlanner key={`${account.session?.user.id}:${date}`} date={date} initial={saved} onDirtyChange={onDirtyChange} onCancel={()=>setEditing(false)} onSaved={start=>{setEditing(false);if(start)openGuide();notify('Entrenamiento guardado en tu cuenta.')}}/></AccountGate></>
  const resume = bookmark?.date === date ? Math.min(bookmark.index, Math.max(0, selected.exercises.length-1)) : 0
  function confirmedRegistration() {
    setRecentRegistration(date)
    finish(date)
    requestAnimationFrame(()=>{
      const target=document.querySelector<HTMLElement>('.attendance-control')
      target?.focus({preventScroll:true})
      target?.scrollIntoView({block:'center'})
    })
  }
  const calendar=<TrainingCalendar key="calendar" date={date} onChange={value=>{
      if(value===date)return
      if(choiceDirty.current&&!confirm('¿Cambiar de fecha y descartar esta elección?'))return
      setPickingDate('');onDirtyChange(false);setDate(value)
    }}/>
  const management=<section className="card plan-management"><p className="small-note">La planificación y los días entrenados se guardan por separado.</p>{hasPlan&&<button className="text-button" disabled={removing||account.saving||!navigator.onLine} onClick={async()=>{if(!confirm('¿Borrar la planificación de este día? Su marca de entrenado y tus medidas se conservarán.'))return;setRemoving(true);const previous=saved;try{await account.remove(`training:${date}`);setDeletedPlan(previous);notify('Planificación eliminada. Puedes deshacerlo.')}catch{notify('No se pudo borrar. Comprueba la conexión y reintenta.')}finally{setRemoving(false)}}}>Borrar planificación del día</button>}{deletedPlan&&<div className="undo-strip"><span>Planificación eliminada</span><button className="secondary" disabled={removing||account.saving||hasPlan||!navigator.onLine} onClick={async()=>{setRemoving(true);try{account.set(`training:${date}`,deletedPlan);await account.flush();setDeletedPlan(null);notify('Planificación recuperada.')}catch{notify('No se pudo recuperar. Reintenta con conexión.')}finally{setRemoving(false)}}}>Deshacer</button></div>}</section>
  const attendanceControl=<div key={'record:'+date} className="simple-day-register">
    <AttendanceControl key={date} date={date} day={selected} notify={notify} existingOnly={!hasPlan || pickingDate===date} onRegistered={confirmedRegistration} recent={recentRegistration===date}/>
  </div>
  const viewingPreview=preview?.date===date && consult
  const guide=viewingPreview?preview:date<=isoDate()?reader:null
  if(hasPlan && !editing && pickingDate!==date && guide?.date===date)return <SessionView day={selected} date={date} index={guide.index}
    cardio={saved.cardio} notes={saved.notes} preview={viewingPreview} onStep={index=>viewingPreview?setPreview({date,index}):setReader({date,index})}
    onExit={()=>closeGuide('summary')} notify={notify} onRegistered={confirmedRegistration}/>
  if(recorded && pickingDate!==date)return <>
    {calendar}
    {attendanceControl}
    <section className="card recorded-plan-options">
      <h2>Plan de este día</h2>
      {hasPlan && <button className="secondary full" onClick={()=>openGuide()}>Ver la guía de {selected.title}</button>}
      <button ref={choiceTrigger} className="text-button" onClick={()=>{initialKind.current=undefined;setPickingDate(date)}}>{hasPlan?'Cambiar mi elección':'Añadir un plan a este día'}</button>
      {hasPlan && <button className="text-button" onClick={()=>setEditing(true)}>Editar detalles</button>}
    </section>
    {(hasPlan||deletedPlan)&&management}
  </>
  if(!hasPlan || pickingDate===date)return <>
    {pickingDate!==date&&calendar}
    {attendanceControl}
    <DayChoice key={'choice:'+date} date={date} initialKind={hasPlan&&pickingDate===date?initialKind.current:undefined} previousPlan={hasPlan?saved:undefined} returnToRecord={recorded} onCancel={()=>{
      setPickingDate('')
      requestAnimationFrame(()=>(choiceTrigger.current??document.getElementById('choose-activity-'+initialKind.current))?.focus())
    }} onDirtyChange={trackChoice} onBegin={()=>setPickingDate(date)}
      onSaved={start=>{finish(date);setPickingDate('');onDirtyChange(false);if(start)setReader({date,index:0});notify('Elección guardada en tu cuenta.')}}/>
    {pickingDate===date&&calendar}
    {deletedPlan&&management}
  </>
  return <>
    {calendar}
    {consult || bookmark?.date!==date ? <SavedDayChoice date={date} plan={saved} edit onChoose={kind=>{initialKind.current=kind;setPickingDate(date)}}
      onStart={()=>openGuide()} onDetails={()=>setEditing(true)}/>
    : <section tabIndex={-1} className="card training-overview simple-day-intro">
      <p className="day-date">{dateLabel(date)}</p>
      <h2>{selected.title}</h2>
      <p>{selected.type==='strength' ? `${selected.exercises.length} ejercicios` : selected.objective}{selected.optional?' · Opcional':''}</p>
      <div className="overview-actions">
        <button className="primary" disabled={selected.type==='strength'&&!selected.exercises.length} onClick={()=>setReader({date,index:resume})}>
          <Play size={17}/>Continuar sesión
        </button>
        <button ref={choiceTrigger} className="text-button" onClick={()=>{initialKind.current=undefined;setPickingDate(date)}}>Cambiar mi elección</button>
        <button className="text-button" onClick={()=>setEditing(true)}>Editar detalles</button>
      </div>
    </section>}
    {attendanceControl}
    {selected.type==='strength' ? <section className="card routine-preview">
      <h2>Ejercicios del día</h2>
      {selected.exercises.length===0&&<p className="empty">Edita el plan de este día para añadir un ejercicio.</p>}
      {selected.exercises.map((exercise,index)=><div key={exercise.id} className="routine-preview-row">
        <ExercisePhoto exercise={exercise}/>
        <button className="routine-preview-open" onClick={()=>openGuide(index)}><span><strong>{exercise.name}</strong><small>{exercise.sets} series · {exercise.reps.join('–')} {exerciseUnit(exercise)}</small></span><ChevronRight size={18}/></button>
      </div>)}
      <details><summary>Antes de empezar</summary><p>Dedica unos minutos a moverte y realiza series de aproximación antes de las cargas de trabajo.</p><p className="small-note">RIR indica cuántas repeticiones más crees que podrías hacer con buena técnica.</p></details>
    </section> : null}
    {management}
    <section className="card simple-day-links"><WeekPlan from="Entrenos"/></section>
    <p className="source-note">Fichas e imágenes del catálogo estándar de <a href="https://www.hevyapp.com/" target="_blank" rel="noreferrer">Hevy</a>, consultado para esta guía. No hay sincronización con cuentas.</p>
  </>
}

function NonStrengthGuide({day,cardio}:{day:WorkoutDay;cardio?:{activity:string;minutes:number}}){
  return day.type==='cardio'?<section className="card cardio-guide"><span className="illustrated-symbol">🚶‍♀️</span><h2>Muévete a un ritmo cómodo</h2><p>{cardio?`Tu selección: ${cardio.minutes} minutos de ${cardioLabel(cardio.activity).toLocaleLowerCase('es')}, ajustados a tus sensaciones.`:'Referencia de la sesión: 25–45 minutos de caminata, bicicleta o elíptica, adaptados a tu recuperación.'}</p><ul><li>Empieza suave y aumenta gradualmente.</li><li>Un ritmo moderado permite hablar sin quedarte sin aire.</li><li>Termina bajando el ritmo.</li></ul><div className="goal-callout"><strong>Objetivo de hoy</strong><p>Actividad cardiovascular y recuperación.{day.day===3?' El miércoles es exclusivamente de cardio':''}</p></div></section>:<section className="card cardio-guide"><span className="illustrated-symbol">🌿</span><h2>Recuperar también es avanzar</h2><p>Descansar, caminar si te apetece o hacer movilidad suave. Sin fuerza programada ni un objetivo rígido de pasos.</p></section>
}

function SessionView({day,date,index,cardio,notes,preview,onStep,onExit,notify,onRegistered}:{day:WorkoutDay;date:string;index:number;cardio?:{activity:string;minutes:number};notes:string;preview:boolean;onStep:(index:number)=>void;onExit:()=>void;notify:Notify;onRegistered:()=>void}) {
  const count=day.exercises.length
  const step=Math.max(0,Math.min(index,count-1))
  const exercise=day.exercises[step]
  const page=useRef<HTMLElement>(null)
  const [indexOpen,setIndexOpen]=useState(false)
  const indexButton=useRef<HTMLButtonElement>(null)
  const lastTap=useRef<{direction:1|-1; time:number}|null>(null)
  function move(direction:1|-1,event:React.MouseEvent<HTMLButtonElement>) {
    const previous=lastTap.current
    // WebKit can report two single clicks for one double tap.
    if(event.detail>0 && previous?.direction===direction && (event.detail>1 || event.timeStamp-previous.time<350))return
    lastTap.current=event.detail>0 ? {direction,time:event.timeStamp} : null
    onStep(step+direction)
  }
  function focusExercise() {
    const target=page.current?.querySelector<HTMLElement>('[data-exercise-title]') ?? page.current
    target?.focus({preventScroll:true})
  }
  useEffect(()=>{
    setIndexOpen(false)
    focusExercise()
  },[date,step])
  return <section className="training-session" ref={page} tabIndex={-1} aria-label={day.title}>
    <nav aria-label="Recorrer la guía" onKeyDown={event=>{
      if(indexOpen && event.key==='Escape'){
        setIndexOpen(false)
        indexButton.current?.focus()
      }
    }}>
      <div className="training-session-nav">
        <button className="text-button" onClick={onExit}><ArrowLeft size={16}/>Volver a la rutina</button>
        {count>1?<button className="session-index-toggle" ref={indexButton} aria-expanded={indexOpen} aria-controls="session-exercise-index"
          aria-label={`${indexOpen?'Ocultar':'Ver'} ejercicios. Ejercicio ${step+1} de ${count}`} onClick={event=>{
            event.currentTarget.focus({preventScroll:true})
            setIndexOpen(!indexOpen)
          }}>
          Ejercicios <b>{step+1}/{count}</b><ChevronDown size={16} aria-hidden="true"/>
        </button>:exercise&&<span>Ejercicio 1 de 1</span>}
      </div>
      {count>1&&<ol id="session-exercise-index" className="session-exercise-index" aria-label="Ejercicios de esta sesión" hidden={!indexOpen}>
        {day.exercises.map((item,position)=><li key={item.id}><button type="button" aria-current={position===step?'step':undefined}
          onClick={()=>{lastTap.current=null;setIndexOpen(false);if(position===step)focusExercise();else onStep(position)}}>
          <span>{position+1}</span><strong>{item.name}</strong>{position===step&&<small>Actual</small>}
        </button></li>)}
      </ol>}
    </nav>
    {preview&&<p className="day-date">Guía de consulta · {dateLabel(date)}</p>}
    {notes.trim()&&<details className="session-details"><summary>Notas de la sesión</summary><p className="session-note-text">{notes}</p></details>}
    {exercise?<div className="card training-session-card">
      {count>1&&<div className="session-position-track" aria-hidden="true"><i style={{transform:`scaleX(${(step+1)/count})`}}/></div>}
      <ExerciseGuide exercise={exercise}/>
      {!preview&&<TodayReplacement date={date} exercise={exercise} index={step}/>}
      {!preview&&exercise.rest[1]>0&&<details key={date+':'+step+':'+exercise.id} className="session-details">
        <summary>Medir el descanso</summary>
        <RestTimer seconds={exercise.rest[1]}/>
      </details>}
      {step<count-1?
        <button className="primary full training-session-next" onClick={event=>move(1,event)}>
          <span><small>Siguiente ejercicio</small><strong>{day.exercises[step+1].name}</strong></span><ChevronRight size={19} aria-hidden="true"/>
        </button>:
        preview?<button className="secondary full" onClick={onExit}>Cerrar consulta</button>:<AttendanceControl key={date} date={date} day={day} notify={notify} finishGuide onRegistered={onRegistered}/>}
      {step>0&&<button className="text-button training-session-previous" onClick={event=>move(-1,event)}><ArrowLeft size={16}/>Ejercicio anterior</button>}
    </div>:<>
      <NonStrengthGuide day={day} cardio={cardio}/>
      {preview?<button className="secondary full" onClick={onExit}>Cerrar consulta</button>:<AttendanceControl key={date} date={date} day={day} notify={notify} finishGuide onRegistered={onRegistered}/>}
    </>}
  </section>
}

function ExerciseGuide({exercise}:{exercise:Exercise}) {
  const amount=exercise.reps[0]===exercise.reps[1]?String(exercise.reps[0]):exercise.reps.join('–')
  const unit=exercise.unit==='seconds'?'segundos':exercise.unit==='meters'?'metros':'repeticiones'
  const rest=exercise.rest[0]===exercise.rest[1]?String(exercise.rest[0]):exercise.rest.join('–')
  return <>
    <div className="guided-top">
      <div className="guided-photo"><ExercisePhoto exercise={exercise}/></div>
      <div><h2 data-exercise-title tabIndex={-1}>{exercise.name}</h2><span className="small-note">{exercise.muscle}</span></div>
    </div>
    <div className="training-session-dose">
      <strong>Haz {exercise.sets} {exercise.sets===1?'serie':'series'} de {amount} {unit}{exercise.perSide?' por lado':''}.</strong>
      {exercise.rest[1]>0&&<span>Descansa {rest} segundos entre series.</span>}
    </div>
    <details key={exercise.id} className="session-details">
      <summary>Cómo hacerlo</summary>
      <p>{techniqueFor(exercise).text}</p>
      {exercise.avoid&&<p className="warning">{exercise.avoid}</p>}
    </details>
  </>
}

type FoodCategory='breakfast'|'lunch'|'dinner'|'snack'
const foodIdeas:Record<FoodCategory,{title:string;description:string;tile:number;swap:string;tip:string}[]>={
  breakfast:[
    {title:'Yogur, fruta y frutos secos',description:'Yogur natural o skyr, fruta de temporada y nueces; añade avena si te apetece.',tile:0,swap:'Yogur sin lactosa o alternativa de soja enriquecida.',tip:'Una opción rápida que puedes dejar preparada.'},
    {title:'Tostada de tomate y queso',description:'Pan integral con tomate, queso fresco y un poco de aceite de oliva.',tile:1,swap:'Huevo o hummus en lugar del queso.',tip:'Acompaña con una pieza de fruta si tienes apetito.'},
    {title:'Avena con plátano',description:'Copos de avena con leche, plátano y una pequeña cantidad de crema de cacahuete.',tile:2,swap:'Leche sin lactosa o bebida de soja; otra fruta en lugar del plátano.',tip:'Caliente o preparada la noche anterior, según te resulte cómodo.'},
    {title:'Huevos y tostada',description:'Huevos revueltos con pan integral y fruta.',tile:3,swap:'Tofu revuelto como variante vegetal.',tip:'Una opción salada para variar los desayunos.'},
  ],
  lunch:[
    {title:'Arroz, pollo y verduras',description:'Combina arroz con pollo y verduras variadas; aliña con aceite de oliva.',tile:4,swap:'Pavo, tofu o legumbres; también puedes cambiar arroz por pasta o patata.',tip:'Cocinar varias raciones facilita organizar la semana.'},
    {title:'Lentejas con verduras',description:'Lentejas con tomate, zanahoria y hojas verdes, en ensalada o guiso.',tile:5,swap:'Garbanzos o alubias en lugar de lentejas.',tip:'Las legumbres cocidas de bote también sirven; escúrrelas y acláralas.'},
  ],
  dinner:[
    {title:'Salmón, patata y verdura',description:'Pescado al horno con patata y verduras que te gusten.',tile:6,swap:'Merluza, huevos o tofu; arroz o boniato en lugar de patata.',tip:'Una cena sencilla no necesita eliminar los carbohidratos.'},
    {title:'Un plato completo con lo que tengas',description:'Aprovecha verduras y arroz o legumbres preparados, y añade una fuente de proteína.',tile:4,swap:'Cambia ingredientes manteniendo una combinación que te sacie.',tip:'Ajusta la cantidad a tu hambre y al resto del día.'},
  ],
  snack:[
    {title:'Fruta, yogur y almendras',description:'Una combinación fácil de llevar para los días en que necesites una merienda.',tile:7,swap:'Otra fruta, yogur sin lactosa o frutos secos distintos.',tip:'La merienda es opcional: organízala según tu apetito y horarios.'},
    {title:'Un bol de yogur y fruta',description:'Yogur natural con fruta; añade avena si necesitas algo más consistente.',tile:0,swap:'Alternativa de soja enriquecida o queso fresco batido.',tip:'Los productos específicos varían: comprueba su etiqueta.'},
  ],
}

export function NutritionScreen(){
  const [category,setCategory]=useStored<FoodCategory>('nutritionCategory','breakfast')
  const [day,setDay]=useState(new Date().getDay())
  const selected=menu.find(item=>item.day===day)!,total=dayNutrients(selected)
  const activeCategory=Object.keys(foodIdeas).includes(category)?category:'breakfast'
  return <div className="food-guide">
    <div className="food-tabs" role="group" aria-label="Tipo de comida">
      {([['breakfast','Desayunos'],['lunch','Comidas'],['dinner','Cenas'],['snack','Meriendas']] as const).map(([id,label])=>
        <button key={id} className={activeCategory===id?'active':''} aria-pressed={activeCategory===id} onClick={()=>setCategory(id)}>{label}</button>)}
    </div>
    <div className="food-recipes">
      {foodIdeas[activeCategory].map(idea=><details key={idea.title} className="food-recipe">
        <summary>
          <img src={'./food/'+idea.tile+'.jpg'} alt="" loading="lazy" width="112" height="88"/>
          <span>{idea.title}</span><ChevronDown size={18} aria-hidden="true"/>
        </summary>
        <div className="food-recipe-body">
          <p>{idea.description}</p><h3>Alternativas</h3><p>{idea.swap}</p><p className="food-tip">{idea.tip}</p>
        </div>
      </details>)}
    </div>
    <section className="card food-reference" aria-label="Referencias de alimentación">
      <details>
        <summary>Menú semanal de referencia</summary>
        <label>Día del menú<select value={day} onChange={event=>setDay(+event.target.value)}>
          {menu.map(item=><option key={item.day} value={item.day}>{item.name}</option>)}
        </select></label>
        {selected.meals.map(meal=><div className="menu-reference" key={meal.id}>
          <h3>{meal.name}</h3>
          <ul>{meal.ingredients.map(i=><li key={i.foodId}><span>{foods[i.foodId].name}</span><span>{fmt(i.amount)} {foods[i.foodId].unit==='unit'?'ud.':'g'}</span></li>)}</ul>
          {!!meal.alternatives?.length&&<p className="small-note">Alternativas: {meal.alternatives.join(' · ')}</p>}
        </div>)}
        <p className="small-note">Estimación del día: {fmt(total.kcal)} kcal · proteína {fmt(total.protein)} g · carbohidratos {fmt(total.carbs)} g · grasas {fmt(total.fat)} g.</p>
        <p className="source-note">Los valores genéricos proceden principalmente de <a href="https://fdc.nal.usda.gov/data-documentation/" target="_blank" rel="noreferrer">USDA FoodData Central</a>. Comprueba la etiqueta de cada producto. Las cantidades se indican en crudo, salvo que se especifique otra cosa. El menú es orientativo.</p>
      </details>
      <details>
        <summary>Cómo combinar tus comidas</summary>
        <p>Combina alimentos que aporten proteína, verduras o fruta, carbohidratos y grasas que te gusten. Ajusta las cantidades a tu apetito y actividad.</p>
        <p>Antes de entrenar, elige algo que digieras bien y deja el tiempo que necesites. Después puedes volver a tus comidas habituales.</p>
      </details>
    </section>
  </div>
}
