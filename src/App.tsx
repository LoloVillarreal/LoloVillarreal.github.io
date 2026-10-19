import { useEffect, useMemo, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Apple, Calculator, Check, ChevronRight, CircleHelp, Dumbbell, Flame, HeartPulse, Home, Moon, MoreHorizontal, Pause, Play, RefreshCw, Salad, Settings, Share, ShoppingBasket, Sun, Timer, TrendingUp, Upload, WifiOff, X } from 'lucide-react'
import { workoutDays, twelveWeekPlan, hevyExport } from './data/training'
import { foods, menu } from './data/nutrition'
import { tips } from './data/tips'
import { bmi, carbsForCalories, dayNutrients, ingredientNutrients, macroCalories, maintenanceRange, mealNutrients, mifflin, movingAverage, progressionSuggestion, weeklyAdherence, workingVolume } from './lib/calculations'
import { backupJson, download, progressCsv, workoutsCsv } from './lib/files'
import { clearAll, defaultSettings, getAll, getKV, importBackup, loadBackup, put, remove, setKV, validateBackup } from './lib/db'
import type { AppSettings, CardioLog, Meal, NavSection, ProgressLog, SetLog, WorkoutLog } from './types'

const fmt=(n:number,digits=0)=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:digits}).format(n)
const isoToday=()=>new Date().toLocaleDateString('en-CA')
const uid=()=>crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
const mondayOf=(date=new Date())=>{const d=new Date(date);const diff=(d.getDay()+6)%7;d.setDate(d.getDate()-diff);return d.toLocaleDateString('en-CA')}
const dateLabel=(date=new Date())=>new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(date)

function App(){
  const [section,setSection]=useState<NavSection>('home')
  const [workoutLogs,setWorkoutLogs]=useState<WorkoutLog[]>([])
  const [cardioLogs,setCardioLogs]=useState<CardioLog[]>([])
  const [progressLogs,setProgressLogs]=useState<ProgressLog[]>([])
  const [mealChecks,setMealChecks]=useState<Record<string,boolean>>({})
  const [settings,setSettings]=useState<AppSettings>(defaultSettings)
  const [ready,setReady]=useState(false)
  const [online,setOnline]=useState(navigator.onLine)
  const [toast,setToast]=useState('')
  const [timerSeconds,setTimerSeconds]=useState(0)
  const [timerRunning,setTimerRunning]=useState(false)
  const timerRef=useRef<number>()
  const {needRefresh:[needRefresh],updateServiceWorker}=useRegisterSW()

  const reload=async()=>{
    const [w,c,p,m,s]=await Promise.all([getAll<WorkoutLog>('workoutLogs'),getAll<CardioLog>('cardioLogs'),getAll<ProgressLog>('progressLogs'),getKV<Record<string,boolean>>('mealChecks',{}),getKV<AppSettings>('settings',defaultSettings)])
    setWorkoutLogs(w);setCardioLogs(c);setProgressLogs(p);setMealChecks(m);setSettings({...defaultSettings,...s});setReady(true)
  }
  useEffect(()=>{reload()},[])
  useEffect(()=>{document.documentElement.classList.toggle('dark',settings.darkMode)},[settings.darkMode])
  useEffect(()=>{const on=()=>setOnline(navigator.onLine);addEventListener('online',on);addEventListener('offline',on);return()=>{removeEventListener('online',on);removeEventListener('offline',on)}},[])
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(t)}},[toast])
  useEffect(()=>{if(timerRunning&&timerSeconds>0){timerRef.current=window.setInterval(()=>setTimerSeconds(v=>v-1),1000);return()=>clearInterval(timerRef.current)}if(timerSeconds<=0)setTimerRunning(false)},[timerRunning,timerSeconds])
  const saveSettings=async(next:AppSettings)=>{setSettings(next);await setKV('settings',next)}
  const setTimer=(seconds:number)=>{setTimerSeconds(seconds);setTimerRunning(true)}

  if(!ready)return <div className="splash"><div className="logo-mark">G</div><p>Cargando tus datos…</p></div>

  return <div className="app-shell">
    {!online&&<div className="offline-banner"><WifiOff size={16}/> Sin conexión · tus datos locales siguen disponibles</div>}
    {needRefresh&&<div className="update-banner"><RefreshCw size={18}/><span>Hay una versión nueva disponible.</span><button onClick={()=>updateServiceWorker(true)}>Actualizar</button></div>}
    <header className="topbar"><div><span className="eyebrow">GLUTE & CORE</span><h1>{section==='home'?'Tu espacio':navTitle(section)}</h1></div><button className="icon-button" aria-label="Cambiar tema" onClick={()=>saveSettings({...settings,darkMode:!settings.darkMode})}>{settings.darkMode?<Sun/>:<Moon/>}</button></header>
    <main>
      {section==='home'&&<HomeScreen workoutLogs={workoutLogs} progressLogs={progressLogs} mealChecks={mealChecks} settings={settings} go={setSection}/>} 
      {section==='training'&&<TrainingScreen logs={workoutLogs} cardioLogs={cardioLogs} onSaved={reload} setTimer={setTimer} notify={setToast}/>} 
      {section==='nutrition'&&<NutritionScreen checks={mealChecks} setChecks={async next=>{setMealChecks(next);await setKV('mealChecks',next)}} settings={settings}/>} 
      {section==='progress'&&<ProgressScreen logs={progressLogs} workoutLogs={workoutLogs} onSaved={reload} hide={settings.hideSensitive} notify={setToast}/>} 
      {section==='more'&&<MoreScreen settings={settings} saveSettings={saveSettings} workoutLogs={workoutLogs} progressLogs={progressLogs} onReload={reload} notify={setToast}/>} 
    </main>
    {timerSeconds>0&&<div className="floating-timer" role="timer"><Timer size={18}/><strong>{Math.floor(timerSeconds/60)}:{String(timerSeconds%60).padStart(2,'0')}</strong><button onClick={()=>setTimerRunning(v=>!v)} aria-label={timerRunning?'Pausar':'Continuar'}>{timerRunning?<Pause size={17}/>:<Play size={17}/>}</button><button onClick={()=>{setTimerRunning(false);setTimerSeconds(0)}} aria-label="Cerrar"><X size={17}/></button></div>}
    {toast&&<div className="toast" role="status">{toast}</div>}
    <BottomNav value={section} onChange={setSection}/>
  </div>
}

