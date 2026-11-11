import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type SetStateAction } from 'react'
import { createClient, type Session } from '@supabase/supabase-js'
import config from '../data/cloud-config.json'
import { attendanceEntryValid } from './attendance'
import { readAccountPages } from './account-pages'
import { defaultSettings } from './db'
import type { Backup, ProgressLog } from '../types'
import { backupJson, download } from './files'

export const supabase=createClient(config.url,config.publishableKey,{
  auth:{persistSession:true,autoRefreshToken:true},
  global:{fetch:async(input,init)=>{
    const controller=new AbortController(),signal=init?.signal
    const abort=()=>controller.abort()
    if(signal?.aborted)abort()
    else signal?.addEventListener('abort',abort,{once:true})
    const timeout=window.setTimeout(abort,15000)
    try{return await fetch(input,{...init,signal:controller.signal})}
    finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort)}
  }}
})
type Account={
  session:Session|null;loading:boolean;saving:boolean;error:string;values:Record<string,unknown>
  set:(key:string,next:unknown|((previous:unknown)=>unknown))=>void
  flush:()=>Promise<void>;refresh:()=>Promise<void>;remove:(key:string)=>Promise<void>
  complete:boolean;getBackup:()=>Promise<Backup>
  restore:(data:Backup,beforeReplace:(current:Backup)=>void)=>Promise<void>;logout:()=>Promise<void>;discardAndReload:()=>Promise<void>
}
const Context=createContext<Account|null>(null)
const conflict='Hay cambios nuevos en otro dispositivo. Exporta tus cambios antes de volver a cargar los datos de tu cuenta.'

