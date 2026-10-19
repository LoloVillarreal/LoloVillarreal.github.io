import { openDB } from 'idb'
import type { AppSettings, Backup, CardioLog, ProgressLog, WorkoutLog } from '../types'
import { validDate } from './dates'

const DB_NAME='glute-core-db'
const DB_VERSION=1
const STORES=['workoutLogs','cardioLogs','progressLogs','kv'] as const
type StoreName=typeof STORES[number]

const dbPromise=openDB(DB_NAME,DB_VERSION,{upgrade(db){
  for(const name of STORES) if(!db.objectStoreNames.contains(name)) db.createObjectStore(name,{keyPath:name==='kv'?undefined:'id'})
}})

export const defaultSettings:AppSettings={darkMode:false,hideSensitive:false,startDate:new Date().toLocaleDateString('en-CA'),calorieTarget:1900,proteinTarget:110,fatTarget:60,carbTarget:230}

export async function getAll<T>(store:Exclude<StoreName,'kv'>):Promise<T[]>{return (await dbPromise).getAll(store)}
export async function put<T extends {id:string}>(store:Exclude<StoreName,'kv'>,value:T){const tx=(await dbPromise).transaction(store,'readwrite');await tx.store.put(value);await tx.done}
export async function remove(store:Exclude<StoreName,'kv'>,id:string){const tx=(await dbPromise).transaction(store,'readwrite');await tx.store.delete(id);await tx.done}
export async function getKV<T>(key:string,fallback:T):Promise<T>{return (await (await dbPromise).get('kv',key)) ?? fallback}
export async function setKV<T>(key:string,value:T){const tx=(await dbPromise).transaction('kv','readwrite');await tx.store.put(value,key);await tx.done}
export async function getLocalState():Promise<Record<string,unknown>>{
  const tx=(await dbPromise).transaction('kv')
  const [keys,values]=await Promise.all([tx.store.getAllKeys(),tx.store.getAll()])
  return Object.fromEntries(keys.map((key,i)=>[String(key),values[i]]))
}

export async function loadBackup():Promise<Backup>{
  const [workoutLogs,cardioLogs,progressLogs,mealChecks,settings]=await Promise.all([
    getAll<WorkoutLog>('workoutLogs'),getAll<CardioLog>('cardioLogs'),getAll<ProgressLog>('progressLogs'),getKV<Record<string,boolean>>('mealChecks',{}),getKV<AppSettings>('settings',defaultSettings)
  ])
  return {schemaVersion:2,exportedAt:new Date().toISOString(),workoutLogs,cardioLogs,progressLogs,mealChecks,settings,localState:await getLocalState()}
}

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0
const optionalNumber=(v:unknown)=>v===undefined||number(v)
const text=(v:unknown)=>typeof v==='string'
const numberText=(v:unknown)=>text(v)&&(v===''||Number.isFinite(Number(v)))
const strings=(v:Record<string,unknown>,keys:string[])=>keys.every(k=>text(v[k]))
const boolMap=(v:unknown)=>object(v)&&Object.values(v).every(x=>typeof x==='boolean')
const portionMap=(v:unknown)=>object(v)&&Object.values(v).every(x=>number(x)&&Number(x)>0&&Number(x)<=10)
const settingsValid=(v:unknown)=>object(v)&&typeof v.darkMode==='boolean'&&typeof v.hideSensitive==='boolean'&&validDate(v.startDate)&&['calorieTarget','proteinTarget','fatTarget','carbTarget'].every(k=>number(v[k]))
const baseLog=(v:unknown):v is Record<string,unknown>=>object(v)&&text(v.id)&&!!v.id&&validDate(v.date)
const workoutValid=(v:unknown)=>baseLog(v)&&strings(v,['workoutTitle','exerciseId','exerciseName','notes'])&&number(v.workoutDay)&&Number(v.workoutDay)<=6&&typeof v.completed==='boolean'&&Array.isArray(v.sets)&&v.sets.every(s=>object(s)&&number(s.set)&&['warmup','working'].includes(String(s.kind))&&typeof s.done==='boolean'&&['weight','reps','seconds','rir'].every(k=>optionalNumber(s[k])))&&optionalNumber(v.fatigue)&&(v.discomfort===undefined||text(v.discomfort))
const modalities=['Caminata','Bicicleta','Elíptica','Carrera','Otro']
const cardioValid=(v:unknown)=>baseLog(v)&&modalities.includes(String(v.modality))&&number(v.duration)&&optionalNumber(v.distance)&&number(v.rpe)&&text(v.notes)
const progressValid=(v:unknown)=>baseLog(v)&&['weight','waist','hip','hipThrustKg','hipThrustReps'].every(k=>optionalNumber(v[k]))&&number(v.energy)&&number(v.sleep)&&text(v.notes)&&(v.photo===undefined||text(v.photo))

