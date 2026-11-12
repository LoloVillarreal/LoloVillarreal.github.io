import { useState, type FormEvent } from 'react'
import { ChevronDown, Settings2 } from 'lucide-react'
import { barbells } from './data/barbells'
import { useAccount } from './lib/account'
import { gymInventoryValid, type GymInventory } from './lib/gym-inventory'
import { samePreference } from './lib/fitness-preferences'
import { plateWeights } from './lib/gym-tools'

export type GymSettings = {
  owner?:string
  saved?: GymInventory
  loaded:boolean
  ready:boolean
  save:(next:GymInventory,baseline:GymInventory|undefined)=>Promise<void>
}

export function useGymSettings():GymSettings {
  const account=useAccount()
  const confirmed=account.confirmedValues.gymInventory
  return {
    owner:account.session?.user.id,
    loaded:account.complete||gymInventoryValid(confirmed),
    saved:gymInventoryValid(confirmed)?confirmed:undefined,
    ready:Boolean(account.session&&account.complete&&navigator.onLine),
    async save(next,baseline){
      if(!account.session||!account.complete||!navigator.onLine)throw Error('Conéctate y carga tu cuenta para guardar.')
      if(samePreference(account.values.gymInventory,next)){await account.flush();return}
      account.set('gymInventory',(current:unknown)=>{
        if(current!==undefined&&!gymInventoryValid(current))throw Error('Revisa los ajustes de gimnasio de tu cuenta antes de cambiarlos.')
        if(!samePreference(current,baseline)&&!samePreference(current,next))throw Error('Tu gimnasio cambió en otro dispositivo. Cierra y vuelve a abrir los ajustes.')
        return next
      })
      await account.flush()
    },
  }
}

export function InventoryPanel({gym}:{gym:GymSettings}) {
  const [editing,setEditing]=useState(false),[message,setMessage]=useState('')
  return <div className="gym-inventory-panel">
    <button type="button" className="gym-inventory-toggle" aria-expanded={editing} onClick={()=>{setEditing(!editing);setMessage('')}}>
      <Settings2 size={17} aria-hidden="true"/><span>Mi gimnasio</span><small>{gym.saved?.pairs?'Mis pares de discos':'Configurar material'}</small><ChevronDown size={15} aria-hidden="true"/>
    </button>
    {editing&&<InventoryForm gym={gym} onCancel={()=>setEditing(false)} onSaved={()=>{setEditing(false);setMessage('Material guardado en tu cuenta.')}}/>}
    {message&&<p className="small-note" role="status">{message}</p>}
  </div>
}

function InventoryForm({gym,onCancel,onSaved}:{gym:GymSettings;onCancel:()=>void;onSaved:()=>void}){
  const [baseline]=useState(gym.saved)
  const [limited,setLimited]=useState(baseline?baseline.pairs!==null:true)
  const [pairs,setPairs]=useState<Record<number,string>>(()=>Object.fromEntries(plateWeights.map(w=>[w,String(baseline?.pairs?.[w]??0)])))
  const [barId,setBarId]=useState(baseline?.hipBar?.id??'')
  const [mass,setMass]=useState(baseline?.hipBar?.kg.toString().replace('.',',')??'')
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  const submit=async(event:FormEvent)=>{
    event.preventDefault()
    event.stopPropagation()
    if(busy)return
    const next={pairs:limited?Object.fromEntries(plateWeights.map(w=>[w,Number(pairs[w])])):null,
      hipBar:barId?{id:barId,kg:Number(mass.trim().replace(',','.'))}:null}
    if(limited&&plateWeights.some(w=>!/^\d{1,2}$/.test(pairs[w]))){
      setError('Indica de 0 a 99 pares por tamaño.');return
    }
    if((barId&&!/^\d+(?:[.,]\d{1,2})?$/.test(mass.trim()))||!gymInventoryValid(next)){
      setError('Indica la carga inicial de la barra entre 0 y 500 kg, con hasta dos decimales.');return
    }
    setError('');setBusy(true)
    try{await gym.save(next,baseline);onSaved()}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar. Reintenta con conexión.')}
    finally{setBusy(false)}
  }
  return <form className="gym-inventory-form" onSubmit={submit}>
    <fieldset disabled={busy}>
      <label className="gym-inventory-limit"><input type="checkbox" checked={limited} onChange={e=>setLimited(e.target.checked)}/>Usar solo mis discos disponibles</label>
      {limited&&<>
        <p className="small-note">Dos discos iguales forman un par. Pon 0 si tu gimnasio no tiene ese tamaño.</p>
        <div className="gym-inventory-counts">{plateWeights.map(w=><label key={w}>{w.toLocaleString('es-ES')} kg
          <input aria-label={'Pares de '+w.toLocaleString('es-ES')+' kg'} inputMode="numeric" maxLength={2} value={pairs[w]}
            onFocus={event=>event.target.select()} onChange={e=>setPairs(previous=>({...previous,[w]:e.target.value}))}/>
        </label>)}</div>
      </>}
      <label>Barra habitual de hip thrust<select value={barId} onChange={e=>{
        const choice=barbells.find(bar=>bar.id===e.target.value)
        setBarId(e.target.value);setMass(choice?.kg?.toString().replace('.',',')??'')
      }}><option value="">Sin preferencia</option>{barbells.map(bar=><option value={bar.id} key={bar.id}>{bar.name}</option>)}</select></label>
      {barId&&<label>Carga inicial de esa barra (kg)<input inputMode="decimal" value={mass} onChange={e=>setMass(e.target.value)} placeholder="Según la etiqueta"/></label>}
      {error&&<p role="alert" className="warning">{error}</p>}
      {!gym.ready&&<p role="status" className="small-note">Conéctate y carga tu cuenta para guardar estos ajustes.</p>}
      <div className="button-row"><button type="submit" className="primary" disabled={!gym.ready||busy}>{busy?'Guardando…':'Guardar mi gimnasio'}</button>
        <button type="button" className="text-button" onClick={onCancel}>Cancelar</button></div>
    </fieldset>
  </form>
}
