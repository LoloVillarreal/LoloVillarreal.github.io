import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useGuidePosition } from './lib/guide-position'
import { selectRestSession } from './lib/rest-clock'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Check, Dumbbell, Home, Moon, RefreshCw, Wrench, Settings, Sparkles, Sun, TrendingUp, WifiOff } from 'lucide-react'
import { getAll, defaultSettings } from './lib/db'
import { StorageProvider, useStorage, useStored } from './lib/storage'
import { AccountPanel, AccountProvider, useAccount } from './lib/account'
import { isoDate } from './lib/dates'
import { backupJson, download } from './lib/files'
import { currentTheme, themes } from './lib/appearance'
import { HomeScreen, TrainingScreen, NutritionScreen, ProgressScreen, MoreScreen } from './screens'
import ToolsScreen from './ToolsScreen'
import BarbellCalculator, { initialBarSetup } from './BarbellCalculator'
import { ExerciseWeightProvider } from './ExerciseWeight'
import { useGymSettings } from './GymInventory'
import { latestHipMark } from './lib/gym-inventory'
import SectionSwitch from './SectionSwitch'
import { pendingWorkout, WorkoutReturn } from './WorkoutReturn'
import './access.css'
import './main-dock.css'
import type { AppSettings, CardioLog, NavSection, ProgressLog, WorkoutLog } from './types'

const GymPreview=lazy(()=>import('./GymPreview'))
const PolicePanel=lazy(()=>import('./police/PolicePanel'))

function App(){return <StorageProvider><AccountProvider><Workspace/></AccountProvider></StorageProvider>}