const navTitle=(s:NavSection)=>({home:'Inicio',training:'Entrenamiento',nutrition:'Nutrición',progress:'Progreso',more:'Más herramientas'}[s])
function BottomNav({value,onChange}:{value:NavSection;onChange:(v:NavSection)=>void}){
  const items:[NavSection,string,typeof Home][]=[['home','Inicio',Home],['training','Entreno',Dumbbell],['nutrition','Nutrición',Salad],['progress','Progreso',TrendingUp],['more','Más',MoreHorizontal]]
  return <nav className="bottom-nav" aria-label="Navegación principal">{items.map(([id,label,Icon])=><button key={id} className={value===id?'active':''} onClick={()=>onChange(id)} aria-current={value===id?'page':undefined}><Icon/><span>{label}</span></button>)}</nav>
}

function HomeScreen({workoutLogs,progressLogs,mealChecks,settings,go}:{workoutLogs:WorkoutLog[];progressLogs:ProgressLog[];mealChecks:Record<string,boolean>;settings:AppSettings;go:(s:NavSection)=>void}){
  const now=new Date();const day=workoutDays.find(x=>x.day===now.getDay())!;const todayMenu=menu.find(x=>x.day===now.getDay())!;const nutrients=dayNutrients(todayMenu)
  const adherence=weeklyAdherence(workoutLogs,mondayOf(now));const completedMeals=todayMenu.meals.filter(m=>mealChecks[`${isoToday()}-${m.id}`]).length
  const next=workoutDays.slice().sort((a,b)=>((a.day-now.getDay()+7)%7)-((b.day-now.getDay()+7)%7)).find(x=>x.type!=='recovery'&&x.day!==now.getDay())
  return <>
    <section className="hero-card"><div><p className="eyebrow">{dateLabel(now)}</p><h2>{day.type==='cardio'?'Hoy toca cardio':day.type==='strength'?day.title:'Hoy toca recuperar'}</h2><p>{day.objective}</p></div><button className="primary" onClick={()=>go('training')}>{day.type==='recovery'?'Ver semana':'Abrir sesión'}<ChevronRight/></button></section>
    <div className="metric-grid">
      <Metric label="Progreso semanal" value={`${adherence}%`} sub="de las 4 sesiones previstas" />
      <Metric label="Comidas de hoy" value={`${completedMeals}/4`} sub={`${fmt(nutrients.kcal)} kcal en el menú base`} />
      <Metric label="Proteína objetivo" value={`${settings.proteinTarget} g`} sub={`${fmt(nutrients.protein)} g en el menú base`} />
    </div>
    <section className="card"><div className="section-head"><div><p className="eyebrow">A CONTINUACIÓN</p><h2>Próxima sesión</h2></div><Dumbbell/></div><h3>{next?.label} · {next?.title}</h3><p>{next?.objective}</p></section>
    <section className="card"><div className="section-head"><h2>Últimos registros</h2><button className="text-button" onClick={()=>go('progress')}>Ver progreso</button></div>{progressLogs.length?<div className="list-row"><div><strong>{progressLogs.sort((a,b)=>b.date.localeCompare(a.date))[0].date}</strong><p>Energía y medidas registradas</p></div><span>{settings.hideSensitive?'Oculto':`${progressLogs[0].weight??'—'} kg`}</span></div>:<Empty text="Todavía no hay mediciones. Puedes registrar solo lo que te resulte útil."/>}</section>
    <p className="kind-note">La constancia no exige perfección. Una sesión adaptada o un día de descanso también pueden ser buenas decisiones.</p>
  </>
}
function Metric({label,value,sub}:{label:string;value:string;sub:string}){return <article className="metric"><p>{label}</p><strong>{value}</strong><small>{sub}</small></article>}

