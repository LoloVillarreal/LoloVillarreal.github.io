import { CardioPicker } from './CardioPicker'
import { cardioLabel } from './lib/cardio-options'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import ExercisePhoto from './ExercisePhoto'
import './planner-layout.css'
import { Plus, Search, X } from 'lucide-react'
import { workoutDays } from './data/training'
import { useAccount } from './lib/account'
import { exerciseLibrary, planFromRoutine, plannedExercise, trainingEntryValid, type PlannedExercise, type TrainingPlan } from './lib/training-plan'
import { DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableExercise, { ExerciseRowContent } from './SortableExercise'
import { catalogById, equipmentNames, exerciseById, exerciseImage, matchesExercise } from './lib/exercise-library'
import { isoDate, parseDate } from './lib/dates'
import { samePlan } from './lib/today-replacement'
import { RoutineDuration } from './RoutineDuration'
import { shortCustomPlan } from './lib/short-strength'

const planChanged='La rutina guardada ha cambiado. Vuelve a abrirla para revisar los ejercicios.'

export function TrainingPlanner({date,initial,newRoutine,onSaved,onCancel,onDirtyChange}:{date:string;initial:TrainingPlan;newRoutine?:{previous?:TrainingPlan;allowStart:boolean;short?:boolean};onSaved:(start:boolean)=>void;onCancel:()=>void;onDirtyChange:(dirty:boolean)=>void}){
  const account=useAccount(),wednesday=parseDate(date).getDay()===3
  const [plan,setPlan]=useState<TrainingPlan>(initial),[query,setQuery]=useState(''),[muscle,setMuscle]=useState('Todos'),[equipment,setEquipment]=useState('Todos'),[expanded,setExpanded]=useState<string|null>(null),[dragging,setDragging]=useState<string|null>(null),[libraryOpen,setLibraryOpen]=useState(Boolean(newRoutine)),[copyDate,setCopyDate]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  const sensors=useSensors(useSensor(MouseSensor,{activationConstraint:{distance:6}}),useSensor(TouchSensor,{activationConstraint:{delay:240,tolerance:8}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}))
  const initialValue=useRef(JSON.stringify(initial)),messageRef=useRef<HTMLParagraphElement>(null)
  const originalPlan=useRef(newRoutine?newRoutine.previous:initial)
  const writtenPlan=useRef<TrainingPlan>()
  const addButton=useRef<HTMLButtonElement>(null)
  const dirty=JSON.stringify(plan)!==initialValue.current
  useEffect(()=>{onDirtyChange(dirty);return()=>onDirtyChange(false)},[dirty,onDirtyChange])
  useEffect(()=>{if(!dirty)return;const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard)},[dirty])
  useEffect(()=>{if(message)messageRef.current?.focus()},[message])
  const close=()=>{if(!busy&&(!dirty||confirm('Hay cambios sin guardar en tu rutina. ¿Quieres salir y descartarlos?')))onCancel()}
  const choices=workoutDays.filter(day=>(!wednesday||day.type!=='strength')&&(day.type!=='recovery'||day.day===6))
  const [startOnSave,setStartOnSave]=useState(false)
  const [short,setShort]=useState(newRoutine?.short??false)
  const shortVersion=newRoutine && short && plan.type==='strength' ? shortCustomPlan(plan) : null
  const [online,setOnline]=useState(()=>navigator.onLine)
  const saving=useRef(false)
  useEffect(()=>{
    const sync=()=>setOnline(navigator.onLine)
    window.addEventListener('online',sync)
    window.addEventListener('offline',sync)
    return ()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',sync)}
  },[])
  function chooseRoutine(day:typeof workoutDays[number]){
    const next=planFromRoutine(day)
    if(next.type==='cardio'&&plan.type!=='cardio')next.cardio={activity:'',minutes:0}
    if(next.type==='cardio'&&plan.type==='cardio')next.cardio=plan.cardio
    setPlan(next)
    setStartOnSave(false)
    setMessage('')
    setLibraryOpen(false)
  }
  const ids=plan.exercises.map(item=>item.exerciseId)
  const selectedHevy=ids.map(id=>exerciseById.get(id)?.hevyId)
  const visible=exerciseLibrary.filter(exercise=>(muscle==='Todos'||exercise.muscle===muscle)&&(equipment==='Todos'||catalogById.get(exercise.hevyId)?.equipment===equipment)&&matchesExercise(exercise,query))
  const change=(index:number,patch:Partial<PlannedExercise>)=>setPlan(previous=>({...previous,exercises:previous.exercises.map((item,i)=>i===index?{...item,...patch}:item)}))
  const move=(index:number,direction:number)=>setPlan(previous=>{const next=[...previous.exercises];[next[index],next[index+direction]]=[next[index+direction],next[index]];return {...previous,exercises:next}})
  const cardioIncomplete=plan.type==='cardio'&&(!plan.cardio.activity||!Number.isInteger(plan.cardio.minutes)||plan.cardio.minutes<1||plan.cardio.minutes>180)
  const strengthEmpty=plan.type==='strength'&&plan.exercises.length===0
  const canStart=newRoutine?.allowStart && date===isoDate() && plan.type!=='recovery'
  const saveDisabled=busy||account.loading||!account.complete||!online||cardioIncomplete||strengthEmpty
  const save=async(start:boolean)=>{
    if(saving.current||saveDisabled)return
    if(!plan.title.trim())return setMessage('Pon un nombre a la sesión en Más opciones.')
    if(!trainingEntryValid(`training:${date}`,plan))return setMessage('Revisa los datos de la sesión y el rango de cada ejercicio.')
    saving.current=true
    setBusy(true)
    setMessage('')
    try{
      await account.flush()
      const key='training:'+date
      const next=shortVersion??{...plan,title:plan.title.trim()}
      if(!samePlan(writtenPlan.current,next)){
        account.set(key,(current:unknown)=>{
          const expected=writtenPlan.current??originalPlan.current
          if(current!==expected && !(expected&&samePlan(current,expected)))throw Error(planChanged)
          return next
        })
        writtenPlan.current=next
        await account.flush()
      }
      onSaved(start&&plan.type!=='recovery')
    }catch(error){
      setMessage(error instanceof Error && error.message===planChanged?planChanged:'No se pudo confirmar el guardado. Tus cambios siguen aquí.')
    }finally{
      saving.current=false
      setBusy(false)
    }
  }
  const heading=plan.type==='cardio'?'Editar cardio':plan.type==='recovery'?'Editar descanso':newRoutine?'Mi rutina':'Editar entrenamiento'
  return <section className="card training-planner day-plan-editor" aria-labelledby="plan-editor-title">
    <header className="plan-editor-header">
      <div><p>{new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(parseDate(date))}</p><h2 id="plan-editor-title">{heading}</h2></div>
      <button className="text-button" disabled={busy} onClick={close}>Cerrar</button>
    </header>
    <fieldset className="plan-editor-body" disabled={busy} aria-busy={busy}>
    {plan.type==='strength'&&<><div className="section-head"><h3>Ejercicios · {plan.exercises.length}</h3><button ref={addButton} className="secondary" aria-haspopup="dialog" onClick={()=>setLibraryOpen(true)}><Plus size={16}/>Añadir ejercicios</button></div>
      {strengthEmpty&&<p className="small-note">Añade al menos un ejercicio para guardar esta rutina.</p>}
      {!strengthEmpty&&<p className="reorder-hint">Toca un ejercicio para ajustar sus series. Arrastra las tres líneas para moverlo.</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[({transform})=>({...transform,x:0})]} accessibility={{screenReaderInstructions:{draggable:'Pulsa espacio para recoger un ejercicio, flechas arriba o abajo para moverlo, espacio para soltar y Escape para cancelar.'},announcements:{onDragStart:({active})=>`Reordenando ${exerciseById.get(String(active.id))?.name}.`,onDragOver:({over})=>over?`Posición ${plan.exercises.findIndex(item=>item.exerciseId===over.id)+1}.`:undefined,onDragEnd:({over})=>over?'Orden actualizado. Guarda el entrenamiento para conservarlo.':'Movimiento cancelado.',onDragCancel:()=>'Movimiento cancelado.'}}} onDragStart={({active})=>{setDragging(String(active.id));setExpanded(null)}} onDragCancel={()=>setDragging(null)} onDragEnd={({active,over})=>{setDragging(null);if(over&&active.id!==over.id)setPlan(previous=>({...previous,exercises:arrayMove(previous.exercises,previous.exercises.findIndex(item=>item.exerciseId===active.id),previous.exercises.findIndex(item=>item.exerciseId===over.id))}))}}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}><ol className="planned-exercises compact-exercise-list">{plan.exercises.map((item,index)=><SortableExercise key={item.exerciseId} item={item} exercise={exerciseById.get(item.exerciseId)!} index={index} total={plan.exercises.length} expanded={expanded===item.exerciseId} disabled={busy} onExpand={()=>setExpanded(expanded===item.exerciseId?null:item.exerciseId)} onChange={patch=>change(index,patch)} onMove={direction=>move(index,direction)} onRemove={()=>setPlan(previous=>({...previous,exercises:previous.exercises.filter(value=>value.exerciseId!==item.exerciseId)}))}/>)}</ol></SortableContext>
        {createPortal(<DragOverlay>{dragging&&<div className="exercise-drag-preview"><ExerciseRowContent exercise={exerciseById.get(dragging)!} item={plan.exercises.find(item=>item.exerciseId===dragging)!}/></div>}</DragOverlay>,document.body)}
      </DndContext>
      {libraryOpen&&<LibraryDialog count={plan.exercises.length} onClose={()=>{
        setLibraryOpen(false)
        requestAnimationFrame(()=>addButton.current?.focus())
      }}>
        <div className="exercise-library">
          <label><span><Search size={14}/>Buscar ejercicio</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre o músculo"/></label>
          <div className="library-filters">
            <label>Grupo muscular<select value={muscle} onChange={e=>setMuscle(e.target.value)}>{['Todos',...new Set(exerciseLibrary.map(exercise=>exercise.muscle))].map(group=><option key={group}>{group}</option>)}</select></label>
            <label>Material<select value={equipment} onChange={e=>setEquipment(e.target.value)}><option value="Todos">Todo el material</option>{Object.entries(equipmentNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          </div>
          <div className="library-results">{visible.map(exercise=>{
            const added=selectedHevy.includes(exercise.hevyId)
            return <div key={exercise.hevyId} className="library-exercise">
              <ExercisePhoto exercise={exercise}/><span><strong>{exercise.name}</strong><small>{exercise.muscle}</small></span>
              <button type="button" className="text-button" aria-label={(added?'Quitar ':'Añadir ')+exercise.name}
                disabled={!added&&plan.exercises.length>=30} onClick={()=>setPlan(previous=>({...previous,
                  exercises:added
                    ? previous.exercises.filter(item=>exerciseById.get(item.exerciseId)?.hevyId!==exercise.hevyId)
                    : [...previous.exercises,plannedExercise(exercise)]
                }))}>{added?'Quitar':'Añadir'}</button>
            </div>
          })}{visible.length===0&&<p className="empty">No hay coincidencias. Prueba otro nombre o grupo.</p>}</div>
          <p className="small-note">{visible.length} de {exerciseLibrary.length} ejercicios del catálogo estándar de Hevy.</p>
        </div>
      </LibraryDialog>}
    </>}
    {plan.type==='cardio'&&<CardioPicker key={plan.type} activity={plan.cardio.activity}
      minutes={plan.cardio.minutes?String(plan.cardio.minutes):''} disabled={busy}
      onActivity={activity=>setPlan(previous=>({...previous,
        title:previous.title===previous.cardio.activity||previous.title===cardioLabel(previous.cardio.activity)?cardioLabel(activity):previous.title,
        cardio:{...previous.cardio,activity}}))}
      onMinutes={minutes=>setPlan(previous=>({...previous,cardio:{...previous.cardio,minutes:Number(minutes)}}))}/>}
    {plan.type==='recovery'&&<p className="plan-editor-rest">Día de descanso. Puedes añadir una nota para esta fecha.</p>}
    <details className="plan-editor-fold">
      <summary>Notas{plan.notes?' de la sesión':' (opcional)'}</summary>
      <label>Nota para este día<textarea maxLength={2000} value={plan.notes} onChange={event=>setPlan({...plan,notes:event.target.value})}/></label>
    </details>
    <details className="plan-editor-fold">
      <summary>Más opciones</summary>
      <div className="plan-advanced">
        <label>Nombre del entrenamiento<input maxLength={100} value={plan.title} onChange={event=>setPlan({...plan,title:event.target.value})}/></label>
        <details className="plan-editor-fold">
          <summary>Cambiar de rutina</summary>
          <div className="routine-picker">{choices.map(day=><button className="routine-option" key={day.day} onClick={()=>chooseRoutine(day)}>
            <strong>{day.title}</strong><span>{day.type==='strength'?`${day.exercises.length} ejercicios`:day.type==='cardio'?'Cardio':'Descanso'}{day.optional?' · opcional':''}</span>
          </button>)}
          {!wednesday&&<button className="routine-option" onClick={()=>{setPlan({...planFromRoutine(workoutDays[0]),title:'Mi entrenamiento',exercises:[]});setLibraryOpen(true);setStartOnSave(false);setMessage('')}}>
            <strong>Crear desde cero</strong><span>Elige tus ejercicios</span>
          </button>}</div>
        </details>
        <details className="plan-editor-fold">
          <summary>Copiar de otra fecha</summary>
          <label>Fecha de la rutina<input type="date" value={copyDate} onChange={event=>setCopyDate(event.target.value)}/></label>
          <button className="secondary" disabled={!copyDate} onClick={()=>{
            const saved=account.values[`training:${copyDate}`]
            if(!trainingEntryValid(`training:${copyDate}`,saved))return setMessage('Esa fecha todavía no tiene una selección guardada.')
            if(wednesday&&saved.type==='strength')return setMessage('El miércoles solo puedes copiar cardio o descanso.')
            setPlan(structuredClone(saved))
            setStartOnSave(false)
            setMessage('Selección copiada. Guarda los cambios para usarla este día.')
          }}>Copiar a este día</button>
        </details>
        {!newRoutine&&plan.type!=='recovery'&&<label className="plan-start-toggle"><input type="checkbox" checked={startOnSave} onChange={event=>setStartOnSave(event.target.checked)}/>Abrir la guía al guardar</label>}
      </div>
    </details>
    <footer className="plan-editor-footer">
      {newRoutine && plan.type==='strength' && !strengthEmpty && <>
        <RoutineDuration short={short} onChange={setShort} disabled={busy}/>
        {shortVersion&&<div className="routine-lineup" aria-live="polite"><strong>Para este día · unos 20 min</strong>
          <ul>{shortVersion.exercises.map(item=><li key={item.exerciseId}>{exerciseById.get(item.exerciseId)?.name} <small>· {item.sets} {item.sets===1?'serie':'series'}</small></li>)}</ul>
          <p className="small-note">Se usan tus dos primeros ejercicios, con hasta dos series de cada uno y sus descansos habituales.</p>
        </div>}
      </>}
      {message&&<p ref={messageRef} className="planner-message" role="status" tabIndex={-1}>{message}</p>}
      {!online&&<p role="status">Conéctate a internet para guardar tus cambios.</p>}
      {online&&!account.loading&&!account.complete&&<button className="text-button" onClick={()=>account.refresh().catch(()=>setMessage('No se pudieron cargar tus datos. Vuelve a intentarlo.'))}>Cargar mis datos para guardar</button>}
      {cardioIncomplete&&<p>Elige la actividad e indica entre 1 y 180 minutos.</p>}
      {canStart&&<button className="primary full" disabled={saveDisabled} onClick={()=>save(true)}>{busy?'Guardando…':'Guardar y empezar'}</button>}
      <button className={canStart?'text-button':'primary full'} disabled={saveDisabled} onClick={()=>save(!newRoutine&&startOnSave)}>{busy&&!canStart?'Guardando…':newRoutine?'Guardar mi rutina':'Guardar cambios'}</button>
    </footer>
    </fieldset>
  </section>
}

function LibraryDialog({children,onClose,count}:{children:ReactNode;onClose:()=>void;count:number}){
  const ref=useRef<HTMLDialogElement>(null)
  useEffect(()=>{const dialog=ref.current;if(!dialog)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();dialog.querySelector<HTMLElement>('h2')?.focus();return()=>{dialog.close();document.body.style.overflow=overflow}},[])
  return <dialog ref={ref} className="library-dialog" aria-labelledby="library-title" onCancel={onClose} onKeyDownCapture={event=>{if(event.key==='Escape'&&event.currentTarget.contains(event.target as Node)){event.preventDefault();event.stopPropagation();onClose()}}} onClick={event=>{if(event.target!==event.currentTarget)return;const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)onClose()}}>
    <header><h2 id="library-title" tabIndex={-1}>Elegir ejercicios</h2><button className="icon-button" aria-label="Cerrar biblioteca" onClick={onClose}><X/></button></header>
    {children}
    <footer><span role="status">{count} {count===1?'ejercicio':'ejercicios'} en tu rutina</span><button className="primary" onClick={onClose}>{count?'Ver mi rutina':'Volver'}</button></footer>
  </dialog>
}
