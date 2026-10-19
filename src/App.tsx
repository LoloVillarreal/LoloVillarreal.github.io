import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Check, Dumbbell, Home, Moon, RefreshCw, Salad, Settings, Sun, TrendingUp, WifiOff } from 'lucide-react'
import { getAll, defaultSettings } from './lib/db'
import { StorageProvider, useStorage, useStored } from './lib/storage'
import { AccountProvider, useAccount } from './lib/account'
import { isoDate } from './lib/dates'
import { backupJson, download } from './lib/files'
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
  const {needRefresh:[needRefresh],updateServiceWorker}=useRegisterSW({onRegisteredSW(_url,registration){
    if(registration)window.addEventListener('focus',()=>{if(navigator.onLine)void registration.update().catch(()=>{})})
  }})
  const reload=async()=>{
    const [w,c,p]=await Promise.all([getAll<WorkoutLog>('workoutLogs'),getAll<CardioLog>('cardioLogs'),getAll<ProgressLog>('progressLogs')])
    setWorkoutLogs(w);setCardioLogs(c);setProgressLogs(p);setReady(true);setLoadError(false)
  }
  useEffect(()=>{void reload().catch(()=>setLoadError(true))},[])
  useEffect(()=>{document.documentElement.classList.toggle('dark',settings.darkMode)},[settings.darkMode])
  useEffect(()=>{window.scrollTo(0,0)},[navigation.section])
  useEffect(()=>{
    const sync=()=>{setOnline(navigator.onLine);const day=isoDate();if(day!==navigation.day)setNavigation(v=>({...v,day,section:'home',trainingDate:day,nutritionDate:day}))}
    const dayTick=window.setInterval(sync,30000)
    window.addEventListener('online',sync);window.addEventListener('offline',sync);window.addEventListener('focus',sync);document.addEventListener('visibilitychange',sync)
    sync()
    return()=>{clearInterval(dayTick);window.removeEventListener('online',sync);window.removeEventListener('offline',sync);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',sync)}
  },[navigation.day])
  useEffect(()=>{if(toast){const id=setTimeout(()=>notify(''),4500);return()=>clearTimeout(id)}},[toast])
  const go=(section:NavSection,date?:string,tab?:'calc'|'tips'|'settings')=>setNavigation(v=>({...v,section,...(date?{trainingDate:date}:{}),...(tab?{tab}:{})}))
  const emergencyCopy=()=>download(backupJson({schemaVersion:2,exportedAt:new Date().toISOString(),workoutLogs,cardioLogs,progressLogs,mealChecks:checks,settings,localState:storage.values}),'plan-la-recuperacion.json')
  if(!ready)return <div className="splash"><Koala/><p>{loadError?'No se han podido leer tus registros.':'Recuperando tu plan…'}</p>{loadError&&<button className="primary" onClick={()=>reload().catch(()=>setLoadError(true))}>Reintentar</button>}</div>
  const section=navigation.section
  return <div className="app-shell">
    {!online&&<div className="offline-banner"><WifiOff size={16}/> Guía sin conexión · necesitas internet para sincronizar tus datos</div>}
    {needRefresh&&<div className="update-banner"><RefreshCw size={18}/><span>Nueva versión disponible</span><button disabled={storage.saving||account.saving||!!storage.error||!!account.error} onClick={async()=>{try{await storage.flush();await account.flush();await updateServiceWorker(true)}catch{notify('Guarda los cambios antes de actualizar.')}}}>Actualizar</button></div>}
    <header className="topbar"><div className="brand"><Koala/><div><span className="eyebrow">PLAN Lolo & alexia</span><h1>{{home:'Tu guía',training:'Entrenamientos',nutrition:'Nutrición',progress:'Tu progreso',more:'Ajustes'}[section]}</h1></div></div><button className="icon-button" aria-label="Cambiar tema" onClick={()=>saveSettings(v=>({...v,darkMode:!v.darkMode}))}>{settings.darkMode?<Sun/>:<Moon/>}</button></header>
    <div className={`save-state ${storage.error?'failed':''}`} role="status" aria-live="polite">{storage.error?<><span>{storage.error}</span><button onClick={()=>storage.flush().catch(()=>{})}>Reintentar</button><button onClick={emergencyCopy}>Exportar cambios</button></>:<><Check size={14}/>{storage.saving?'Guardando preferencia…':'Tu guía disponible sin conexión'}</>}</div>
    <main>
      {section==='home'&&<HomeScreen go={go}/>}
      {section==='training'&&<TrainingScreen date={navigation.trainingDate} setDate={date=>setNavigation(v=>({...v,trainingDate:date}))}/>}
      {section==='nutrition'&&<NutritionScreen/>}
      {section==='progress'&&<ProgressScreen hide={settings.hideSensitive} notify={notify}/>}
      {section==='more'&&<MoreScreen tab={navigation.tab} setTab={tab=>setNavigation(v=>({...v,tab}))} settings={settings} saveSettings={saveSettings} workoutLogs={workoutLogs} progressLogs={progressLogs} onReload={reload} notify={notify}/>}
    </main>
    {toast&&<div className="toast" role="status">{toast}</div>}
    <nav className="bottom-nav" aria-label="Navegación principal">{([['home','Guía',Home],['training','Entrenos',Dumbbell],['nutrition','Nutrición',Salad],['progress','Progreso',TrendingUp],['more','Ajustes',Settings]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>go(id,undefined,id==='more'?'settings':undefined)} className={id===section?'active':''} aria-current={id===section?'page':undefined}><Icon/><span>{label}</span></button>)}</nav>
  </div>
}

function Koala(){return <img className="koala-logo" src="./koala-la.png" alt="Koala L&A" width="64" height="64"/>}
export default App