function TrainingScreen({logs,cardioLogs,onSaved,setTimer,notify}:{logs:WorkoutLog[];cardioLogs:CardioLog[];onSaved:()=>Promise<void>;setTimer:(s:number)=>void;notify:(s:string)=>void}){
  const [day,setDay]=useState(new Date().getDay())
  const selected=workoutDays.find(x=>x.day===day)??workoutDays[0]
  return <>
    <div className="day-scroller">{[1,2,3,4,5,6,0].map(n=>{const d=workoutDays.find(x=>x.day===n)!;return <button className={day===n?'active':''} onClick={()=>setDay(n)} key={n}><span>{d.label.slice(0,3)}</span><b>{d.type==='strength'?'F':d.type==='cardio'?'C':'·'}</b></button>})}</div>
    <section className="card session-heading"><div><p className="eyebrow">{selected.label.toUpperCase()}</p><h2>{selected.title}</h2><p>{selected.objective}</p></div>{selected.optional&&<span className="status">Opcional</span>}</section>
    {selected.type==='cardio'?<CardioLogger logs={cardioLogs} onSaved={onSaved} notify={notify}/>:selected.type==='recovery'?<Recovery/>:<>
      <div className="info-strip"><span>Series efectivas</span><span>RIR 1–3</span><span>Doble progresión</span></div>
      {selected.exercises.map(ex=><ExerciseLogger key={ex.id} exercise={ex} day={selected.day} dayTitle={selected.title} logs={logs} onSaved={onSaved} setTimer={setTimer} notify={notify}/>) }
      <TrainingStats logs={logs}/>
    </>}
    <section className="card"><h2>Plan de 12 semanas</h2>{twelveWeekPlan.map(x=><div className="phase" key={x.weeks}><b>Semanas {x.weeks}</b><div><strong>{x.name}</strong><p>{x.guidance}</p></div></div>)}</section>
  </>
}

