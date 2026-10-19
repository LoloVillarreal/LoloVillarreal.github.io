import { openDB } from 'idb'
import type { AppSettings, Backup, CardioLog, ProgressLog, WorkoutLog } from '../types'

const DB_NAME='glute-core-db'
const DB_VERSION=1
const STORES=['workoutLogs','cardioLogs','progressLogs','kv'] as const
type StoreName=typeof STORES[number]

const dbPromise=openDB(DB_NAME,DB_VERSION,{upgrade(db){
  for(const name of STORES) if(!db.objectStoreNames.contains(name)) db.createObjectStore(name,{keyPath:name==='kv'?undefined:'id'})
}})

export const defaultSettings:AppSettings={darkMode:false,hideSensitive:false,startDate:new Date().toLocaleDateString('en-CA'),calorieTarget:1900,proteinTarget:110,fatTarget:60,carbTarget:230}

export async function getAll<T>(store:Exclude<StoreName,'kv'>):Promise<T[]>{return (await dbPromise).getAll(store)}
export async function put<T extends {id:string}>(store:Exclude<StoreName,'kv'>,value:T){return (await dbPromise).put(store,value)}
export async function remove(store:Exclude<StoreName,'kv'>,id:string){return (await dbPromise).delete(store,id)}
export async function getKV<T>(key:string,fallback:T):Promise<T>{return (await (await dbPromise).get('kv',key)) ?? fallback}
export async function setKV<T>(key:string,value:T){return (await dbPromise).put('kv',value,key)}

export async function loadBackup():Promise<Backup>{
  const [workoutLogs,cardioLogs,progressLogs,mealChecks,settings]=await Promise.all([
    getAll<WorkoutLog>('workoutLogs'),getAll<CardioLog>('cardioLogs'),getAll<ProgressLog>('progressLogs'),getKV<Record<string,boolean>>('mealChecks',{}),getKV<AppSettings>('settings',defaultSettings)
  ])
  return {schemaVersion:1,exportedAt:new Date().toISOString(),workoutLogs,cardioLogs,progressLogs,mealChecks,settings}
}

export function validateBackup(data:unknown):data is Backup{
  if(!data||typeof data!=='object') return false
  const d=data as Partial<Backup>
  return d.schemaVersion===1&&Array.isArray(d.workoutLogs)&&Array.isArray(d.cardioLogs)&&Array.isArray(d.progressLogs)&&!!d.mealChecks&&!!d.settings
}

export async function importBackup(data:Backup){
  const db=await dbPromise
  const tx=db.transaction([...STORES],'readwrite')
  for(const store of STORES) await tx.objectStore(store).clear()
  for(const x of data.workoutLogs) await tx.objectStore('workoutLogs').put(x)
  for(const x of data.cardioLogs) await tx.objectStore('cardioLogs').put(x)
  for(const x of data.progressLogs) await tx.objectStore('progressLogs').put(x)
  await tx.objectStore('kv').put(data.mealChecks,'mealChecks')
  await tx.objectStore('kv').put(data.settings,'settings')
  await tx.done
}

export async function clearAll(){
  const db=await dbPromise
  const tx=db.transaction([...STORES],'readwrite')
  await Promise.all(STORES.map(s=>tx.objectStore(s).clear()))
  await tx.done
}
