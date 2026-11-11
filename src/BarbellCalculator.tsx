import { useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import { flushSync } from 'react-dom'
import { Check, ChevronDown, ChevronRight, Minus, Plus, SlidersHorizontal, Target, X } from 'lucide-react'
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

export default function BarbellCalculator({setup,setSetup}:{setup:Setup;setSetup:Dispatch<SetStateAction<Setup>>}) {
  const bar=barbells.find(item=>item.id===setup.barId) ?? barbells[0]
  const weightText=setup.barWeights[bar.id] ?? (bar.kg===null?'':number.format(bar.kg))
  const barKg=readKg(weightText)
  const plates=plateWeights.map(weight=>({weight,count:setup.counts[weight]??0,color:colors[weight]}))
  const loaded=plates.filter(plate=>plate.count>0)
  const perSide=loaded.reduce((sum,{weight,count})=>sum+weight*count,0)
  const total=barKg===null?null:barKg+2*perSide
  const targetKg=readKg(setup.target)
  const suggested=targetKg!==null && barKg!==null ? platesPerSide(targetKg,barKg) : null
  const possible=suggested && barKg!==null ? barKg+2*suggested.plates.reduce((sum,p)=>sum+p.weight*p.count,0) : null
  const [editWeight,setEditWeight]=useState(false)
  const selector=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null)
  const input=useRef<HTMLInputElement>(null),requestWeight=useRef(false)
  const [targetOpen,setTargetOpen]=useState(false)
  const targetTrigger=useRef<HTMLButtonElement>(null),stage=useRef<HTMLElement>(null)

  function changePlate(weight:number,change:1|-1) {
    setSetup(s=>({...s,counts:{...s.counts,[weight]:Math.max(0,(s.counts[weight]??0)+change)}}))
  }
  function selectBar(id:string,needsWeight:boolean) {
    requestWeight.current=needsWeight
    setEditWeight(needsWeight)
    setSetup(s=>({...s,barId:id}))
    selector.current?.close()
  }
  function closeTarget() {
    setTargetOpen(false)
    targetTrigger.current?.focus()
  }
  function applyTarget() {
    if(!suggested)return
    setSetup(s=>({...s,counts:Object.fromEntries(suggested.plates.map(p=>[p.weight,p.count]))}))
    setTargetOpen(false)
    stage.current?.focus()
  }
  return <div className="bar-workbench">
    <div className="bar-target">
      <button type="button" className="primary bar-target-trigger" ref={targetTrigger} aria-expanded={targetOpen}
        aria-controls="bar-target-form" onClick={()=>targetOpen ? closeTarget() : setTargetOpen(true)}>
        <Target size={22} aria-hidden="true"/><span>{targetOpen?'Cerrar cálculo':'Calcular peso objetivo'}</span><ChevronDown size={18} aria-hidden="true"/>
      </button>
      <div id="bar-target-form" hidden={!targetOpen}>
        {targetOpen&&<form className="card bar-target-form" onSubmit={event=>{event.preventDefault();applyTarget()}}
          onKeyDown={event=>{
            if(event.key==='Escape')closeTarget()
          }}>
          <label>Peso total con barra (kg)<input inputMode="decimal" autoFocus value={setup.target} placeholder="Por ejemplo, 60"
            onFocus={event=>event.currentTarget.select()} onChange={event=>{const target=event.target.value;setSetup(s=>({...s,target}))}}/></label>
          {barKg===null?<button type="button" className="secondary full" onClick={()=>{
            flushSync(()=>setEditWeight(true))
            input.current?.focus()
          }}>Indicar peso de la barra</button>
            :setup.target.trim()!==''&&(suggested&&possible!==null&&targetKg!==null?<div className="bar-target-result">
              <p>{suggested.plates.length?'En cada lado: '+suggested.plates.map(p=>p.count+' × '+kg(p.weight)).join(' + ')+'.':'Solo necesitas la barra.'}</p>
              {suggested.remainder>0&&<p>Con estos discos puedes montar {kg(possible)}. Faltarían {kg(targetKg-possible)} para el objetivo.</p>}
              <button type="submit" className="primary full">Colocar {kg(possible)}<ChevronRight size={16} aria-hidden="true"/></button>
            </div>:<p>{targetKg!==null&&targetKg<barKg?'El objetivo debe ser igual o mayor que el peso de la barra.':'Escribe un peso válido con hasta dos decimales.'}</p>)}
        </form>}
      </div>
    </div>

    <section className="card bar-stage" tabIndex={-1} ref={stage} aria-label="Tu barra montada">
      <button ref={trigger} type="button" className="bar-selector" aria-haspopup="dialog" aria-label={'Elegir barra. Actual: '+bar.name}
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
          aria-invalid={weightText!==''&&barKg===null} onChange={event=>{const value=event.target.value;setSetup(s=>({...s,barWeights:{...s.barWeights,[bar.id]:value}}))}}/></label>
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
        return <button type="button" key={item.id} aria-pressed={item.id===bar.id} onClick={()=>selectBar(item.id,mass===null)}>
          <span className="bar-mini-bg"><BarbellDrawing shape={item.shape} miniature/></span>
          <strong>{item.name}</strong><small>{mass===null?'Indicar peso':kg(mass)}</small>
          {item.id===bar.id&&<Check className="bar-picker-check" size={15} aria-hidden="true"/>}
        </button>})}</div>
    </dialog>
  </div>
}
