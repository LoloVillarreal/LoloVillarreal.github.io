import { useId, useRef, useState } from 'react'
import { Activity, Bike, Check, Ellipsis, Footprints, Route, Search, X } from 'lucide-react'
import { cardioActivities } from './lib/training-plan'
import { searchText } from './lib/exercise-library'
import { cardioLabel } from './lib/cardio-options'
import './cardio-picker.css'

const common = [
  {value:'Caminata', Icon:Footprints}, {value:'Bicicleta', Icon:Bike},
  {value:'Running', Icon:Route}, {value:'Elíptica', Icon:Activity}
]
const times = ['15','20','30','45']
const others = [...new Set(cardioActivities)].filter(a=>!common.some(c=>c.value===a))
  .sort((a,b)=>cardioLabel(a).localeCompare(cardioLabel(b),'es'))

type Props = {
  activity:string
  minutes:string
  disabled:boolean
  onActivity:(value:string)=>void
  onMinutes:(value:string)=>void
}
export function CardioPicker({activity,minutes,disabled,onActivity,onMinutes}:Props) {
  const [more,setMore] = useState(false)
  const [query,setQuery] = useState('')
  const [manual,setManual] = useState(Boolean(minutes && !times.includes(minutes)))
  const minutesInput = useRef<HTMLInputElement>(null)
  const moreId = useId()
  const selectedOther = activity && !common.some(c=>c.value===activity)
  const matches = others.filter(name=>searchText(cardioLabel(name)+' '+name).includes(searchText(query.trim())))
  function select(value:string) {
    onActivity(value)
    setMore(false)
    setQuery('')
  }
  function customTime() {
    setManual(true)
    requestAnimationFrame(()=>minutesInput.current?.focus())
  }
  return <div className="cardio-picker">
    <fieldset disabled={disabled}>
      <legend>Elige la actividad</legend>
      <div className="cardio-activities">
        {common.map(({value,Icon})=><button type="button" key={value} aria-pressed={activity===value}
          onClick={()=>select(value)}><Icon size={19} aria-hidden="true"/><span>{cardioLabel(value)}</span>
          {activity===value&&<Check size={14} aria-hidden="true"/>}</button>)}
      </div>
      <button type="button" className="cardio-more" aria-expanded={more} aria-controls={moreId}
        onClick={()=>{setMore(!more);setQuery('')}}>
        {more?<X size={16}/>:<Ellipsis size={16}/>}
        {more?'Cerrar lista':selectedOther?'Actividad: '+cardioLabel(activity)+' · Cambiar':'Más actividades'}
      </button>
      {more&&<div className="cardio-search" id={moreId}>
        <label><Search size={16} aria-hidden="true"/><input type="search" aria-label="Buscar actividad de cardio" placeholder="Buscar actividad" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <div className="cardio-results">{matches.map(value=><button type="button" key={value} aria-pressed={activity===value} onClick={()=>select(value)}>
          {cardioLabel(value)}{activity===value&&<Check size={14} aria-hidden="true"/>}</button>)}
          {!matches.length&&<p role="status">No hay coincidencias. Prueba con otro nombre.</p>}</div>
      </div>}
    </fieldset>
    {activity&&<fieldset className="cardio-duration" disabled={disabled}>
      <legend>¿Cuánto tiempo?</legend>
      <div className="cardio-times">{times.map(time=><button type="button" key={time}
        aria-pressed={minutes===time&&!manual} onClick={()=>{onMinutes(time);setManual(false)}}>{time} min</button>)}</div>
      {manual?<label className="cardio-manual">Duración en minutos<input ref={minutesInput} type="number" inputMode="numeric" min="1" max="180" placeholder="De 1 a 180" value={minutes} onChange={e=>onMinutes(e.target.value)}/></label>
        :<button className="cardio-more" type="button" onClick={customTime}>Escribir otra duración</button>}
    </fieldset>}
  </div>
}