export function AccountProvider({children}:{children:ReactNode}){
  const [session,setSession]=useState<Session|null>(null)
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('')
  const [values,setValues]=useState<Record<string,unknown>>({})
  const current=useRef(values),versions=useRef(new Map<string,{version:number;updated_at:string}>()),pending=useRef(new Map<string,unknown>())
  const running=useRef<Promise<void>|null>(null),owner=useRef<string|null>(null)
  const generation=useRef(0),loadNumber=useRef(0)
  const [complete,setComplete]=useState(false)
  const completeRef=useRef(false)
  const updateComplete=(value:boolean)=>{completeRef.current=value;setComplete(value)}
  const load=async()=>{
    const user=owner.current
    if(!user)return
    const revision=generation.current,request=++loadNumber.current
    const isCurrent=()=>owner.current===user&&revision===generation.current&&request===loadNumber.current&&!pending.current.size
    try{
      const rows=await readAccountPages(async after=>{
        if(!isCurrent())throw new Error('La cuenta cambió durante la lectura.')
        let query=supabase.from('plan_data').select('key,value,version,updated_at').eq('user_id',user)
        if(after!==null)query=query.gt('key',after)
        const result=await query.order('key',{ascending:true}).limit(500)
        if(result.error)throw result.error
        return result.data
      })
      if(!isCurrent())return
      const next=Object.fromEntries(rows.map(row=>[row.key,row.value.data]))
      versions.current=new Map(rows.map(row=>[row.key,{version:row.version,updated_at:row.updated_at}]))
      current.current=next;setValues(next);updateComplete(true);setLoading(false);setError('')
      return next
    }catch(error){
      if(!isCurrent())return
      updateComplete(false);setLoading(false)
      setError('No se pudo recuperar la cuenta completa. Comprueba la conexión y pulsa Actualizar datos.')
      throw error
    }
  }
  useEffect(()=>{
    // Retire the old independent panel session; both sections now use this client.
    try{localStorage.removeItem('plan-police-auth')}catch{}
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{
      if(owner.current!==(next?.user.id??null)){
        owner.current=next?.user.id??null;generation.current++;updateComplete(false);pending.current.clear();versions.current.clear();current.current={};setValues({});setLoading(!!next);setError('')
      }
      setSession(next);if(!next)setLoading(false)
    })
    return()=>subscription.unsubscribe()
  },[])
  useEffect(()=>{if(session)void load().catch(()=>{})},[session?.user.id])
  const flush=():Promise<void>=>{
    if(running.current)return running.current
    if(!pending.current.size)return Promise.resolve()
    const user=owner.current
    if(!user)return Promise.reject(new Error('Inicia sesión para guardar.'))
    setSaving(true)
    const task=(async()=>{
      while(pending.current.size&&owner.current===user){
        const [key,value]=pending.current.entries().next().value as [string,unknown]
        const revision=versions.current.get(key),version=revision?.version
        const row={user_id:user,key,value:{data:value},version:(version??0)+1,updated_at:new Date().toISOString()}
        const result=version===undefined?await supabase.from('plan_data').insert(row).select('version,updated_at'):await supabase.from('plan_data').update(row).eq('user_id',user).eq('key',key).eq('version',version).eq('updated_at',revision!.updated_at).select('version,updated_at')
        let confirmed=result.data?.length===1 ? result.data[0] : null
        if(result.error?.code==='23505' && version===undefined && attendanceEntryValid(key,value)){
          // A previous insert may have committed before its response was lost.
          const stored=await supabase.from('plan_data').select('version,updated_at,value').eq('user_id',user).eq('key',key).maybeSingle()
          if(stored.error)throw new Error('No se pudo comprobar el registro. Reintenta al recuperar la conexión.')
          const record=stored.data?.value?.data
          if(stored.data && attendanceEntryValid(key,record) && record.completedAt===value.completedAt &&
            record.title===value.title && record.type===value.type)confirmed=stored.data
          else throw new Error(conflict)
        }else if(result.error){
          if(result.error.code==='23505')throw new Error(conflict)
          throw new Error('No se ha podido sincronizar. Mantén esta página abierta, comprueba la conexión y reintenta.')
        }
        if(!confirmed)throw new Error(conflict)
        if(owner.current!==user)return
        versions.current.set(key,{version:confirmed.version,updated_at:confirmed.updated_at})
        if(pending.current.get(key)===value)pending.current.delete(key)
      }
      setError('')
    })().catch(e=>{setError(e.message);throw e}).finally(()=>{running.current=null;setSaving(false)})
    running.current=task;return task
  }
  const set=(key:string,next:unknown|((previous:unknown)=>unknown))=>{
    if(!owner.current)return
    generation.current++
    const value=typeof next==='function'?next(current.current[key]):next
    current.current={...current.current,[key]:value};setValues(current.current);pending.current.set(key,value)
    void flush().catch(()=>{})
  }
  const refresh=async()=>{await flush();await load()}
  useEffect(()=>{
    const sync=()=>{if(document.visibilityState==='visible'&&owner.current&&!pending.current.size&&!running.current)void load().catch(()=>{})}
    const guard=(e:BeforeUnloadEvent)=>{if(pending.current.size){e.preventDefault();e.returnValue=''}}
    const online=()=>{void flush().catch(()=>{})}
    const interval=window.setInterval(sync,60000)
    window.addEventListener('focus',sync);window.addEventListener('online',online);window.addEventListener('beforeunload',guard)
    return()=>{clearInterval(interval);window.removeEventListener('focus',sync);window.removeEventListener('online',online);window.removeEventListener('beforeunload',guard)}
  },[])
  const remove=async(key:string)=>{
    await flush();const user=owner.current;if(!user)throw new Error('Inicia sesión')
    const revision=versions.current.get(key)
    const result=await supabase.from('plan_data').delete().eq('user_id',user).eq('key',key).eq('version',revision?.version??0).eq('updated_at',revision?.updated_at??'1970-01-01T00:00:00Z').select('key')
    if(result.error||result.data.length!==1)throw new Error(conflict)
    generation.current++;versions.current.delete(key);const next={...current.current};delete next[key];current.current=next;setValues(next)
  }
  const getBackup=async()=>{
    const user=owner.current
    if(!user||!completeRef.current)throw new Error('Actualiza los datos de tu cuenta para preparar la copia.')
    await flush()
    if(owner.current!==user)throw new Error('La sesión ha cambiado.')
    const snapshot=await load()
    if(snapshot===undefined)throw new Error('Los datos cambiaron durante la lectura. Vuelve a intentar la copia.')
    return accountBackup(snapshot)
  }
  const restore=async(data:Backup,beforeReplace:(current:Backup)=>void)=>{
    const user=owner.current
    const backup=await getBackup()
    if(!user||owner.current!==user)throw new Error('La sesión ha cambiado.')
    beforeReplace(backup)
    generation.current++
    updateComplete(false)
    setLoading(true)
    try{
    const entries:Array<{key:string;value:{data:unknown}}>=data.progressLogs.map(({photo:_photo,...log})=>({key:`progress:${log.id}`,value:{data:log}}))
    for(const key of ['calculator','personalGoal','goalDraft','progressDraft'])if(data.localState?.[key]!==undefined)entries.push({key,value:{data:key==='progressDraft'?{...data.localState[key] as object,photo:''}:data.localState[key]}})
    for(const [key,value] of Object.entries(data.localState??{}))if(key.startsWith('training:')||key.startsWith('attendance:'))entries.push({key,value:{data:value}})
    const result=await supabase.rpc('replace_plan_data',{entries})
    if(result.error)throw result.error
    if(owner.current!==user)return
    await load()
    }finally{setLoading(false)}
  }
  const logout=async()=>{await flush();const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw error}
  const discardAndReload=async()=>{if(pending.current.size&&!confirm('¿Descartar los cambios que todavía no están sincronizados y cargar la versión de tu cuenta? Exporta antes si quieres conservarlos.'))return;pending.current.clear();await load()}
  return <Context.Provider value={{session,loading,saving,error,values,complete,getBackup,set,flush,refresh,remove,restore,logout,discardAndReload}}>{children}</Context.Provider>
}

