import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { workoutDays } from './data/training'
import { alternativeExercise, catalogById, equipmentNames, exerciseImage } from './lib/exercise-library'
import { techniqueFor } from './lib/exercise-technique'
import { RestTimer } from './RestTimer'
import './gym-preview.css'
import { ExerciseWeightButton } from './ExerciseWeight'

// A short rehearsal using three exercises from the existing Monday routine.
const routine = [workoutDays[0].exercises[0], workoutDays[0].exercises[3], workoutDays[0].exercises[1]]
type Trial = { view:'home'|'exercise'|'done'; step:number; swapped:boolean[]; started:boolean }
function initial(): Trial { return {view:'home',step:0,swapped:[false,false,false],started:false} }
function resume(key:string):Trial {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (saved && ['home','exercise','done'].includes(saved.view) && Number.isInteger(saved.step) &&
      saved.step >= 0 && saved.step < routine.length && typeof saved.started === 'boolean' &&
      Array.isArray(saved.swapped) && saved.swapped.length === routine.length &&
      saved.swapped.every((v:unknown)=>typeof v==='boolean')) return saved.view === 'done' ? initial() : {...saved,view:'home'}
  } catch { /* Private browsing can disable storage. */ }
  return initial()
}
export default function GymPreview({userId,onExit}:{userId:string;onExit:()=>void}) {
  const key='plan-la:preview-v1:'+userId
  const [trial,setTrial]=useState(()=>resume(key))
  const [choosing,setChoosing]=useState(false)
  const title=useRef<HTMLHeadingElement>(null)
  const [changed,setChanged]=useState(false)
  useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(trial))}catch{/* Continue in memory. */}},[key,trial])
  useEffect(()=>{title.current?.focus({preventScroll:true});window.scrollTo(0,0)},[trial.view,trial.step])
  const changeButton = useRef<HTMLButtonElement>(null)
  const items=routine.map((e,i)=>trial.swapped[i]?(alternativeExercise(e.alternatives[0])??e):e)
  const original=routine[trial.step], current=items[trial.step]
  const alternative=trial.swapped[trial.step]?original:alternativeExercise(original.alternatives[0])
  const equipment=(id:string)=>equipmentNames[catalogById.get(id)?.equipment??'']??'Otro material'
  const swap=()=>{setTrial(previous=>({...previous,swapped:previous.swapped.map((v,i)=>i===previous.step?!v:v)}));setChoosing(false);setChanged(true);changeButton.current?.focus()}
  const step=(n:number)=>{setChoosing(false);setChanged(false);setTrial(previous=>({...previous,step:n,view:'exercise',started:true}))}
  return <main className="gp">
    <header className="gp-brand"><img src="./plan-la-koala.png" alt="" width="40" height="40"/><strong>Práctica de gimnasio</strong><button className="text-button gp-exit" onClick={onExit}>Volver a mi plan</button></header>
    {trial.view==='home' ? <>
      <h1 ref={title} tabIndex={-1}>Prueba una rutina</h1>
      <p>Verás tres ejercicios de glúteos y piernas, uno por pantalla. Puedes recorrerlos sin hacerlos. Tu calendario se mantiene igual.</p>
      {trial.started && <p>Te quedaste en el ejercicio {trial.step+1}: <strong>{items[trial.step].name}</strong>.</p>}
      <button className="primary full" onClick={()=>step(trial.step)}>{trial.started?'Continuar la práctica':'Empezar la práctica'}<ArrowRight size={18}/></button>
      {trial.started && <button className="text-button gp-restart" onClick={()=>{setChoosing(false);setChanged(false);setTrial({...initial(),view:'exercise',started:true})}}>Empezar de nuevo</button>}
    </> : trial.view==='exercise' ? <>
      <div className="gp-position"><button className="text-button" onClick={()=>{setChoosing(false);setTrial({...trial,view:'home'})}}><ArrowLeft size={15}/> Inicio de la práctica</button><span>{trial.step+1} de {routine.length}</span></div>
      <progress value={trial.step+1} max={routine.length} aria-label="Posición en la práctica"/>
      <h1 ref={title} tabIndex={-1}>{current.name}</h1>
      <div className="gp-figure"><img src={exerciseImage(current)} alt={current.name}/></div>
      <p className="gp-instruction"><strong>{original.sets} series de {original.reps.join(' a ')} repeticiones</strong><br/>Descansa {original.rest[1]} segundos entre series.</p>
      <ExerciseWeightButton exerciseName={current.name}/>
      <details key={'tech'+current.id}><summary>Ver cómo se hace</summary><p>{techniqueFor(current).text}</p><p>Trabaja principalmente: {current.muscle}.</p></details>
      {alternative && <div className="gp-actions">
        <button className="text-button" ref={changeButton} aria-expanded={choosing} onClick={()=>setChoosing(!choosing)}>¿Equipo ocupado? Ver alternativa</button>
        {choosing && <div className="gp-choice"><div className="gp-option"><img src={exerciseImage(alternative)} alt=""/><span><strong>{alternative.name}</strong><small>{equipment(alternative.hevyId)} · {alternative.muscle}</small></span></div><button className="secondary full" onClick={swap}>Usar este ejercicio</button></div>}
        {changed && <div role="status">Ejercicio cambiado. <button className="text-button" onClick={()=>{swap();setChanged(false)}}>Deshacer</button></div>}
      </div>}
      <details key={'rest'+current.id}><summary>Usar temporizador de descanso</summary><RestTimer seconds={original.rest[1]}/></details>
      <div className="gp-bottom">{trial.step>0 && <button className="secondary" aria-label="Ejercicio anterior" onClick={()=>step(trial.step-1)}><ArrowLeft size={20}/></button>}
        <button className="primary" onClick={()=>trial.step<routine.length-1?step(trial.step+1):setTrial({...trial,view:'done'})}>{trial.step<routine.length-1?'Ver siguiente ejercicio':'Terminar la práctica'}<ArrowRight size={18}/></button>
      </div>
    </> : <div className="gp-complete"><CheckCircle2 size={44}/><h1 ref={title} tabIndex={-1}>Práctica terminada</h1><p>Ya has recorrido los tres ejercicios. En tu plan podrás registrar los días que entrenes.</p><button className="primary full" onClick={onExit}>Ir a mi plan</button><button className="text-button" onClick={()=>{setChanged(false);setTrial(initial())}}>Repetir la práctica</button></div>}
  </main>
}
