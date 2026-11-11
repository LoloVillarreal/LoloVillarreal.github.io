import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, BookOpen, Calculator, ChevronRight, Dumbbell, Library, Scale, Timer, Utensils } from 'lucide-react'
import { Calculators, NutritionScreen } from './screens'
import { RestTimer } from './RestTimer'
import { ExerciseDetails } from './ExercisePhoto'
import { exerciseImage, exerciseLibrary, matchesExercise } from './lib/exercise-library'
import { kgToLb, lbToKg } from './lib/gym-tools'
import { tips } from './data/tips'
import type { Exercise } from './types'

const tools = {
 timer: {title:'Descansos', hint:'Cronometra el tiempo entre series', icon:Timer},
 plates: {title:'Barra y discos', hint:'Monta tu barra y ve cuánto pesa', icon:Dumbbell},
 convert: {title:'Conversor kg / lb', hint:'Pasa de kilos a libras o al revés', icon:Scale},
 library: {title:'Biblioteca de ejercicios', hint:'Consulta fotos, técnica y alternativas', icon:Library},
 calc: {title:'Calculadoras', hint:'Consulta IMC, energía y macronutrientes', icon:Calculator},
 tips: {title:'Guía práctica', hint:'Dudas habituales del entrenamiento', icon:BookOpen},
 food: {title:'Ideas para comer', hint:'Consulta desayunos y menús', icon:Utensils},
}
type ToolId = keyof typeof tools