function ExerciseLogger({exercise,day,dayTitle,logs,onSaved,setTimer,notify}:{exercise:(typeof workoutDays)[number]['exercises'][number];day:number;dayTitle:string;logs:WorkoutLog[];onSaved:()=>Promise<void>;setTimer:(s:number)=>void;notify:(s:string)=>void}){
  const makeSets=():SetLog[]=>Array.from({length:exercise.sets},(_,i)=>({set:i+1,kind:'working',weight:undefined,reps:exercise.unit==='seconds'?undefined:exercise.reps[0],seconds:exercise.unit==='seconds'?exercise.reps[0]:undefined,rir:exercise.rir[1],done:false}))
  const [open,setOpen]=useState(false);const [sets,setSets]=useState<SetLog[]>(makeSets);const [notes,setNotes]=useState('');const [fatigue,setFatigue]=useState(3);const [discomfort,setDiscomfort]=useState('');const [warmup,setWarmup]=useState(false)
  const last=logs.filter(x=>x.exerciseId===exercise.id&&x.completed).sort((a,b)=>b.date.localeCompare(a.date))[0]
  const best=logs.filter(x=>x.exerciseId===exercise.id).flatMap(x=>x.sets).filter(s=>s.done).sort((a,b)=>(b.weight??0)-(a.weight??0)|| (b.reps??0)-(a.reps??0))[0]
  const update=(i:number,key:keyof SetLog,value:number|boolean)=>setSets(s=>s.map((x,n)=>n===i?{...x,[key]:value}:x))
  const save=async()=>{if(!sets.some(s=>s.done)){notify('Marca al menos una serie completada.');return}await put('workoutLogs',{id:uid(),date:isoToday(),workoutDay:day,workoutTitle:dayTitle,exerciseId:exercise.id,exerciseName:exercise.name,sets,notes,fatigue,discomfort,completed:true} satisfies WorkoutLog);notify('Ejercicio guardado');setOpen(false);await onSaved()}
  const addWarmup=()=>{setWarmup(true);setSets(s=>[{set:0,kind:'warmup',weight:undefined,reps:8,rir:4,done:false},...s])}
  return <section className="card exercise-card"><button className="exercise-summary" onClick={()=>setOpen(v=>!v)} aria-expanded={open}><div><span className="hevy-id">{exercise.hevyName} · {exercise.hevyId}</span><h3>{exercise.name}</h3><p>{exercise.sets} × {exercise.reps[0]}–{exercise.reps[1]}{exercise.perSide?' por lado':''} · RIR {exercise.rir.join('–')}</p></div><ChevronRight className={open?'rotate':''}/></button>
    {open&&<div className="exercise-detail"><p>{exercise.technique}</p>{exercise.avoid&&<p className="warning">{exercise.avoid}</p>}<p><b>Alternativa:</b> {exercise.alternatives.join(' · ')}</p>
      {last&&<div className="last-session"><strong>Última sesión · {last.date}</strong><span>{last.sets.filter(s=>s.done).map(s=>`${s.weight??'—'} kg × ${s.reps??`${s.seconds}s`}`).join(' · ')}</span><small>Volumen: {fmt(workingVolume(last.sets))} kg · {progressionSuggestion(logs,exercise.id,exercise.reps[1],exercise.rir[1])}</small>{best&&<small>Récord registrado: {best.weight??'—'} kg × {best.reps??`${best.seconds}s`}</small>}</div>}
      <div className="set-table"><div className="set-row labels"><span>Serie</span><span>{exercise.unit==='seconds'?'Seg.':'kg'}</span><span>{exercise.unit==='seconds'?'RIR':'Reps'}</span><span>RIR</span><span>✓</span></div>{sets.map((s,i)=><div className={`set-row ${s.kind}`} key={`${s.kind}-${i}`}><span>{s.kind==='warmup'?'C':s.set}</span>{exercise.unit==='seconds'?<><input aria-label="Segundos" type="number" value={s.seconds??''} onChange={e=>update(i,'seconds',+e.target.value)}/><span>—</span></>:<><input aria-label="Peso en kg" type="number" step=".5" value={s.weight??''} onChange={e=>update(i,'weight',+e.target.value)}/><input aria-label="Repeticiones" type="number" value={s.reps??''} onChange={e=>update(i,'reps',+e.target.value)}/></>}<input aria-label="RIR" type="number" min="0" max="5" value={s.rir??''} onChange={e=>update(i,'rir',+e.target.value)}/><input aria-label="Completada" type="checkbox" checked={s.done} onChange={e=>{update(i,'done',e.target.checked);if(e.target.checked)setTimer(exercise.rest[1])}}/></div>)}</div>
      <div className="button-row">{!warmup&&<button className="secondary" onClick={addWarmup}>+ Calentamiento</button>}<button className="secondary" onClick={()=>setTimer(exercise.rest[1])}><Timer size={17}/> {exercise.rest[1]} s</button></div>
      <div className="form-grid"><label>Fatiga · {fatigue}/5<input type="range" min="1" max="5" value={fatigue} onChange={e=>setFatigue(+e.target.value)}/></label><label>Molestia específica<input value={discomfort} onChange={e=>setDiscomfort(e.target.value)} placeholder="Opcional"/></label></div><label>Notas<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Técnica, sensaciones…"/></label><button className="primary full" onClick={save}><Check/>Guardar ejercicio</button>
    </div>}
  </section>
}

function TrainingStats({logs}:{logs:WorkoutLog[]}){
  const lookup=new Map(workoutDays.flatMap(d=>d.exercises).map(e=>[e.id,e.muscle]))
  const monday=new Date(`${mondayOf()}T00:00:00`);const end=new Date(monday);end.setDate(end.getDate()+7)
  const current=logs.filter(x=>{const d=new Date(`${x.date}T12:00:00`);return d>=monday&&d<end})
  const volumes=Object.entries(current.reduce<Record<string,number>>((acc,x)=>{const muscle=lookup.get(x.exerciseId)??'Otros';acc[muscle]=(acc[muscle]??0)+workingVolume(x.sets);return acc},{})).map(([grupo,volumen])=>({grupo,volumen:Math.round(volumen)}))
  const avgFatigue=current.filter(x=>x.fatigue).reduce((s,x)=>s+(x.fatigue??0),0)/Math.max(1,current.filter(x=>x.fatigue).length)
  return <section className="card chart-card"><h2>Volumen semanal por grupo</h2>{volumes.length?<ResponsiveContainer width="100%" height={190}><BarChart data={volumes}><XAxis dataKey="grupo" fontSize={10}/><YAxis/><Tooltip/><Bar dataKey="volumen" fill="#839B84" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer>:<Empty text="Aparecerá al completar series esta semana."/>}{avgFatigue>=4&&<p className="warning">La fatiga media registrada es alta. Considera reducir series o usar una semana de descarga.</p>}<p className="small-note">Volumen = carga × repeticiones en series efectivas. No sirve para comparar directamente ejercicios distintos.</p></section>
}