function Workspace(){
  const [route,setRoute]=useState(location.hash)
  const police=route==='#police'
  useEffect(()=>{const change=()=>setRoute(location.hash);window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[])
  const storage=useStorage()
  const account=useAccount()
  const gym=useGymSettings()
  useLayoutEffect(()=>{
    if(account.session || !account.loading)selectRestSession(account.session?.user ?? null)
  },[account.session,account.loading])
  const [barSetup,setBarSetup]=useState(initialBarSetup)
  useEffect(()=>{setBarSetup(initialBarSetup())},[account.session?.user.id])
  const [navigation,setNavigation]=useState(()=>({day:isoDate(),section:'home' as NavSection,tool:'',trainingDate:isoDate(),nutritionDate:isoDate(),tab:'settings' as 'calc'|'tips'|'settings'}))
  const hipMark=useMemo(()=>latestHipMark(account.confirmedValues,navigation.day),[account.confirmedValues,navigation.day])
  const [homeVisit,setHomeVisit]=useState(0)
  const [keyboardHeight,setKeyboardHeight]=useState<number>()
  useEffect(()=>{
    const viewport=window.visualViewport
    if(!viewport)return
    const update=()=>{
      const editing=document.activeElement?.matches('input, textarea, [contenteditable=true]')
      setKeyboardHeight(editing && viewport.scale===1 && window.innerHeight-viewport.height>120 ? viewport.height : undefined)
    }
    viewport.addEventListener('resize',update)
    document.addEventListener('focusin',update)
    document.addEventListener('focusout',update)
    return ()=>{
      viewport.removeEventListener('resize',update)
      document.removeEventListener('focusin',update)
      document.removeEventListener('focusout',update)
    }
  },[])
  const [settings,saveSettings]=useStored<AppSettings>('settings',defaultSettings)
  const [checks]=useStored<Record<string,boolean>>('mealChecks',{})
  const [workoutLogs,setWorkoutLogs]=useState<WorkoutLog[]>([])
  const [cardioLogs,setCardioLogs]=useState<CardioLog[]>([])
  const [progressLogs,setProgressLogs]=useState<ProgressLog[]>([])
  const [ready,setReady]=useState(false)
  const [loadError,setLoadError]=useState(false)
  const [online,setOnline]=useState(navigator.onLine)
  const [limitedData,setLimitedData]=useState(false)
  useEffect(()=>{
    const network=(navigator as Navigator & {connection?:EventTarget & {saveData?:boolean;effectiveType?:string}}).connection
    if(!network)return
    const update=()=>setLimitedData(Boolean(network.saveData || ['slow-2g','2g','3g'].includes(network.effectiveType??'')))
    update()
    network.addEventListener('change',update)
    return ()=>network.removeEventListener('change',update)
  },[])
  const [toast,notify]=useState('')
  const [trainingDirty,setTrainingDirty]=useState(false)
  const [progressIntent,setProgressIntent]=useState<'strength'>()
  const {reader,bookmark,setReader,finish}=useGuidePosition(account.session?.user.id)
  const [registration,setRegistration]=useState<ServiceWorkerRegistration>()
  const [policeUpdateBlocked,setPoliceUpdateBlocked]=useState(false)
  const [cacheReady,setCacheReady]=useState(false)
  const [cacheError,setCacheError]=useState(false)
  const {needRefresh:[needRefresh],updateServiceWorker}=useRegisterSW({
    onRegisteredSW(_url,registration){setRegistration(registration)},
    onOfflineReady(){setCacheReady(true)},
    onRegisterError(){setCacheError(true)}
  })
  useEffect(()=>{
    if(!registration)return
    let mounted=true
    void navigator.serviceWorker.ready.then(active=>{
      if(mounted && active.active)setCacheReady(true)
    })
    return ()=>{mounted=false}
  },[registration])
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='glass'?'#f5f7fd':theme==='dark'?'#18231f':'#f7f4ec')
  },[theme])
  useEffect(()=>{document.getElementById('fitness-scroll')?.scrollTo(0,0)},[navigation.section])
  useEffect(()=>{
    const sync=()=>{setOnline(navigator.onLine);const day=isoDate();if(day!==navigation.day&&!trainingDirty)setNavigation(v=>({...v,day,section:'home',trainingDate:day,nutritionDate:day}))}
    const dayTick=window.setInterval(sync,30000)
    window.addEventListener('online',sync);window.addEventListener('offline',sync);window.addEventListener('focus',sync);document.addEventListener('visibilitychange',sync)
    sync()
    return()=>{clearInterval(dayTick);window.removeEventListener('online',sync);window.removeEventListener('offline',sync);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',sync)}
  },[navigation.day,trainingDirty])
  useEffect(()=>{if(toast){const id=setTimeout(()=>notify(''),4500);return()=>clearTimeout(id)}},[toast])
  const go=(section:NavSection,date?:string,tab?:'calc'|'tips'|'settings')=>{
    if(trainingDirty&&(section==='home'||section!==navigation.section||(date&&date!==navigation.trainingDate)||(tab&&tab!==navigation.tab))&&!confirm('Hay cambios sin guardar en tu rutina. ¿Quieres salir y descartarlos?'))return false
    setProgressIntent(undefined)
    if(section==='training'&&reader&&date===reader.date)setReader(null)
    setNavigation(v=>({...v,section:tab==='calc'?'nutrition':section,tool:tab==='calc'?'calc':'',...(date?{trainingDate:date}:{}),...(tab?{tab:tab==='calc'?'settings':tab}:{})}));return true
  }
  const startTraining=(date:string,index=0)=>{if(go('training',date))setReader({date,index})}
  const emergencyCopy=()=>download(backupJson({schemaVersion:2,exportedAt:new Date().toISOString(),workoutLogs,cardioLogs,progressLogs,mealChecks:checks,settings,localState:storage.values}),'plan-la-recuperacion.json')
  const themeControl=<button className="icon-button theme-cycle" aria-label="Cambiar tema" title={`Tema: ${themes.find(item=>item.id===theme)?.label}`} onClick={()=>saveSettings(v=>{const next=themes[(themes.findIndex(item=>item.id===currentTheme(v))+1)%themes.length].id;return {...v,theme:next,darkMode:next==='dark'}})}>{theme==='glass'?<Sparkles/>:theme==='dark'?<Sun/>:<Moon/>}</button>
  if(!account.session)return <div className="access-shell"><header><Koala/><div><p className="brand-signature"><b>Plan</b> Lolo &amp; alexia</p><h1>{route==='#prueba-gimnasio'?'Práctica de gimnasio':'Tu espacio personal'}</h1></div>{themeControl}</header><AccountPanel practice={route==='#prueba-gimnasio'}/></div>
  if(!ready)return <div className="splash"><Koala/><p>{loadError?'No se han podido leer tus registros.':'Recuperando tu plan…'}</p>{loadError&&<button className="primary" onClick={()=>reload().catch(()=>setLoadError(true))}>Reintentar</button>}</div>
  const blockedUpdate=trainingDirty||policeUpdateBlocked||storage.saving||account.saving||!!storage.error||!!account.error
  const serviceNotice=<>
    {!online&&<div className="offline-banner"><WifiOff size={16}/>Sin conexión. Para guardar en tu cuenta necesitas internet.</div>}
    {needRefresh&&<div className="update-banner" role="status"><RefreshCw size={18}/>
      <span>{blockedUpdate?'Actualización disponible. Termina de editar y guardar para aplicarla.':'Nueva versión disponible'}</span>
      <button disabled={blockedUpdate} onClick={async()=>{
        try{await storage.flush();await account.flush();await updateServiceWorker(true)}
        catch{notify('No se pudo actualizar. Revisa el guardado y vuelve a intentarlo.')}
      }}>Actualizar</button>
    </div>}
  </>
  const exerciseCalculator={
    calculator:<BarbellCalculator setup={barSetup} setSetup={setBarSetup} gym={gym} showPlatesByTarget/>,
    hipMark,
    prepareHip:(load?:number)=>{
      const bar=gym.saved?.hipBar
      if(!bar&&load===undefined)return
      setBarSetup(s=>({...s,...(bar?{barId:bar.id,barWeights:{...s.barWeights,[bar.id]:String(bar.kg).replace('.',',')}}:{}),
        ...(load===undefined?{}:{target:String(load).replace('.',',')})}))
    },
  }
  if(route==='#prueba-gimnasio')return <ExerciseWeightProvider value={exerciseCalculator}><Suspense fallback={<div className="splash">Abriendo la guía…</div>}><GymPreview key={account.session.user.id} userId={account.session.user.id} onExit={()=>{setNavigation(v=>({...v,section:'home'}));location.hash=''}}/></Suspense></ExerciseWeightProvider>
  if(police)return <>{serviceNotice}{toast&&<p className="toast" role="status">{toast}</p>}<Suspense fallback={<div className="splash">Abriendo tu panel…</div>}><PolicePanel key={account.session.user.id} themeControl={themeControl} onUpdateBlockedChange={setPoliceUpdateBlocked} onExit={()=>{setNavigation(v=>({...v,section:'training'}));location.hash=''}}/></Suspense></>
  const legacyCalc=navigation.section==='more'&&navigation.tab==='calc'
  const section=legacyCalc?'nutrition':navigation.section
  const floatingWorkout=section==='training'?null:pendingWorkout(reader,account.values,isoDate())
  const cacheMessage=cacheReady?'Guía disponible sin conexión':cacheError||!('serviceWorker' in navigator)?'Guía disponible con conexión':'Preparando la guía para usarla sin conexión…'
  return <ExerciseWeightProvider value={exerciseCalculator}><div className="fitness-viewport" style={keyboardHeight ? {height:keyboardHeight} : undefined}>
    <div id="fitness-scroll"><div className="app-shell">
    {serviceNotice}
    <header className="topbar">
      <div className="header-actions">{themeControl}</div>
      <div className="brand">
        <div className="brand-signature"><Koala/><b>Plan</b> Lolo &amp; alexia</div>
        <h1>{{home:'Inicio',training:'Entrenamientos',nutrition:'Herramientas',progress:'Tu progreso',more:'Ajustes'}[section]}</h1>
      </div>
      <div className="header-actions"><SectionSwitch onClick={async()=>{if(trainingDirty&&!confirm('¿Salir sin guardar los cambios de la rutina?'))return;try{await account.flush();location.hash='#police'}catch{notify('Guarda los cambios pendientes antes de cambiar de apartado.')}}}/></div></header>
    {(section==='more'||storage.error||storage.saving||(!cacheReady&&section==='home')) && <div className={`save-state ${storage.error?'failed':''}`} role="status" aria-live="polite">{storage.error?<><span>{storage.error}</span><button onClick={()=>storage.flush().catch(()=>{})}>Reintentar</button><button onClick={emergencyCopy}>Exportar cambios</button></>:<><Check size={14}/>{storage.saving?'Guardando preferencia…':cacheMessage}</>}</div>}
    <main className={`workspace workspace--${section}`} tabIndex={-1}>
      {section==='home'&&<HomeScreen key={homeVisit} onSelectionSaved={()=>finish(isoDate())} onDirtyChange={setTrainingDirty} go={go} reader={bookmark} floatingSessionDate={floatingWorkout?.date} startTraining={startTraining}
        onOpenPlates={()=>{if(go('nutrition'))setNavigation(v=>({...v,tool:'plates'}))}}
        onStrength={()=>{if(go('progress'))setProgressIntent('strength')}}/>}
      {section==='training'&&<TrainingScreen date={navigation.trainingDate} setDate={date=>setNavigation(v=>({...v,trainingDate:date}))} notify={notify} reader={reader} bookmark={bookmark} setReader={setReader} finish={finish} onDirtyChange={setTrainingDirty}/>}
      {section==='nutrition'&&<ToolsScreen notify={notify} tool={legacyCalc?'calc':navigation.tool??''}
        barCalculator={<BarbellCalculator setup={barSetup} setSetup={setBarSetup} gym={gym}/>}
        setTool={tool=>setNavigation(v=>({...v,section:'nutrition',tool,tab:'settings'}))}/>}
      {section==='progress'&&<ProgressScreen initialCapture={progressIntent} hide={settings.hideSensitive} notify={notify} onTraining={(date=isoDate())=>go('training',date)}/>}
      {section==='more'&&<MoreScreen tab={navigation.tab} setTab={tab=>{if(tab==='calc')go('nutrition',undefined,'calc');else setNavigation(v=>({...v,tab}))}} settings={settings} saveSettings={saveSettings} legacyAvailable={workoutLogs.length+cardioLogs.length+progressLogs.length>0||Object.keys(checks).length>0} notify={notify}/>}
    </main>
    </div></div>
    {toast&&<div className="toast" role="status">{toast}</div>}
    {floatingWorkout&&<WorkoutReturn workout={floatingWorkout} typing={keyboardHeight!==undefined}
      onResume={()=>startTraining(floatingWorkout.date,floatingWorkout.index)}/>}
    <nav className="bottom-nav main-dock" aria-label="Navegación principal" hidden={keyboardHeight!==undefined}
      data-economize={!online||limitedData||undefined}>
      {([
        ['training','Entrenos',Dumbbell], ['progress','Progreso',TrendingUp],
        ['home','Inicio',Home],
        ['nutrition','Herramientas',Wrench], ['more','Ajustes',Settings],
      ] as const).map(([id,label,Icon])=>
        <button key={id} type="button" className={id==='home'?'dock-home':undefined}
          aria-current={id===section?'page':undefined}
          onClick={event=>{
            if(!go(id,undefined,id==='more'?'settings':undefined))return
            if(id==='home'){
              setHomeVisit(previous=>previous+1)
              document.getElementById('fitness-scroll')?.scrollTo(0,0)
            }
            if(event.detail===0)requestAnimationFrame(()=>document.querySelector<HTMLElement>('#fitness-scroll main')?.focus({preventScroll:true}))
          }}>
          <span className="dock-glyph"><Icon aria-hidden="true"/></span>
          <span className="dock-label">{label}</span>
        </button>
      )}
    </nav>
  </div></ExerciseWeightProvider>
}

function Koala(){return <img className="koala-logo" src="./plan-la-koala.png" alt="Koala L&A" width="64" height="64"/>}
export default App
