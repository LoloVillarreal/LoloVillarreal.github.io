import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { guideByName } from './lib/exercise-guides'
import { X, ZoomIn } from 'lucide-react'
import { alternativeExercise, catalogById, equipmentNames, exerciseImage, muscleNames } from './lib/exercise-library'
import { techniqueFor } from './lib/exercise-technique'
import type { Exercise } from './types'
export default function ExercisePhoto({exercise}:{exercise:Exercise}){
 const [open,setOpen]=useState(false),trigger=useRef<HTMLButtonElement>(null),wasOpen=useRef(false)
 useEffect(()=>{if(open)wasOpen.current=true;else if(wasOpen.current)trigger.current?.focus()},[open])
 return <><button ref={trigger} type="button" className="exercise-photo-button" aria-label={`Ver foto y técnica de ${exercise.name}`} onClick={()=>setOpen(true)}><img src={exerciseImage(exercise)} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='./exercise-placeholder.svg'}} alt="" width="40" height="40" loading="lazy" draggable={false}/><ZoomIn size={11}/></button>{open&&createPortal(<ExerciseDetails exercise={exercise} onClose={()=>setOpen(false)}/>,document.body)}</>
}
export function ExerciseDetails({exercise,onClose}:{exercise:Exercise;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),titleId=useId(),row=catalogById.get(exercise.hevyId),technique=techniqueFor(exercise)
 useEffect(()=>{const dialog=ref.current!,overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();return()=>{dialog.close();document.body.style.overflow=overflow}},[])
 return <dialog ref={ref} className="exercise-details" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose()}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}}><header><div><small>FICHA DEL EJERCICIO</small><h2 id={titleId}>{exercise.name}</h2></div><button className="icon-button" aria-label="Cerrar ficha" onClick={onClose}><X/></button></header><img className="exercise-details-image" src={exerciseImage(exercise)} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='./exercise-placeholder.svg'}} alt={`Demostración de ${exercise.name}`} width="432" height="432"/><div className="exercise-details-copy"><h3>Qué trabaja</h3><p><strong>Principal:</strong> {row?muscleNames[row.primary_muscle_group]??exercise.muscle:exercise.muscle}</p>{!!row?.secondary_muscle_groups.length&&<p><strong>También participa:</strong> {[...new Set(row.secondary_muscle_groups.map(m=>muscleNames[m]??m))].join(', ')}.</p>}{row&&<p><strong>Material:</strong> {equipmentNames[row.equipment]??row.equipment}</p>}<h3>Cómo hacerlo</h3>{technique.general&&<p className="small-note">Guía básica del movimiento; ajusta los apoyos a la variante y al equipo de tu gimnasio.</p>}<p>{technique.text}</p>{exercise.avoid&&<p className="warning">{exercise.avoid}</p>}<p className="small-note">Usa un recorrido controlado y una carga con la que puedas mantener la técnica.</p>{exercise.alternatives.length>0&&<><h3>Alternativas</h3><ExerciseAlternatives names={exercise.alternatives}/></>}<details><summary>Referencia y nombre original</summary><p>{exercise.hevyName}</p><a href={technique.source??"https://www.hevyapp.com/exercises/"} target="_blank" rel="noreferrer">{technique.source?'Referencia de técnica ↗':'Biblioteca de Hevy ↗'}</a></details></div></dialog>
}

export function ExerciseAlternatives({names}:{names:string[]}) {
  const [selected, setSelected] = useState<Exercise|null>(null)
  const trigger = useRef<HTMLButtonElement|null>(null)

  useEffect(() => {
    if (!selected) trigger.current?.focus()
  }, [selected])

  return <ul className="exercise-alternatives">
    {names.map(name => {
      const exercise = alternativeExercise(name)
      const guide = guideByName.get(name)
      if (exercise) return <li key={name}>
        <button className="text-button" aria-haspopup="dialog" onClick={event => {
          trigger.current = event.currentTarget
          setSelected(exercise)
        }}>{name} · Ver ficha</button>
      </li>
      return <li key={name}>{guide
        ? <details><summary>{name}</summary><p>{guide.instruction}</p>
          <a href={guide.source} target="_blank" rel="noreferrer">Referencia de técnica ↗</a>
        </details>
        : name}</li>
    })}
    {selected && createPortal(<ExerciseDetails exercise={selected} onClose={() => setSelected(null)}/>, document.body)}
  </ul>
}