function CardioLogger({logs,onSaved,notify}:{logs:CardioLog[];onSaved:()=>Promise<void>;notify:(s:string)=>void}){
  const [form,setForm]=useState({modality:'Caminata' as CardioLog['modality'],duration:30,distance:'',rpe:5,notes:''})
  const save=async()=>{if(form.duration<1)return notify('Indica una duración válida.');await put('cardioLogs',{id:uid(),date:isoToday(),modality:form.modality,duration:form.duration,distance:form.distance?+form.distance:undefined,rpe:form.rpe,notes:form.notes});notify('Cardio guardado');onSaved()}
  return <section className="card"><div className="cardio-icon"><HeartPulse/></div><h2>Registrar cardio</h2><p>25–45 minutos moderados es una referencia, no una obligación. Ajusta la sesión a tu recuperación.</p><div className="form-grid"><label>Modalidad<select value={form.modality} onChange={e=>setForm({...form,modality:e.target.value as CardioLog['modality']})}>{['Caminata','Bicicleta','Elíptica','Carrera','Otro'].map(x=><option key={x}>{x}</option>)}</select></label><label>Duración (min)<input type="number" value={form.duration} onChange={e=>setForm({...form,duration:+e.target.value})}/></label><label>Distancia (km, opcional)<input type="number" step=".1" value={form.distance} onChange={e=>setForm({...form,distance:e.target.value})}/></label><label>Esfuerzo percibido · {form.rpe}/10<input type="range" min="1" max="10" value={form.rpe} onChange={e=>setForm({...form,rpe:+e.target.value})}/></label></div><label>Notas<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><button className="primary full" onClick={save}>Guardar cardio</button>{logs.length>0&&<p className="small-note">Último registro: {logs.sort((a,b)=>b.date.localeCompare(a.date))[0].date}</p>}</section>
}
function Recovery(){return <section className="card empty-card"><span>🌿</span><h2>Sin fuerza programada</h2><p>Descansar, caminar o hacer movilidad son opciones válidas. No hay un objetivo rígido de pasos.</p></section>}

function NutritionScreen({checks,setChecks,settings}:{checks:Record<string,boolean>;setChecks:(v:Record<string,boolean>)=>void;settings:AppSettings}){
  const [day,setDay]=useState(new Date().getDay());const [portion,setPortion]=useState(1);const [shopping,setShopping]=useState(false);const selected=menu.find(x=>x.day===day)??menu[0];const totals=dayNutrients(selected,portion)
  const shop=useMemo(()=>{const result:Record<string,number>={};menu.forEach(d=>d.meals.forEach(m=>m.ingredients.forEach(i=>result[i.foodId]=(result[i.foodId]??0)+i.amount)));return Object.entries(result).sort((a,b)=>foods[a[0]].name.localeCompare(foods[b[0]].name))},[])
  return <>
    <div className="day-scroller">{[1,2,3,4,5,6,0].map(n=>{const d=menu.find(x=>x.day===n)!;return <button className={day===n?'active':''} onClick={()=>setDay(n)} key={n}><span>{d.name.slice(0,3)}</span><b>{d.meals.filter(m=>checks[`${isoToday()}-${m.id}`]).length}/4</b></button>})}</div>
    <section className="macro-card"><div><p className="eyebrow">MENÚ BASE · {selected.name.toUpperCase()}</p><h2>{fmt(totals.kcal)} kcal</h2><p>P {fmt(totals.protein)} g · C {fmt(totals.carbs)} g · G {fmt(totals.fat)} g</p></div><select aria-label="Porción" value={portion} onChange={e=>setPortion(+e.target.value)}><option value=".75">75 %</option><option value="1">100 %</option><option value="1.25">125 %</option><option value="1.5">150 %</option></select></section>
    <div className="macro-bars"><MacroBar label="Proteína" value={totals.protein} target={settings.proteinTarget}/><MacroBar label="Carbohidratos" value={totals.carbs} target={settings.carbTarget}/><MacroBar label="Grasas" value={totals.fat} target={settings.fatTarget}/></div>
    {selected.meals.map(m=><MealCard key={m.id} meal={m} portion={portion} checked={!!checks[`${isoToday()}-${m.id}`]} onCheck={()=>setChecks({...checks,[`${isoToday()}-${m.id}`]:!checks[`${isoToday()}-${m.id}`]})}/>) }
    <button className="secondary full" onClick={()=>setShopping(v=>!v)}><ShoppingBasket/> {shopping?'Ocultar':'Ver'} lista de la compra</button>
    {shopping&&<section className="card"><h2>Compra semanal</h2><p className="small-note">Cantidades agregadas del menú base. Redondea según formatos de venta.</p>{shop.map(([id,amount])=><div className="list-row" key={id}><span>{foods[id].name}</span><b>{foods[id].unit==='unit'?`${amount} ud.`:`${amount>=1000?`${fmt(amount/1000,2)} kg`:`${fmt(amount)} g`}`}</b></div>)}</section>}
    <p className="source-note">Arroz, pasta, avena y legumbres se muestran en crudo; carnes y pescados, en crudo. Valores por 100 g basados principalmente en USDA FoodData Central; productos de marca pueden variar. Revisa siempre la etiqueta.</p>
  </>
}
function MacroBar({label,value,target}:{label:string;value:number;target:number}){return <div><span><b>{label}</b><small>{fmt(value)} / {target} g</small></span><div className="bar"><i style={{width:`${Math.min(100,value/target*100)}%`}}/></div></div>}
function MealCard({meal,portion,checked,onCheck}:{meal:Meal;portion:number;checked:boolean;onCheck:()=>void}){const total=mealNutrients(meal,portion);return <section className={`card meal-card ${checked?'completed':''}`}><div className="section-head"><div><p className="eyebrow">{meal.name.toUpperCase()}</p><h2>{fmt(total.kcal)} kcal</h2></div><button className="check-button" onClick={onCheck} aria-label={checked?'Marcar pendiente':'Marcar completada'}>{checked?<Check/>:null}</button></div>{meal.ingredients.map(i=>{const f=foods[i.foodId],n=ingredientNutrients(i.foodId,i.amount*portion);return <div className="ingredient" key={i.foodId}><div><strong>{f.name}</strong><small>{f.source.startsWith('USDA')?'USDA genérico':'Valor de referencia'}</small></div><span>{fmt(i.amount*portion)} {f.unit==='unit'?'ud.':'g'}<small>{fmt(n.kcal)} kcal · P {fmt(n.protein,1)} · C {fmt(n.carbs,1)} · G {fmt(n.fat,1)}</small></span></div>})}{meal.alternatives?.length?<details><summary>Alternativas</summary><p>{meal.alternatives.join(' · ')}</p></details>:null}</section>}

