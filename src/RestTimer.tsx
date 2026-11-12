import { Pause, Play, RotateCcw, Timer } from 'lucide-react'
import { pauseRest, resetRest, startRest, useRestClock } from './lib/rest-clock'

export function RestTimer({seconds}:{seconds:number}){
  const { remaining, running, paused, finished } = useRestClock(seconds)
  const toggle = () => running ? pauseRest() : startRest(paused ? remaining : seconds)
  return <section className="card rest-timer">
    <div><p className="eyebrow"><Timer size={14}/> DESCANSO ORIENTATIVO</p>
      <strong role="timer" aria-label="Tiempo de descanso">{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</strong>
      <p role="status">{finished?'Descanso terminado':paused?'En pausa':running?'En marcha':'Listo para empezar'}</p>
    </div>
    <div className="button-row">
      <button className="primary" disabled={seconds===0} onClick={toggle}>{running?<Pause size={17}/>:<Play size={17}/>}
        {running?'Pausar descanso':paused?'Continuar descanso':finished?'Repetir descanso':'Empezar descanso'}
      </button>
      <button className="icon-button" aria-label="Reiniciar descanso" onClick={resetRest}><RotateCcw/></button>
    </div>
  </section>
}
