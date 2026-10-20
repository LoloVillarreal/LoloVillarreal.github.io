import { createClient } from '@supabase/supabase-js'
import config from '../data/cloud-config.json'
import { type Item, validateItem } from './model'
export const policeClient=createClient(config.url,config.publishableKey,{auth:{storageKey:'plan-police-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},global:{fetch:async(input,init)=>{const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);try{return await fetch(input,{...init,signal:controller.signal})}finally{clearTimeout(timeout)}}}})
export async function readPanel(){
  const {data:{session},error}=await policeClient.auth.getSession();if(error||!session)throw Error('Inicia sesión para recuperar tu panel.')
  const user=session.user
  const [member,timer,first]=await Promise.all([
    policeClient.from('police_members').select('alias').eq('user_id',user.id).maybeSingle().retry(false),
    policeClient.from('police_timers').select('*').maybeSingle().retry(false),
    policeClient.from('police_records').select('id,kind,day,payload,version').order('id').range(0,499).retry(false)
  ])
  if(member.error)throw member.error
  if(!member.data)throw Error('Esta cuenta no tiene acceso al panel.')
  if(timer.error)throw timer.error
  const items:Item[]=[]
  let page=0,result=first
  for(;;){if(result.error)throw result.error;for(const item of result.data){if(!validateItem(item as Item))throw Error('Hay un registro que necesita revisión. No se han cambiado tus datos.');items.push(item as Item)}if(result.data.length<500)break;page++;result=await policeClient.from('police_records').select('id,kind,day,payload,version').order('id').range(page*500,page*500+499).retry(false)}
  return {items,timer:timer.data,userId:user.id}
}
export async function saveItem(item:Item,userId:string,existing:boolean){
  if(!validateItem(item))throw Error('Revisa los campos y las fechas: no se permite registrar actividad futura.')
  const next={...item,user_id:userId,version:existing?item.version+1:1,updated_at:new Date().toISOString()}
  const result=existing?await policeClient.from('police_records').update(next).eq('id',item.id).eq('version',item.version).select('id').maybeSingle():await policeClient.from('police_records').insert(next).select('id').single()
  if(result.error||!result.data){const check=await policeClient.from('police_records').select('*').eq('id',item.id).maybeSingle();if(check.data&&check.data.version===next.version&&JSON.stringify(sort(check.data.payload))===JSON.stringify(sort(item.payload)))return;throw Error(result.error?.message??'El registro cambió en otro dispositivo. Actualiza antes de editarlo.')}
}
function sort(value:any):any{return Array.isArray(value)?value.map(sort):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sort(value[key])])):value}
export async function removeItem(item:Item){const result=await policeClient.from('police_records').delete().eq('id',item.id).eq('version',item.version).select('id');if(result.error)throw result.error;if(!result.data.length){const check=await policeClient.from('police_records').select('id').eq('id',item.id).maybeSingle();if(check.error||check.data)throw Error('El registro cambió. Actualiza antes de borrarlo.')}}
