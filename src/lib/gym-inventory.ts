import { barbells } from '../data/barbells'
import type { ProgressLog } from '../types'
import { hipThrustProgress } from './calculations'
import { isoDate, validDate } from './dates'
import { plateWeights } from './gym-tools'

export type GymInventory = {
  pairs: Record<number,number> | null
  hipBar: { id:string; kg:number } | null
}

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
export function gymInventoryValid(v:unknown):v is GymInventory {
  if(!object(v)||Object.keys(v).length!==2)return false
  const {pairs,hipBar}=v
  if(pairs!==null&&(!object(pairs)||Object.keys(pairs).length!==plateWeights.length||!plateWeights.every(weight=>{
    const count=pairs[weight]
    return typeof count==='number'&&Number.isInteger(count)&&count>=0&&count<=99
  })))return false
  return hipBar===null || (object(hipBar)&&Object.keys(hipBar).length===2&&barbells.some(bar=>bar.id===hipBar.id)&&
    typeof hipBar.kg==='number'&&Number.isFinite(hipBar.kg)&&hipBar.kg>=0&&hipBar.kg<=500&&Math.abs(hipBar.kg*100-Math.round(hipBar.kg*100))<0.000001)
}

export function latestHipMark(confirmed:Record<string,unknown>,today=isoDate()) {
  const logs=Object.entries(confirmed).filter(([key,v])=>key.startsWith('progress:')&&object(v)&&
    key==='progress:'+v.id&&validDate(v.date)&&v.date<=today&&typeof v.hipThrustKg==='number')
    .map(([,v])=>v as ProgressLog)
  return hipThrustProgress(logs).latest
}
