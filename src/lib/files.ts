import type { Backup, ProgressLog, WorkoutLog } from '../types'

export function download(content:string,name:string,type='application/json'){
  const url=URL.createObjectURL(new Blob([content],{type}))
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}

const csvCell=(v:unknown)=>`"${String(v??'').replace(/"/g,'""')}"`
export function progressCsv(logs:ProgressLog[]){
  const rows=[['Fecha','Peso kg','Cintura cm','Cadera cm','Energía 1-5','Sueño h','Notas'],...logs.map(x=>[x.date,x.weight,x.waist,x.hip,x.energy,x.sleep,x.notes])]
  return '\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n')
}
export function workoutsCsv(logs:WorkoutLog[]){
  const rows=[['Fecha','Sesión','Ejercicio','Serie','Tipo','Peso kg','Reps','Segundos','RIR','Completada'],...logs.flatMap(x=>x.sets.map(s=>[x.date,x.workoutTitle,x.exerciseName,s.set,s.kind,s.weight,s.reps,s.seconds,s.rir,s.done]))]
  return '\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n')
}
export const backupJson=(data:Backup)=>JSON.stringify(data,null,2)
