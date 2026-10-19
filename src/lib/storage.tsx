import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type SetStateAction } from 'react'
import { getLocalState, setKV } from './db'

type Storage = {
  values:Record<string,unknown>
  set:(key:string,value:unknown|((previous:unknown)=>unknown))=>void
  flush:()=>Promise<void>
  refresh:()=>Promise<void>
  saving:boolean
  error:string
}
const Context=createContext<Storage|null>(null)

export function StorageProvider({children}:{children:ReactNode}){
  const [values,setValues]=useState<Record<string,unknown>>({})
  const [ready,setReady]=useState(false)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const pending=useRef(new Map<string,unknown>())
  const running=useRef<Promise<void>|null>(null)
  const current=useRef(values)
  const refresh=async()=>{const next=await getLocalState();current.current=next;setValues(next);setReady(true);setError('')}
  useEffect(()=>{refresh().catch(()=>setError('No se puede abrir el almacenamiento de este dispositivo.'))},[])
  const flush=():Promise<void>=>{
    if(running.current)return running.current
    if(!pending.current.size)return Promise.resolve()
    setSaving(true)
    const task=(async()=>{
      // One writer, latest value per key: old writes cannot overwrite a newer edit.
      while(pending.current.size){
        const [key,value]=pending.current.entries().next().value as [string,unknown]
        await setKV(key,value)
        if(pending.current.get(key)===value)pending.current.delete(key)
      }
      setError('')
    })().catch(e=>{setError('No se ha podido guardar. Mantén la app abierta y reintenta; puedes exportar una copia de tus cambios.');throw e}).finally(()=>{running.current=null;setSaving(false)})
    running.current=task
    return task
  }
  const set=(key:string,next:unknown|((previous:unknown)=>unknown))=>{
    const value=typeof next==='function'?next(current.current[key]):next
    current.current={...current.current,[key]:value}
    setValues(current.current)
    pending.current.set(key,value)
    void flush().catch(()=>{})
  }
  useEffect(()=>{
    const guard=(e:BeforeUnloadEvent)=>{if(pending.current.size){e.preventDefault();e.returnValue=''}}
    window.addEventListener('beforeunload',guard)
    return()=>window.removeEventListener('beforeunload',guard)
  },[])
  if(!ready)return <div className="splash"><div className="logo-mark">G</div>{error?<><p role="alert">{error}</p><button className="primary" onClick={()=>refresh().catch(()=>{})}>Reintentar</button></>:<p>Abriendo tus datos…</p>}</div>
  return <Context.Provider value={{values,set,flush,refresh,saving,error}}>{children}</Context.Provider>
}

export function useStorage(){const context=useContext(Context);if(!context)throw new Error('Falta StorageProvider');return context}
export function useStored<T>(key:string,initial:T|(()=>T)):[T,(value:SetStateAction<T>)=>void]{
  const storage=useStorage()
  const fallback=useRef<T>()
  if(fallback.current===undefined)fallback.current=typeof initial==='function'?(initial as ()=>T)():initial
  const value=(storage.values[key]??fallback.current) as T
  return [value,next=>storage.set(key,(previous:unknown)=>typeof next==='function'?(next as (previous:T)=>T)((previous??fallback.current) as T):next)]
}