function localValueValid(key:string,v:unknown):boolean{
  if(key==='settings')return settingsValid(v)
  if(key==='mealChecks'||key==='shoppingChecks'||key==='finishedSessions')return boolMap(v)
  if(key==='mealPortions'||key==='consumedPortions')return portionMap(v)
  if(key==='lastExport')return text(v)
  if(key==='guideWeek')return number(v)&&Number(v)>=1&&Number(v)<=12
  if(key==='nutritionCategory')return ['breakfast','lunch','dinner','snack'].includes(String(v))
  if(key==='personalGoal')return text(v)
  if(key==='goalDraft')return object(v)&&['calorieTarget','proteinTarget','fatTarget','carbTarget'].every(k=>numberText(v[k]))
  if(key==='navigation')return object(v)&&validDate(v.day)&&validDate(v.trainingDate)&&validDate(v.nutritionDate)&&['home','training','nutrition','progress','more'].includes(String(v.section))&&['calc','tips','settings'].includes(String(v.tab))
  if(key==='timer')return object(v)&&(v.endsAt===null||number(v.endsAt))&&number(v.remaining)
  if(key==='calculator')return object(v)&&['age','height','weight','calories','protein','fat'].every(k=>numberText(v[k]))&&number(v.activity)&&['female','male'].includes(String(v.sex))
  if(key==='progressDraft')return object(v)&&text(v.id)&&(v.date===''||validDate(v.date))&&['weight','waist','hip','sleep'].every(k=>numberText(v[k]))&&['hipThrustKg','hipThrustReps'].every(k=>v[k]===undefined||numberText(v[k]))&&number(v.energy)&&strings(v,['notes','photo'])
  if(key.startsWith('exercise:'))return workoutValid(v)
  if(key.startsWith('cardio:'))return baseLog(v)&&modalities.includes(String(v.modality))&&numberText(v.duration)&&numberText(v.distance)&&number(v.rpe)&&text(v.notes)
  return false
}

export function validateBackup(data:unknown):data is Backup{
  if(!object(data))return false
  return (data.schemaVersion===1||data.schemaVersion===2)&&text(data.exportedAt)&&Array.isArray(data.workoutLogs)&&data.workoutLogs.every(workoutValid)&&Array.isArray(data.cardioLogs)&&data.cardioLogs.every(cardioValid)&&Array.isArray(data.progressLogs)&&data.progressLogs.every(progressValid)&&boolMap(data.mealChecks)&&settingsValid(data.settings)&&(data.schemaVersion===1||(object(data.localState)&&Object.entries(data.localState).every(([key,value])=>localValueValid(key,value))))
}

export async function importBackup(data:Backup){
  if(!validateBackup(data))throw new Error('Copia no válida')
  const db=await dbPromise
  const tx=db.transaction([...STORES],'readwrite')
  try{
  for(const store of STORES) await tx.objectStore(store).clear()
  for(const x of data.workoutLogs) await tx.objectStore('workoutLogs').put(x)
  for(const x of data.cardioLogs) await tx.objectStore('cardioLogs').put(x)
  for(const x of data.progressLogs) await tx.objectStore('progressLogs').put(x)
  for(const [key,value] of Object.entries(data.localState??{}))await tx.objectStore('kv').put(value,key)
  await tx.objectStore('kv').put(data.mealChecks,'mealChecks')
  await tx.objectStore('kv').put(data.settings,'settings')
  await tx.done
  }catch(error){try{tx.abort()}catch{}await tx.done.catch(()=>{});throw error}
}

export async function clearAll(){
  const db=await dbPromise
  const tx=db.transaction([...STORES],'readwrite')
  await Promise.all(STORES.map(s=>tx.objectStore(s).clear()))
  await tx.done
}
