import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronUp, Download, Play } from 'lucide-react'
import { loadMotion, motionCache, motionClips, motionURL, type MotionClip } from './lib/exercise-motion'
import { exerciseImage } from './lib/exercise-library'
import type { Exercise } from './types'
import './exercise-movement.css'

export function ExerciseMovement({exercise}:{exercise:Exercise}) {
  const clip=motionClips[exercise.hevyId]
  return clip ? <MovementDisclosure key={exercise.hevyId} clip={clip} name={exercise.name} poster={exerciseImage(exercise)}/> : null
}

function MovementDisclosure({clip,name,poster}:{clip:MotionClip;name:string;poster:string}) {
  const [open,setOpen]=useState(false)
  const panelId=useId()
  return <div className="exercise-movement">
    <button type="button" className="movement-toggle" aria-expanded={open} aria-controls={panelId} onClick={()=>setOpen(!open)}>
      {open?<ChevronUp size={17} aria-hidden="true"/>:<Play size={17} aria-hidden="true"/>}
      <span>{open?'Ocultar movimiento':'Ver el movimiento'}</span>
      <small>{Math.round(clip.seconds)} s · {Math.ceil(clip.bytes/1000)} kB</small>
    </button>
    <div id={panelId}>{open&&<Player clip={clip} name={name} poster={poster}/>}</div>
  </div>
}

function Player({clip,name,poster}:{clip:MotionClip;name:string;poster:string}) {
  const [media,setMedia]=useState<{url:string; blob:Blob}|null>(null)
  const [saved,setSaved]=useState(false),[busy,setBusy]=useState(false)
  const [error,setError]=useState(''),[saveError,setSaveError]=useState(''),[attempt,setAttempt]=useState(0)
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const video=useRef<HTMLVideoElement>(null)
  const connection=(navigator as Navigator & {connection?:EventTarget & {type?:string}}).connection
  const [cellular,setCellular]=useState(()=>connection?.type==='cellular')

  useEffect(()=>{
    const pref=window.matchMedia('(prefers-reduced-motion: reduce)')
    const changed=()=>{setReduced(pref.matches);if(pref.matches) video.current?.pause()}
    const network=()=>setCellular(connection?.type==='cellular')
    const hidden=()=>{if(document.hidden)video.current?.pause()}
    pref.addEventListener('change',changed)
    connection?.addEventListener('change',network)
    document.addEventListener('visibilitychange',hidden)
    return ()=>{
      pref.removeEventListener('change',changed)
      connection?.removeEventListener('change',network)
      document.removeEventListener('visibilitychange',hidden)
    }
  },[connection])

  useEffect(()=>{
    const controller=new AbortController()
    let url=''
    setMedia(null)
    setError('')
    loadMotion(clip,controller.signal).then(result=>{
      if(controller.signal.aborted)return
      url=URL.createObjectURL(result.blob)
      setSaved(result.saved)
      setMedia({url,blob:result.blob})
    }).catch(()=>{
      if(!controller.signal.aborted)setError(navigator.onLine?'No se pudo abrir el vídeo. Comprueba la conexión y reintenta.':'Este vídeo no está disponible sin conexión en este dispositivo.')
    })
    return ()=>{controller.abort();if(url)URL.revokeObjectURL(url)}
  },[clip,attempt])

  async function changeDownload() {
    if(!media||busy)return
    setBusy(true)
    setSaveError('')
    try {
      const cache=await caches.open(motionCache),url=motionURL(clip)
      if(saved){
        await cache.delete(url)
        setSaved(false)
      }else{
        await cache.put(url,new Response(media.blob,{headers:{'Content-Type':'video/mp4','Content-Length':String(media.blob.size)}}))
        const stored=await cache.match(url)
        if(!stored||(await stored.blob()).size!==clip.bytes)throw Error()
        setSaved(true)
      }
    }catch{setSaveError(saved?'No se pudo quitar la descarga.':'No se pudo guardar en este dispositivo. Revisa el espacio disponible y reintenta.')}
    finally{setBusy(false)}
  }

  return <div className="movement-panel">
    {error?<div role="status"><p>{error}</p><button type="button" className="text-button" onClick={()=>setAttempt(n=>n+1)}>Reintentar vídeo</button></div>
      :media?<video ref={video} controls muted playsInline loop={!reduced} autoPlay={!reduced} preload="metadata" poster={poster} src={media.url}
        aria-label={'Demostración de '+name} onError={()=>setError('El reproductor no ha podido abrir el vídeo. Puedes seguir la técnica escrita.')}/>
      :<p role="status">Cargando vídeo…</p>}
    <p className="movement-cue">{clip.cue}</p>
    {media&&!error&&('caches' in window?<div className="movement-offline">
      <button type="button" className="text-button" disabled={busy||(!saved&&cellular)} onClick={changeDownload}>
        {saved?<Check size={16} aria-hidden="true"/>:<Download size={16} aria-hidden="true"/>}
        {busy?'Actualizando descarga…':saved?'Quitar descarga':'Guardar sin conexión'}
      </button>
      <small role="status">{saved?'Guardado en este dispositivo':cellular?'Conéctate a Wi-Fi para guardar.':'Puedes guardarlo con Wi-Fi.'}</small>
    </div>:<p className="small-note">Este navegador no permite guardar el vídeo en este dispositivo.</p>)}
    {saveError&&<p role="alert">{saveError}</p>}
    <details className="movement-credit"><summary>Créditos del vídeo</summary>
      {clip.author==='Goulart'?<p>Goulart · <a href={clip.source} target="_blank" rel="noreferrer">original en wger</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Fragmento recortado, comprimido y sin audio bajo la misma licencia.</p>:
        <><p>Matthew Holfinger · <a href={clip.source} target="_blank" rel="noreferrer">original en DVIDS</a>. Dominio público en EE. UU. Fragmento reencuadrado y sin audio.</p><p lang="en">The appearance of U.S. Department of War (DoW) visual information does not imply or constitute DoW endorsement.</p></>}
    </details>
  </div>
}
