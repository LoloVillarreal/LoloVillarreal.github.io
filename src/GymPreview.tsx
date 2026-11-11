import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronsUpDown, RotateCcw } from 'lucide-react'
import { workoutDays } from './data/training'
import { alternativeExercise, catalogById, equipmentNames, exerciseImage, exerciseUnit } from './lib/exercise-library'
import { techniqueFor } from './lib/exercise-technique'
import { RestTimer } from './RestTimer'
import './gym-preview.css'

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
      saved.swapped.every((v:unknown)=>typeof v==='boolean')) return saved
  } catch { /* Private browsing can disable storage. */ }
  return initial()
}
export default function GymPreview({userId}:{userId:string}) {
  const key='plan-la:preview-v1:'+userId
  const [trial,setTrial]=useState(()=>resume(key))
  const [choosing,setChoosing]=useState(false)
  const dialog=useRef<HTMLDialogElement>(null)
  const title=useRef<HTMLHeadingElement>(null)
  const [changed,setChanged]=useState(false)
  useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(trial))}catch{/* Continue in memory. */}},[key,trial])
  useEffect(()=>{title.current?.focus({preventScroll:true});window.scrollTo(0,0)},[trial.view,trial.step])
  useEffect(()=>{if(choosing)dialog.current?.showModal();else dialog.current?.close()},[choosing])
  const items=routine.map((e,i)=>trial.swapped[i]?(alternativeExercise(e.alternatives[0])??e):e)
  const original=routine[trial.step], current=items[trial.step]
  const alternative=trial.swapped[trial.step]?original:alternativeExercise(original.alternatives[0])
  const equipment=(id:string)=>equipmentNames[catalogById.get(id)?.equipment??'']??'Otro material'
  const swap=()=>{setTrial(previous=>({...previous,swapped:previous.swapped.map((v,i)=>i===previous.step?!v:v)}));setChoosing(false);setChanged(true)}
  const step=(n:number)=>{setChanged(false);setTrial(previous=>({...previous,step:n,view:'exercise',started:true}))}
  return <main className="gp">
    <header className="gp-brand"><img src="./plan-la-koala.png" alt="" width="40" height="40"/><strong>PLAN Lolo &amp; alexia</strong><a href="#">Salir de la prueba</a></header>
    {trial.view==='home'?<>
      <p className="gp-date">Hoy · lunes de ejemplo</p>
      <h1 ref={title} tabIndex={-1}>Glúteos y femorales</h1>
      <p>Rutina de prueba de tres ejercicios. Puedes probar cambios sin modificar tu calendario.</p>
      <button className="primary full" onClick={()=>step(trial.step)}>{trial.started?'Continuar · '+(trial.step+1)+' de 3':'Abrir guía'}<ArrowRight size={18}/></button>
      <ol className="gp-list">{items.map((e,i)=><li key={e.id}><button onClick={()=>step(i)}><img src={exerciseImage(e)} alt=""/><span><strong>{e.name}</strong><small>{e.muscle} · {routine[i].sets} series</small></span><ArrowRight size={16}/></button></li>)}</ol>
    </>:trial.view==='exercise'?<>
      <div className="gp-position"><button className="text-button" onClick={()=>setTrial({...trial,view:'home'})}><ArrowLeft size={15}/> Hoy</button><span>Ejercicio {trial.step+1} de {routine.length}</span></div>
      <progress value={trial.step+1} max={routine.length} aria-label="Posición en la guía"/>
      <h1 ref={title} tabIndex={-1}>{current.name}</h1>
      <div className="gp-figure"><img src={exerciseImage(current)} alt={current.name}/></div>
      <div className="gp-prescription"><div><small>Series</small><strong>{original.sets}</strong></div><div><small>{exerciseUnit(original)==='reps'?'Repeticiones':exerciseUnit(original)}</small><strong>{original.reps.join('–')}</strong></div><div><small>Descanso</small><strong>{original.rest[1]} s</strong></div></div>
      <div className="gp-actions">{alternative&&<button className="secondary full" onClick={()=>setChoosing(true)}><ChevronsUpDown size={16}/> Cambiar para hoy</button>}
      {changed&&<div role="status">Cambio aplicado a esta prueba. <button className="text-button" onClick={()=>{swap();setChanged(false)}}>Deshacer</button></div>}</div>
      <p><strong>Qué trabaja</strong> · {current.muscle}</p>
      <details key={'tech'+current.id}><summary>Cómo hacerlo</summary><p>{techniqueFor(current).text}</p></details>
      <details key={'rest'+current.id}><summary>Temporizador de descanso</summary><RestTimer seconds={original.rest[1]}/></details>
      <div className="gp-bottom">{trial.step>0&&<button className="secondary" aria-label="Ejercicio anterior" onClick={()=>step(trial.step-1)}><ArrowLeft size={20}/></button>}<button className="primary" onClick={()=>trial.step<routine.length-1?step(trial.step+1):setTrial({...trial,view:'done'})}>{trial.step<routine.length-1?'Siguiente ejercicio':'Terminar y registrar'}<Check size={18}/></button></div>
      <dialog ref={dialog} className="gp-dialog" onCancel={()=>setChoosing(false)} onClose={()=>setChoosing(false)} aria-labelledby="gp-choice"><h2 id="gp-choice">Cambiar para hoy</h2>{alternative&&<button className="gp-option" onClick={swap}><img src={exerciseImage(alternative)} alt=""/><span><strong>{alternative.name}</strong><small>{equipment(alternative.hevyId)} · {alternative.muscle}</small></span><ArrowRight size={17}/></button>}<button className="secondary full" onClick={()=>setChoosing(false)}>Cancelar</button></dialog>
    </>:<div className="gp-complete"><CheckCircle2 size={48}/><h1 ref={title} tabIndex={-1}>Entrenamiento de prueba terminado</h1><p>Has llegado al final de la rutina. Este ensayo queda fuera de tus estadísticas.</p><button className="primary full" onClick={()=>{setChanged(false);setTrial(initial())}}><RotateCcw size={16}/>Volver a probar</button><button className="text-button" onClick={()=>step(routine.length-1)}>Deshacer registro de prueba</button></div>}
  </main>
}