function ProgressScreen({logs,workoutLogs,onSaved,hide,notify}:{logs:ProgressLog[];workoutLogs:WorkoutLog[];onSaved:()=>Promise<void>;hide:boolean;notify:(s:string)=>void}){
  const [form,setForm]=useState({date:isoToday(),weight:'',waist:'',hip:'',energy:3,sleep:8,notes:'',photo:''})
  const chart=movingAverage(logs).map(x=>({date:x.date.slice(5),peso:x.weight,media:+x.average.toFixed(2)}));const strength=workoutLogs.filter(x=>x.exerciseId.startsWith('hip-thrust')&&x.completed).sort((a,b)=>a.date.localeCompare(b.date)).map(x=>({date:x.date.slice(5),carga:Math.max(...x.sets.map(s=>s.weight??0))}))
  const pickPhoto=(file?:File)=>{if(!file)return; if(file.size>3_000_000)return notify('La foto debe ocupar menos de 3 MB.');const r=new FileReader();r.onload=()=>setForm({...form,photo:String(r.result)});r.readAsDataURL(file)}
  const save=async()=>{if(!form.date)return notify('Indica una fecha.');await put('progressLogs',{id:uid(),date:form.date,weight:form.weight?+form.weight:undefined,waist:form.waist?+form.waist:undefined,hip:form.hip?+form.hip:undefined,energy:form.energy,sleep:form.sleep,notes:form.notes,photo:form.photo||undefined});setForm({date:isoToday(),weight:'',waist:'',hip:'',energy:3,sleep:8,notes:'',photo:''});notify('Registro guardado');onSaved()}
  return <>
    <section className="card"><h2>Nueva entrada</h2><p>El peso y las medidas son opcionales. La tendencia importa más que un dato aislado.</p><div className="form-grid"><label>Fecha<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Peso (kg, opcional)<input type="number" step=".1" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})}/></label><label>Cintura (cm, opcional)<input type="number" step=".1" value={form.waist} onChange={e=>setForm({...form,waist:e.target.value})}/></label><label>Cadera (cm, opcional)<input type="number" step=".1" value={form.hip} onChange={e=>setForm({...form,hip:e.target.value})}/></label><label>Energía · {form.energy}/5<input type="range" min="1" max="5" value={form.energy} onChange={e=>setForm({...form,energy:+e.target.value})}/></label><label>Sueño (horas)<input type="number" min="0" max="16" step=".5" value={form.sleep} onChange={e=>setForm({...form,sleep:+e.target.value})}/></label></div><label>Notas<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><label className="file-label"><Upload/> Foto opcional, solo en este dispositivo<input type="file" accept="image/*" onChange={e=>pickPhoto(e.target.files?.[0])}/></label>{form.photo&&<img className="photo-preview" src={form.photo} alt="Vista previa privada"/>}<p className="privacy-note">Las fotos se guardan en IndexedDB. Pueden perderse al borrar los datos de Safari e incrementan el tamaño de la copia de seguridad.</p><button className="primary full" onClick={save}>Guardar entrada</button></section>
    <section className="card chart-card"><h2>Tendencia de peso</h2>{chart.length?<ResponsiveContainer width="100%" height={220}><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date"/><YAxis domain={['dataMin - 1','dataMax + 1']} hide={hide}/><Tooltip formatter={(v)=>hide?'Oculto':`${v} kg`}/><Line type="monotone" dataKey="peso" stroke="#E7907B" dot={false}/><Line type="monotone" dataKey="media" stroke="#5F715D" strokeWidth={3}/></LineChart></ResponsiveContainer>:<Empty text="Registra un peso si quieres ver su tendencia."/>}<p className="small-note">La línea verde es el promedio móvil de 3 registros.</p></section>
    <section className="card chart-card"><h2>Fuerza en hip thrust</h2>{strength.length?<ResponsiveContainer width="100%" height={200}><AreaChart data={strength}><XAxis dataKey="date"/><YAxis/><Tooltip/><Area dataKey="carga" stroke="#5F715D" fill="#839B8466"/></AreaChart></ResponsiveContainer>:<Empty text="Aparecerá al guardar sesiones de hip thrust."/>}</section>
    <section className="card"><h2>Historial</h2>{logs.sort((a,b)=>b.date.localeCompare(a.date)).map(x=><div className="history-row" key={x.id}><div><strong>{x.date}</strong><p>Energía {x.energy}/5 · Sueño {x.sleep} h</p></div><div><span>{hide?'•••':x.weight?`${x.weight} kg`:'—'}</span><button aria-label="Eliminar" onClick={async()=>{await remove('progressLogs',x.id);onSaved()}}><X/></button></div></div>)}</section>
  </>
}

