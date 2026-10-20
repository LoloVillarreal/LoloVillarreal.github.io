import type { ProgressDraft, ProgressLog } from '../types'
import { isoDate, validDate } from './dates'

export const emptyProgress=(date=isoDate()):ProgressDraft=>({id:crypto.randomUUID(),date,weight:'',waist:'',hip:'',hipThrustKg:'',hipThrustReps:'',energy:'',sleep:'',notes:'',photo:''})
export const progressDraft=(log:ProgressLog):ProgressDraft=>({id:log.id,date:log.date,weight:String(log.weight??''),waist:String(log.waist??''),hip:String(log.hip??''),hipThrustKg:String(log.hipThrustKg??''),hipThrustReps:String(log.hipThrustReps??''),energy:log.energy??'',sleep:String(log.sleep??''),notes:log.notes,photo:''})
const numeric=(value:string|undefined)=>value?.trim()?Number(value.trim().replace(',','.')):undefined
export function progressEntry(form:ProgressDraft,today=isoDate()):ProgressLog{
  if(!validDate(form.date)||form.date>today)throw Error('Elige una fecha válida, hoy o un día anterior.')
  const weight=numeric(form.weight),waist=numeric(form.waist),hip=numeric(form.hip),hipThrustKg=numeric(form.hipThrustKg),hipThrustReps=numeric(form.hipThrustReps),sleep=numeric(form.sleep)
  if([weight,waist,hip,hipThrustKg,hipThrustReps,sleep].some(v=>v!==undefined&&(!Number.isFinite(v)||v<0)))throw Error('Revisa las cantidades: usa números positivos, con coma o punto decimal.')
  if([weight,waist,hip].some(v=>v===0))throw Error('El peso y las medidas deben ser mayores que cero. Deja el campo vacío si no lo has medido.')
  if(hipThrustReps!==undefined&&(hipThrustKg===undefined||!Number.isInteger(hipThrustReps)||hipThrustReps<1))throw Error('Añade la carga de hip thrust y un número entero de repeticiones mayor que cero.')
  if(sleep!==undefined&&sleep>24)throw Error('Las horas dormidas deben estar entre 0 y 24.')
  const energy=form.energy===''?undefined:form.energy
  if(energy!==undefined&&(!Number.isInteger(energy)||energy<1||energy>5))throw Error('Elige cómo te has sentido de energía, del 1 al 5.')
  if([weight,waist,hip,hipThrustKg,sleep,energy].every(v=>v===undefined)&&!form.notes.trim())throw Error('Añade al menos un dato o una nota antes de guardar.')
  return {id:form.id,date:form.date,weight,waist,hip,hipThrustKg,hipThrustReps,energy,sleep,notes:form.notes.trim()}
}
