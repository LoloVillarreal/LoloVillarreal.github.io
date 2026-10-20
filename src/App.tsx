import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Check, Dumbbell, Home, Moon, RefreshCw, Salad, Settings, Sparkles, Sun, TrendingUp, WifiOff } from 'lucide-react'
import { getAll, defaultSettings } from './lib/db'
import { StorageProvider, useStorage, useStored } from './lib/storage'
import { AccountProvider, useAccount } from './lib/account'
import { isoDate } from './lib/dates'
import { backupJson, download } from './lib/files'
import { currentTheme, themes } from './lib/appearance'
import { HomeScreen, TrainingScreen, NutritionScreen, ProgressScreen, MoreScreen } from './screens'
import type { AppSettings, CardioLog, NavSection, ProgressLog, WorkoutLog } from './types'

function App(){return <StorageProvider><AccountProvider><Workspace/></AccountProvider></StorageProvider>}

function Workspace(){
  const storage=useStorage()
  const account=useAccount()
  const [navigation,setNavigation]=useStored('navigation',()=>({day:isoDate(),section:'home' as NavSection,trainingDate:isoDate(),nutritionDate:isoDate(),tab:'settings' as 'calc'|'tips'|'settings'}))
  const [settings,saveSettings]=useStored<AppSettings>('settings',defaultSettings)
  const [checks]=useStored<Record<string,boolean>>('mealChecks',{})
  const [workoutLogs,setWorkoutLogs]=useState<WorkoutLog[]>([])
  const [cardioLogs,setCardioLogs]=useState<CardioLog[]>([])
  const [progressLogs,setProgressLogs]=useState<ProgressLog[]>([])
  const [ready,setReady]=useState(false)
  const [loadError,setLoadError]=useState(false)
  const [online,setOnline]=useState(navigator.onLine)
  const [toast,notify]=useState('')
  const [trainingDirty,setTrainingDirty]=useState(false)
  const [reader,setReader]=useState<{date:string;index:number}|null>(null)
  const [registration,setRegistration]=useState<ServiceWorkerRegistration>()
  const {needRefresh:[needRefresh],updateServiceWorker}=useRegisterSW({onRegisteredSW(_url,registration){
    setRegistration(registration)
  }})
  useEffect(()=>{
    if(!registration)return
    const check=()=>{if(navigator.onLine&&document.visibilityState==='visible')void registration.update().catch(()=>{})}
    check()
    const interval=window.setInterval(check,60000)
    window.addEventListener('focus',check);window.addEventListener('online',check)
    return()=>{clearInterval(interval);window.removeEventListener('focus',check);window.removeEventListener('online',check)}
  },[registration])
  const reload=async()=>{
    const [w,c,p]=await Promise.all([getAll<WorkoutLog>('workoutLogs'),getAll<CardioLog>('cardioLogs'),getAll<ProgressLog>('progressLogs')])
    setWorkoutLogs(w);setCardioLogs(c);setProgressLogs(p);setReady(true);setLoadError(false)
  }
  useEffect(()=>{void reload().catch(()=>setLoadError(true))},[])
  const theme=currentTheme(settings)
  useEffect(()=>{
    document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('glass',theme==='glass')
    document.documentElement.dataset.theme=theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='glass'?'#ffffff':theme==='dark'?'#18221e':'#f8f6f1')
  },[theme])
  useEffect(()=>setReader(null),[account.session?.user.id])
  useEffect(()=>{window.scrollTo(0,0)},[navigation.section])
  useEffect(()=>{
    const sync=()=>{setOnline(navigator.onLine);const day=isoDate();if(day!==navigation.day&&!trainingDirty)setNavigation(v=>({...v,day,section:'home',trainingDate:day,nutritionDate:day}))}
    const dayTick=window.setInterval(sync,30000)
    window.addEventListener('online',sync);window.addEventListener('offline',sync);window.addEventListener('focus',sync);document.addEventListener('visibilitychange',sync)
    sync()
    return()=>{clearInterval(dayTick);window.removeEventListener('online',sync);window.removeEventListener('offline',sync);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',sync)}
  },[navigation.day,trainingDirty])
  useEffect(()=>{if(toast){const id=setTimeout(()=>notify(''),4500);return()=>clearTimeout(id)}},[toast])
  const go=(section:NavSection,date?:string,tab?:'calc'|'tips'|'settings')=>{
    if(trainingDirty&&(section!==navigation.section||(date&&date!==navigation.trainingDate)||(tab&&tab!==navigation.tab))&&!confirm('Hay cambios sin guardar en tu rutina. ¿Quieres salir y descartarlos?'))return false
    setNavigation(v=>({...v,section,...(date?{trainingDate:date}:{}),...(tab?{tab}:{})}));return true
  }
  const startTraining=(date:string,index=0)=>{if(go('training',date))setReader({date,index})}
  const emergencyCopy=()=>download(backupJson({schemaVersion:2,exportedAt:new Date().toISOString(),workoutLogs,cardioLogs,progressLogs,mealChecks:checks,settings,localState:storage.values}),'plan-la-recuperacion.json')
  if(!ready)return <div className="splash"><Koala/><p>{loadError?'No se han podido leer tus registros.':'Recuperando tu plan…'}</p>{loadError&&<button className="primary" onClick={()=>reload().catch(()=>setLoadError(true))}>Reintentar</button>}</div>
  const section=navigation.section
  return <div className="app-shell">
    {!online&&<div className="offline-banner"><WifiOff size={16}/> Guía sin conexión · necesitas internet para sincronizar tus datos</div>}
    {needRefresh&&<div className="update-banner"><RefreshCw size={18}/><span>Nueva versión disponible</span><button disabled={trainingDirty||storage.saving||account.saving||!!storage.error||!!account.error} onClick={async()=>{try{await storage.flush();await account.flush();await updateServiceWorker(true)}catch{notify('Guarda los cambios antes de actualizar.')}}}>Actualizar</button></div>}
    <header className="topbar"><div className="brand"><Koala/><div><span className="eyebrow">PLAN Lolo & alexia</span><h1>{{home:'Tu guía',training:'Entrenamientos',nutrition:'Nutrición',progress:'Tu progreso',more:'Ajustes'}[section]}</h1></div></div><button className="icon-button theme-cycle" aria-label="Cambiar tema" title={`Tema: ${themes.find(item=>item.id===theme)?.label}`} onClick={()=>saveSettings(v=>{const next=themes[(themes.findIndex(item=>item.id===currentTheme(v))+1)%themes.length].id;return {...v,theme:next,darkMode:next==='dark'}})}>{theme==='glass'?<Sparkles/>:theme==='dark'?<Sun/>:<Moon/>}</button></header>
    <div className={`save-state ${storage.error?'failed':''}`} role="status" aria-live="polite">{storage.error?<><span>{storage.error}</span><button onClick={()=>storage.flush().catch(()=>{})}>Reintentar</button><button onClick={emergencyCopy}>Exportar cambios</button></>:<><Check size={14}/>{storage.saving?'Guardando preferencia…':'Tu guía disponible sin conexión'}</>}</div>
    <main className={`workspace workspace--${section}`}>
      {section==='home'&&<HomeScreen go={go} reader={reader} startTraining={startTraining}/>}
      {section==='training'&&<TrainingScreen date={navigation.trainingDate} setDate={date=>setNavigation(v=>({...v,trainingDate:date}))} notify={notify} reader={reader} setReader={setReader} onDirtyChange={setTrainingDirty}/>}
      {section==='nutrition'&&<NutritionScreen/>}
      {section==='progress'&&<ProgressScreen hide={settings.hideSensitive} notify={notify} onTraining={()=>go('training',isoDate())}/>}
      {section==='more'&&<MoreScreen tab={navigation.tab} setTab={tab=>setNavigation(v=>({...v,tab}))} settings={settings} saveSettings={saveSettings} legacyAvailable={workoutLogs.length+cardioLogs.length+progressLogs.length>0||Object.keys(checks).length>0} notify={notify}/>}
    </main>
    {toast&&<div className="toast" role="status">{toast}</div>}
    <nav className="bottom-nav" aria-label="Navegación principal">{([['home','Guía',Home],['training','Entrenos',Dumbbell],['nutrition','Nutrición',Salad],['progress','Progreso',TrendingUp],['more','Ajustes',Settings]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>go(id,undefined,id==='more'?'settings':undefined)} className={id===section?'active':''} aria-current={id===section?'page':undefined}><span className="nav-icon"><Icon aria-hidden="true"/></span><span>{label}</span></button>)}</nav>
  </div>
}

function Koala(){return <img className="koala-logo" src="./plan-la-koala.png" alt="Koala L&A" width="64" height="64"/>}
export default App