function MoreScreen({settings,saveSettings,workoutLogs,progressLogs,onReload,notify}:{settings:AppSettings;saveSettings:(s:AppSettings)=>Promise<void>;workoutLogs:WorkoutLog[];progressLogs:ProgressLog[];onReload:()=>Promise<void>;notify:(s:string)=>void}){
  const [tab,setTab]=useState<'calc'|'tips'|'settings'>('calc')
  return <><div className="segmented"><button className={tab==='calc'?'active':''} onClick={()=>setTab('calc')}><Calculator/>Cálculos</button><button className={tab==='tips'?'active':''} onClick={()=>setTab('tips')}><CircleHelp/>Consejos</button><button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}><Settings/>Ajustes</button></div>{tab==='calc'?<Calculators logs={progressLogs}/>:tab==='tips'?<Tips/>:<SettingsScreen settings={settings} saveSettings={saveSettings} workoutLogs={workoutLogs} progressLogs={progressLogs} onReload={onReload} notify={notify}/>}</>
}
function Calculators({logs}:{logs:ProgressLog[]}){
  const [v,setV]=useState({age:24,height:158,weight:54.5,activity:1.55,sex:'female' as 'female'|'male',calories:1900,protein:110,fat:60})
  const b=bmi(v.weight,v.height),basal=mifflin({weightKg:v.weight,heightCm:v.height,age:v.age,sex:v.sex}),maint=maintenanceRange(basal,v.activity),carbs=carbsForCalories(v.calories,v.protein,v.fat),sum=macroCalories(v.protein,carbs,v.fat)
  const whr=logs.filter(x=>x.waist&&x.hip).sort((a,b)=>b.date.localeCompare(a.date))[0]
  return <><section className="card"><h2>IMC y energía</h2><div className="form-grid"><label>Edad<input type="number" value={v.age} onChange={e=>setV({...v,age:+e.target.value})}/></label><label>Altura (cm)<input type="number" value={v.height} onChange={e=>setV({...v,height:+e.target.value})}/></label><label>Peso (kg)<input type="number" step=".1" value={v.weight} onChange={e=>setV({...v,weight:+e.target.value})}/></label><label>Fórmula<select value={v.sex} onChange={e=>setV({...v,sex:e.target.value as 'female'|'male'})}><option value="female">Mifflin mujer</option><option value="male">Mifflin hombre</option></select></label><label>Actividad<select value={v.activity} onChange={e=>setV({...v,activity:+e.target.value})}><option value="1.2">Sedentaria</option><option value="1.375">Ligera</option><option value="1.55">Moderada</option><option value="1.725">Alta</option></select></label></div><div className="result-grid"><Metric label="IMC" value={fmt(b,1)} sub="No mide grasa corporal"/><Metric label="Metabolismo basal" value={`${fmt(basal)} kcal`} sub="Energía en reposo"/><Metric label="Mantenimiento" value={`${fmt(maint.low)}–${fmt(maint.high)}`} sub={`Centro estimado ${fmt(maint.center)} kcal`}/></div><p className="source-note">Mifflin-St Jeor es una estimación poblacional. Ajusta el mantenimiento con la tendencia real de 2–3 semanas.</p></section>
    <section className="card"><h2>Macronutrientes</h2><div className="form-grid"><label>Calorías<input type="number" value={v.calories} onChange={e=>setV({...v,calories:+e.target.value})}/></label><label>Proteína (g)<input type="number" value={v.protein} onChange={e=>setV({...v,protein:+e.target.value})}/></label><label>Grasas (g)<input type="number" value={v.fat} onChange={e=>setV({...v,fat:+e.target.value})}/></label></div><div className="result-callout"><b>{fmt(v.protein)} g proteína · {fmt(v.fat)} g grasas · {fmt(carbs)} g carbohidratos</b><span>Suma: {fmt(sum)} kcal</span></div></section>
    {whr&&<section className="card"><h2>Relación cintura/cadera</h2><div className="big-value">{fmt((whr.waist! / whr.hip!),2)}</div><p>Indicador opcional y contextual, no una calificación de tu cuerpo ni un diagnóstico.</p></section>}
  </>
}
function Tips(){return <section className="card"><h2>Guía práctica</h2>{tips.map(([title,text])=><details key={title}><summary>{title}</summary><p>{text}</p></details>)}</section>}