export default function ToolsScreen({notify,tool,setTool,barCalculator}:{notify:(text:string)=>void;tool:string;setTool:(tool:string)=>void;barCalculator:ReactNode}){
 const [seconds,setSeconds]=useState(90),[value,setValue]=useState('20'),[unit,setUnit]=useState('kg'),[query,setQuery]=useState(''),[limit,setLimit]=useState(30)
 const [selectedExercise,setSelectedExercise]=useState<Exercise|null>(null)
 const [resourcesOpen,setResourcesOpen]=useState(tool==='tips'||tool==='food')
 const titleRef=useRef<HTMLHeadingElement>(null),lastTool=useRef(tool)
 const exerciseTrigger=useRef<HTMLButtonElement|null>(null),searchInput=useRef<HTMLInputElement>(null)
 useEffect(()=>{
   if(!selectedExercise && exerciseTrigger.current){
     exerciseTrigger.current.focus()
     exerciseTrigger.current=null
   }
 },[selectedExercise])
 useEffect(()=>{
   if(tool===lastTool.current) return
   const previous=lastTool.current
   lastTool.current=tool
   if(tool) titleRef.current?.focus()
   else document.getElementById('tool-open-'+previous)?.focus()
 },[tool])
 const valid=value!==''&&Number.isFinite(+value)&&+value>=0
 const visible=tool==='library'?exerciseLibrary.filter(e=>matchesExercise(e,query)):[]
 const search=(text:string)=>{setQuery(text);setLimit(30)}
 const toolRow=(id:ToolId)=>{
   const {title,hint,icon:Icon}=tools[id]
   return <button key={id} id={'tool-open-'+id} className="tool-row" onClick={()=>setTool(id)}>
     <span className="tool-row-icon"><Icon size={20} aria-hidden="true"/></span>
     <span><strong>{title}</strong><small>{hint}</small></span><ChevronRight size={17} aria-hidden="true"/>
   </button>
 }
 return <>{tool?<header className="tools-heading"><button className="text-button" onClick={()=>setTool('')}><ArrowLeft size={16}/>Todas las herramientas</button><h2 ref={titleRef} tabIndex={-1}>{tools[tool as ToolId]?.title}</h2></header>:<>
   <section className="card tool-menu" aria-labelledby="gym-tools-title"><h2 id="gym-tools-title">En el gimnasio</h2>{(['timer','plates','convert','library'] as const).map(toolRow)}</section>
   <section className="card tool-menu" aria-labelledby="reference-tools-title"><h2 id="reference-tools-title">Para consultar</h2>{toolRow('calc')}
     <details open={resourcesOpen} onToggle={event=>setResourcesOpen(event.currentTarget.open)}><summary>Curiosidades y recursos</summary>{toolRow('tips')}{toolRow('food')}</details>
   </section></>}
 {tool==='timer'&&<><RestTimer key={seconds} seconds={seconds}/><section className="card"><h3 id="tool-duration-title">Duración del descanso</h3>
   <div className="tool-choices tool-durations" role="group" aria-labelledby="tool-duration-title">{[30,45,60,90,120,150,180,240,300].map(n=><button key={n} aria-pressed={seconds===n} onClick={()=>setSeconds(n)}>{n<60?n+' s':n%60===0?n/60+' min':Math.floor(n/60)+' min '+n%60+' s'}</button>)}</div>
   <p className="small-note">Cambiar la duración reinicia el reloj. Al salir de Descansos se detiene.</p></section></>}
 {tool==='plates'&&barCalculator}
 {tool==='convert'&&<section className="card"><div className="tool-choices tool-units" role="group" aria-label="Sentido de la conversión">
   <button aria-pressed={unit==='kg'} onClick={()=>setUnit('kg')}>De kg a lb</button><button aria-pressed={unit==='lb'} onClick={()=>setUnit('lb')}>De lb a kg</button></div>
   <label>Peso ({unit})<input type="number" inputMode="decimal" min="0" step="any" value={value} onChange={e=>setValue(e.target.value)}/></label>
   <div className="result-callout" role="status">{valid?<strong>{(unit==='kg'?kgToLb(+value):lbToKg(+value)).toLocaleString('es',{maximumFractionDigits:2})} {unit==='kg'?'lb':'kg'}</strong>:'Introduce un peso igual o mayor que cero.'}</div></section>}
 {tool==='library'&&<section className="card"><label>Buscar ejercicio<input ref={searchInput} type="search" value={query} onChange={e=>search(e.target.value)} placeholder="Nombre, músculo o material"/></label>
   <div className="tool-search-shortcuts" role="group" aria-label="Búsquedas rápidas">{['Glúteos','Core','Sin material'].map(term=><button key={term} aria-pressed={query===term} onClick={()=>search(query===term?'':term)}>{term}</button>)}</div>
   <p className="small-note" role="status">{visible.length===0?'No encontramos ejercicios con esa búsqueda.':visible.length===1?'1 ejercicio.':`Mostrando ${Math.min(limit,visible.length)} de ${visible.length} ejercicios.`}</p>
   {!visible.length&&<button className="secondary" onClick={()=>{search('');searchInput.current?.focus()}}>Borrar búsqueda</button>}
   <div className="tool-library">{visible.slice(0,limit).map(exercise=><button key={exercise.hevyId} className="tool-row" aria-haspopup="dialog" aria-label={`Ver foto y técnica de ${exercise.name}`} onClick={event=>{exerciseTrigger.current=event.currentTarget;setSelectedExercise(exercise)}}>
     <img src={exerciseImage(exercise)} onError={e=>{if(!e.currentTarget.src.endsWith('/exercise-placeholder.svg'))e.currentTarget.src='./exercise-placeholder.svg'}} alt="" width="40" height="40" loading="lazy"/>
     <span><strong>{exercise.name}</strong><small>{exercise.muscle}</small></span><ChevronRight size={16} aria-hidden="true"/>
   </button>)}</div>
   {selectedExercise&&createPortal(<ExerciseDetails exercise={selectedExercise} onClose={()=>setSelectedExercise(null)}/>,document.body)}
   {visible.length>limit&&<button className="secondary full" onClick={()=>setLimit(n=>n+30)}>Ver más ejercicios</button>}</section>}
 {tool==='calc'&&<Calculators notify={notify}/>}{tool==='food'&&<NutritionScreen/>}{tool==='tips'&&<section className="card">{tips.map(([title,text])=><details key={title}><summary>{title}</summary><p>{text}</p></details>)}</section>}
 </>
}
