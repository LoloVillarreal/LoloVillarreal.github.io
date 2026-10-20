import { useEffect, useState } from 'react'
import { Pause, Play, RotateCcw, Timer } from 'lucide-react'

export function RestTimer({seconds}:{seconds:number}){
  const [remaining,setRemaining]=useState(seconds),[endsAt,setEndsAt]=useState<number|null>(null),[paused,setPaused]=useState(false)
  useEffect(()=>{
    if(endsAt===null)return
    const tick=()=>{const next=Math.max(0,Math.ceil((endsAt-Date.now())/1000));setRemaining(next);if(next===0){setEndsAt(null);setPaused(false)}}
    tick();const timer=window.setInterval(tick,250);return()=>clearInterval(timer)
  },[endsAt])
  const toggle=()=>{if(endsAt!==null){setRemaining(Math.max(0,Math.ceil((endsAt-Date.now())/1000)));setEndsAt(null);setPaused(true)}else{const duration=paused?remaining:seconds;setRemaining(duration);setEndsAt(Date.now()+duration*1000);setPaused(false)}}
  return <section className="card rest-timer"><div><p className="eyebrow"><Timer size={14}/> DESCANSO ORIENTATIVO</p><strong role="timer" aria-label="Tiempo de descanso">{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</strong><p>{remaining===0?'Descanso terminado':paused?'En pausa':'Ajusta el descanso a tus sensaciones.'}</p></div><div className="button-row"><button className="primary" disabled={seconds===0} onClick={toggle}>{endsAt!==null?<Pause size={17}/>:<Play size={17}/>} {endsAt!==null?'Pausar descanso':paused?'Continuar descanso':remaining===0?'Repetir descanso':'Empezar descanso'}</button><button className="icon-button" aria-label="Reiniciar descanso" onClick={()=>{setEndsAt(null);setPaused(false);setRemaining(seconds)}}><RotateCcw/></button></div></section>
}