function SettingsScreen({settings,saveSettings,workoutLogs,progressLogs,onReload,notify}:{settings:AppSettings;saveSettings:(s:AppSettings)=>Promise<void>;workoutLogs:WorkoutLog[];progressLogs:ProgressLog[];onReload:()=>Promise<void>;notify:(s:string)=>void}){
  const fileRef=useRef<HTMLInputElement>(null)
  const exportAll=async()=>download(backupJson(await loadBackup()),`glute-core-copia-${isoToday()}.json`)
  const importFile=async(file?:File)=>{if(!file)return;try{const data=JSON.parse(await file.text());if(!validateBackup(data))throw new Error();await importBackup(data);await onReload();notify('Copia restaurada correctamente.')}catch{notify('El archivo no es una copia válida.')}}
  return <>
    <section className="card"><h2>Privacidad y visualización</h2><Toggle label="Modo oscuro" value={settings.darkMode} onChange={v=>saveSettings({...settings,darkMode:v})}/><Toggle label="Ocultar peso y medidas" value={settings.hideSensitive} onChange={v=>saveSettings({...settings,hideSensitive:v})}/><p className="privacy-note">Los datos permanecen en este dispositivo. Safari puede eliminarlos si borras los datos del sitio. No hay sincronización entre dispositivos.</p></section>
    <section className="card"><h2>Objetivos editables</h2><div className="form-grid"><label>Calorías<input type="number" value={settings.calorieTarget} onChange={e=>saveSettings({...settings,calorieTarget:+e.target.value})}/></label><label>Proteína (g)<input type="number" value={settings.proteinTarget} onChange={e=>saveSettings({...settings,proteinTarget:+e.target.value})}/></label><label>Grasas (g)<input type="number" value={settings.fatTarget} onChange={e=>saveSettings({...settings,fatTarget:+e.target.value})}/></label><label>Carbohidratos (g)<input type="number" value={settings.carbTarget} onChange={e=>saveSettings({...settings,carbTarget:+e.target.value})}/></label></div></section>
    <section className="card"><h2>Copias de seguridad</h2><div className="button-stack"><button className="primary" onClick={exportAll}><Share/>Exportar copia JSON</button><button className="secondary" onClick={()=>fileRef.current?.click()}><Upload/>Importar copia JSON</button><button className="secondary" onClick={()=>download(progressCsv(progressLogs),`progreso-${isoToday()}.csv`,'text/csv')} disabled={!progressLogs.length}>Exportar progreso CSV</button><button className="secondary" onClick={()=>download(workoutsCsv(workoutLogs),`entrenos-${isoToday()}.csv`,'text/csv')} disabled={!workoutLogs.length}>Exportar entrenos CSV</button><button className="secondary" onClick={()=>download(JSON.stringify(hevyExport(),null,2),'rutina-hevy-compatible.json')}>Exportar rutina para Hevy</button><input ref={fileRef} hidden type="file" accept="application/json" onChange={e=>importFile(e.target.files?.[0])}/></div></section>
    <section className="card install-card"><Apple/><div><h2>Instalar en iPhone</h2><ol><li>Abre esta web en Safari.</li><li>Toca Compartir.</li><li>Elige “Añadir a pantalla de inicio”.</li><li>Activa “Abrir como app web” y toca Añadir.</li></ol><p>La producción debe usar HTTPS. Las actualizaciones aparecerán dentro de la app y no requieren reinstalar.</p></div></section>
    <section className="card danger-zone"><h2>Borrar datos</h2><p>Esta acción elimina registros, fotos, comidas marcadas y ajustes de este dispositivo.</p><button onClick={async()=>{if(confirm('¿Borrar todos los datos locales? No se puede deshacer.')){await clearAll();await onReload();notify('Datos locales eliminados.')}}}>Borrar todo</button></section>
  </>
}
function Toggle({label,value,onChange}:{label:string;value:boolean;onChange:(v:boolean)=>void}){return <label className="toggle-row"><span>{label}</span><input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)}/></label>}
function Empty({text}:{text:string}){return <div className="empty"><span>·</span><p>{text}</p></div>}

export default App