export function useAccount(){const account=useContext(Context);if(!account)throw new Error('Falta AccountProvider');return account}
export function useCloudValue<T>(key:string,initial:T|(()=>T)):[T,(next:SetStateAction<T>)=>void]{
  const account=useAccount(),fallback=useRef<T>()
  if(fallback.current===undefined)fallback.current=typeof initial==='function'?(initial as ()=>T)():initial
  return [(account.values[key]??fallback.current) as T,next=>account.set(key,(previous:unknown)=>typeof next==='function'?(next as (v:T)=>T)((previous??fallback.current) as T):next)]
}
export function accountBackup(values:Record<string,unknown>):Backup{
  return {schemaVersion:2,exportedAt:new Date().toISOString(),workoutLogs:[],cardioLogs:[],progressLogs:Object.entries(values).filter(([key])=>key.startsWith('progress:')).map(([,value])=>value as ProgressLog),mealChecks:{},settings:defaultSettings,localState:Object.fromEntries(Object.entries(values).filter(([key])=>!key.startsWith('progress:')))}
}

export function loginErrorMessage(error:{code?:string;status?:number},online:boolean){
  if(!online)return 'Sin conexión a internet. Conéctate y vuelve a entrar.'
  if(error.code==='invalid_credentials')return 'Correo o contraseña incorrectos. Usa la contraseña creada para este plan.'
  if(error.code==='email_not_confirmed')return 'Esta cuenta necesita confirmación. Pide a Lolo que revise su activación.'
  if(error.status===429)return 'Demasiados intentos. Espera unos minutos antes de volver a entrar.'
  if(!error.status||error.status>=500||error.status===408)return 'El servicio de acceso no responde. Espera un momento y vuelve a intentarlo.'
  return 'No se pudo completar el acceso. Si se repite, pide a Lolo que revise la cuenta.'
}

export function AccountPanel({practice=false}:{practice?:boolean}={}){
  const account=useAccount()
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setMessage('')
    try{
      const result=await supabase.auth.signInWithPassword({email:email.trim(),password})
      if(result.error){
        setMessage(loginErrorMessage(result.error,navigator.onLine))
        return
      }
      setPassword('')
    }catch{setMessage(loginErrorMessage({},navigator.onLine))}finally{setBusy(false)}
  }
  if(!account.session&&account.loading)return <section className="card account-panel" role="status"><p>Recuperando tu sesión…</p></section>
  if(account.session)return <section className="card account-panel"><p className="eyebrow">TU CUENTA PRIVADA</p><h2>Tu progreso, contigo</h2><p>{account.session.user.email}</p><p className="small-note">Tu sesión se mantiene en este navegador hasta que cierres sesión o se borren sus datos. En otro dispositivo, entra con esta misma cuenta para recuperar tu progreso.</p><div className="button-row"><button className="secondary" disabled={account.saving} onClick={()=>account.refresh().catch(()=>setMessage('No se pudo actualizar.'))}>Actualizar datos</button><button className="text-button" disabled={account.saving} onClick={()=>account.logout().catch(()=>setMessage('Guarda o exporta tus cambios antes de salir.'))}>Cerrar sesión</button></div>{message&&<p role="status">{message}</p>}</section>
  return <section className="card account-panel"><h2>Iniciar sesión</h2><p>{practice?'Usa la cuenta habitual de Alexia para abrir la práctica de tres ejercicios.':'Usa el correo y la contraseña del plan de Alexia. Este navegador recordará tu sesión.'}</p><form onSubmit={submit}><label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary full" disabled={busy}>{busy?'Conectando…':'Entrar'}</button></form><details><summary>Cómo entrar por primera vez</summary><p>Usa el correo y la contraseña de la cuenta que habéis creado para este plan. Es independiente de Hevy. Si necesitas recuperar el acceso, Lolo puede restablecerlo desde el panel privado.</p></details>{message&&<p role="status">{message}</p>}</section>
}

export function AccountGate({children}:{children:ReactNode}){
  const account=useAccount()
  if(!account.session)return <AccountPanel/>
  if(account.loading)return <section className="card"><p>Recuperando tus datos privados…</p></section>
  return <>{account.error&&<section className="card warning" role="alert"><p>{account.error}</p><div className="button-row"><button className="secondary" onClick={()=>account.refresh().catch(()=>{})}>Reintentar</button><button className="secondary" disabled={!account.complete} onClick={()=>download(backupJson(accountBackup(account.values)),'plan-la-cambios-pendientes.json')}>Exportar mis cambios</button><button className="text-button" onClick={()=>account.discardAndReload().catch(()=>{})}>Volver a cargar</button></div></section>}{account.saving&&<p className="cloud-state" role="status">Guardando en tu cuenta…</p>}{children}</>
}
