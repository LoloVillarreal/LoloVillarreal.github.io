import { useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import { flushSync } from 'react-dom'
import { Check, ChevronDown, Minus, Plus, SlidersHorizontal, X } from 'lucide-react'
import BarbellDrawing from './BarbellDrawing'
import { barbells } from './data/barbells'
import { platesPerSide, plateWeights } from './lib/gym-tools'
import './barbell-calculator.css'

type Setup = {
  barId: string
  barWeights: Record<string,string>
  counts: Record<number,number>
  target: string
}
export const initialBarSetup = (): Setup => ({barId:'olympic-20',barWeights:{},counts:{},target:''})

const colors: Record<number,string> = {
  25:'#ec7163',20:'#779fe0',15:'#f1c45d',10:'#72ba94',5:'#d7dedd',2.5:'#c89fc7',1.25:'#94bdc9',
}
const number = new Intl.NumberFormat('es-ES',{maximumFractionDigits:3})
const kg = (mass:number) => number.format(mass)+' kg'
function readKg(text:string) {
  const value=Number(text.trim().replace(',','.'))
  return /^(?:\d+(?:[.,]\d{0,2})?|[.,]\d{1,2})$/.test(text.trim()) && Number.isSafeInteger(Math.round(value*100)) ? value : null
}

function loadTarget(setup:Setup,barKg:number|null):Setup {
  const targetKg=readKg(setup.target)
  if(targetKg===null || barKg===null)return setup
  const load=platesPerSide(targetKg,barKg)
  if(!load)return setup
  return {...setup,counts:Object.fromEntries(load.plates.map(({weight,count})=>[weight,count]))}
}

export default function BarbellCalculator({setup,setSetup}:{setup:Setup;setSetup:Dispatch<SetStateAction<Setup>>}) {
  const bar=barbells.find(item=>item.id===setup.barId) ?? barbells[0]
  const weightText=setup.barWeights[bar.id] ?? (bar.kg===null?'':number.format(bar.kg))
  const barKg=readKg(weightText)
  const plates=plateWeights.map(weight=>({weight,count:setup.counts[weight]??0,color:colors[weight]}))
  const loaded=plates.filter(plate=>plate.count>0)
  const perSide=loaded.reduce((sum,{weight,count})=>sum+weight*count,0)
  const total=barKg===null?null:barKg+2*perSide
  const targetKg=readKg(setup.target)
  const [editWeight,setEditWeight]=useState(false)
  const selector=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null)
  const input=useRef<HTMLInputElement>(null),requestWeight=useRef(false)
  const hasTarget=setup.target.trim()!==''
  const approximate=total!==null && targetKg!==null && Math.round(total*100)<Math.round(targetKg*100)
  let targetHint=''
  if(hasTarget) {
    if(targetKg===null)targetHint='Revisa los kg'
    else if(barKg!==null && targetKg<barKg)targetHint='Mín. '+kg(barKg)
    else if(approximate)targetHint='≈ '+kg(total)
  }

  function changePlate(weight:number,change:1|-1) {
    setSetup(s=>({...s,target:'',counts:{...s.counts,[weight]:Math.max(0,(s.counts[weight]??0)+change)}}))
  }
  function selectBar(id:string,mass:number|null) {
    requestWeight.current=mass===null
    setEditWeight(mass===null)
    setSetup(s=>loadTarget({...s,barId:id},mass))
    selector.current?.close()
  }
  return <div className="bar-workbench">
    <div className="bar-target">
      <input aria-label="Peso objetivo total con barra (kg)" placeholder="Peso objetivo" inputMode="decimal" enterKeyHint="done"
        aria-invalid={hasTarget && (targetKg===null || (barKg!==null && targetKg<barKg))}
        aria-describedby="bar-target-hint"
        value={setup.target} onFocus={event=>event.currentTarget.select()}
        onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur()}}
        onChange={event=>{const target=event.target.value;setSetup(s=>loadTarget({...s,target},barKg))}}/>
      <span className="bar-target-unit" aria-hidden="true">kg</span>
      <span id="bar-target-hint" role="status" aria-atomic="true">{approximate&&<span className="sr-only">Peso aproximado: </span>}{targetHint}</span>
      {targetKg!==null && barKg===null && <button type="button" onClick={()=>{
        flushSync(()=>setEditWeight(true))
        input.current?.focus()
      }}>Indicar peso de la barra</button>}
    </div>

    <section className="card bar-stage" aria-label="Tu barra montada">
      <button ref={trigger} type="button" tabIndex={0} className="bar-selector" aria-haspopup="dialog" aria-label={'Elegir barra. Actual: '+bar.name}
        onClick={()=>{selector.current?.showModal();selector.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus()}}>
        <span><small>Barra seleccionada</small><strong>{bar.name}</strong></span><span className="bar-change">Cambiar <ChevronDown size={16}/></span>
      </button>
      <div className="bar-stage-art">
        <div className="bar-total"><span>Peso total</span><output aria-label="Peso total" aria-live="polite" aria-atomic="true">{total===null?'—':number.format(total)} <small>kg</small></output></div>
        <BarbellDrawing shape={bar.shape} plates={loaded}/>
      </div>
      <div className="bar-breakdown"><span>{barKg===null?'Peso de barra pendiente':<><b>{kg(barKg)}</b> de barra</>}</span><Plus size={14} aria-hidden="true"/><span><b>{kg(2*perSide)}</b> de discos</span></div>
      {bar.kg!==null&&<button type="button" className="bar-adjust" aria-expanded={editWeight} onClick={()=>setEditWeight(!editWeight)}>
        <SlidersHorizontal size={14} aria-hidden="true"/>Editar peso de la barra
      </button>}
      {(editWeight||bar.kg===null)&&<div className="bar-weight-field">
        <label>Peso de la barra (kg)<input ref={input} inputMode="decimal" value={weightText} placeholder="Por ejemplo, 12,5"
          aria-invalid={weightText!==''&&barKg===null} onChange={event=>{
            const value=event.target.value
            setSetup(s=>loadTarget({...s,barWeights:{...s.barWeights,[bar.id]:value}},readKg(value)))
          }}/></label>
        <small>{barKg===null&&weightText!==''?'Introduce un peso positivo o cero con hasta dos decimales.':bar.id==='smith'?'Usa la resistencia inicial indicada en tu máquina.':'Usa el peso indicado en tu barra.'}</small>
      </div>}
    </section>

    <section className="card bar-plates" aria-labelledby="bar-plates-title">
      <h3 id="bar-plates-title">Añade discos</h3><p>Cada toque coloca un disco en cada lado.</p>
      <div className="plate-palette">{plates.map(({weight,color,count})=>
        <button type="button" key={weight} id={'add-plate-'+weight} className="plate-tile" style={{'--plate-color':color} as CSSProperties}
          aria-label={'Añadir dos discos de '+kg(weight)} onClick={()=>changePlate(weight,1)}>
          <span className="plate-face" aria-hidden="true"><i/><span className="plate-plus"><Plus size={10} strokeWidth={3}/></span></span>
          <strong>{kg(weight)}</strong>{count>0&&<small aria-hidden="true">×{count} por lado</small>}
        </button>)}</div>
      {loaded.length>0&&<div className="plate-inventory">
        <div className="plate-inventory-title"><h4>En cada lado</h4><strong>{kg(perSide)}</strong></div>
        {loaded.map(({weight,count,color})=><div className="plate-inventory-row" key={weight}>
          <i style={{backgroundColor:color}} aria-hidden="true"/><span>{count} × {kg(weight)}</span>
          <button type="button" aria-label={'Quitar dos discos de '+kg(weight)} onClick={()=>{
            if(count===1)document.getElementById('add-plate-'+weight)?.focus()
            changePlate(weight,-1)
          }}><Minus size={16}/></button>
        </div>)}
      </div>}
    </section>

    <dialog className="bar-picker-dialog" ref={selector} aria-labelledby="bar-picker-title" onClose={()=>{
      if(requestWeight.current)input.current?.focus()
      else trigger.current?.focus({preventScroll:true})
      requestWeight.current=false
    }}>
      <header><h2 id="bar-picker-title">Elige tu barra</h2><button className="icon-button" aria-label="Cerrar selector de barras" onClick={()=>selector.current?.close()}><X size={18}/></button></header>
      <p>Puedes ajustar el peso al que indique tu gimnasio.</p>
      <div className="bar-picker-grid">{barbells.map(item=>{
        const mass=readKg(setup.barWeights[item.id] ?? (item.kg===null?'':String(item.kg)))
        return <button type="button" key={item.id} aria-pressed={item.id===bar.id} onClick={()=>selectBar(item.id,mass)}>
          <span className="bar-mini-bg"><BarbellDrawing shape={item.shape} miniature/></span>
          <strong>{item.name}</strong><small>{mass===null?'Indicar peso':kg(mass)}</small>
          {item.id===bar.id&&<Check className="bar-picker-check" size={15} aria-hidden="true"/>}
        </button>})}</div>
    </dialog>
  </div>
}
