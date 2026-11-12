import { useEffect, useRef, useState } from 'react'
import { Download, Play } from 'lucide-react'
import { ExerciseDetails } from './ExercisePhoto'
import { routineGifs } from './data/routine-gifs'
import { workoutDays } from './data/training'
import { exerciseLibrary } from './lib/exercise-library'
import { gifGroupsChanged, isRoutineGifSaved, localGifGroups } from './lib/routine-gif-cache'
import { rememberedMediaOwner, sessionStorageKey } from './lib/media-owner'
import type { Exercise } from './types'
import './saved-routine-gifs.css'

const exercises=new Map(exerciseLibrary.map(ex=>[ex.hevyId,ex]))
export function RememberedGifShelf({online}:{online:boolean}) {
  const [,setRevision]=useState(0)
  useEffect(()=>{
    const refresh=()=>setRevision(n=>n+1)
    const changed=(e:StorageEvent)=>{if(!e.key||e.key===sessionStorageKey)refresh()}
    window.addEventListener('storage',changed);window.addEventListener('focus',refresh)
    return ()=>{window.removeEventListener('storage',changed);window.removeEventListener('focus',refresh)}
  },[])
  const owner=rememberedMediaOwner(online)
  return owner?<SavedRoutineGifs key={owner} userId={owner} mediaOnly/>:null
}
export function SavedRoutineGifs({userId,mediaOnly=false}:{userId:string;mediaOnly?:boolean}) {
  const [groups,setGroups]=useState(()=>localGifGroups(userId))
  const [open,setOpen]=useState(false),[available,setAvailable]=useState<Set<string>|null>(null)
  const [selected,setSelected]=useState<Exercise|null>(null)
  const opener=useRef<HTMLButtonElement|null>(null)
  useEffect(()=>{
    const refresh=()=>setGroups(localGifGroups(userId))
    window.addEventListener(gifGroupsChanged,refresh);window.addEventListener('storage',refresh)
    return ()=>{window.removeEventListener(gifGroupsChanged,refresh);window.removeEventListener('storage',refresh)}
  },[userId])
  useEffect(()=>{
    if(!open)return
    let current=true
    const ids=[...new Set(groups.flat())]
    setAvailable(null)
    Promise.all(ids.map(async id=>routineGifs[id]&&await isRoutineGifSaved(routineGifs[id])?id:''))
      .then(result=>{if(current)setAvailable(new Set(result.filter(Boolean)))})
    return ()=>{current=false}
  },[open,groups])
  if(!groups.length)return null
  return <details className="card saved-routine-gifs" onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary><Download size={18} aria-hidden="true"/> Mis GIF sin conexión</summary>
    {open&&groups.map(ids=>{
      const day=workoutDays.find(day=>day.exercises.length===ids.length&&day.exercises.every((ex,i)=>ex.hevyId===ids[i]))
      const rows=ids.flatMap(id=>exercises.has(id)?[exercises.get(id)!]:[])
      if(!rows.length)return null
      return <section key={ids.join(':')}><h3>{day?.title??rows.slice(0,2).map(ex=>ex.name).join(' + ')}</h3>
        <ol>{rows.map(ex=><li key={ex.hevyId}><button type="button" aria-label={'Ver GIF de '+ex.name} aria-haspopup="dialog" onClick={e=>{opener.current=e.currentTarget;setSelected(ex)}}>
          <span>{ex.name}{available&&!available.has(ex.hevyId)&&<small>Falta descargar en este dispositivo</small>}</span><Play size={15} aria-hidden="true"/>
        </button></li>)}</ol></section>
    })}
    {selected&&<ExerciseDetails exercise={selected} startGif mediaOnly={mediaOnly} onClose={()=>{setSelected(null);requestAnimationFrame(()=>opener.current?.focus())}}/>}
  </details>
}
