import { addDays, isoDate, mondayOf, parseDate, validDate } from './dates'

export type Attendance={date:string;title:string;type:'strength'|'cardio';completedAt:string}

export function attendanceEntryValid(key:string,value:unknown):value is Attendance {
  if(!value||typeof value!=='object'||Array.isArray(value))return false
  const entry=value as Record<string,unknown>
  if(Object.keys(entry).length!==4||Object.keys(entry).some(field=>!['date','title','type','completedAt'].includes(field)))return false
  return validDate(entry.date)&&key===`attendance:${entry.date}`&&
    typeof entry.title==='string'&&entry.title.trim().length>=1&&entry.title.trim().length<=100&&
    (entry.type==='strength'||entry.type==='cardio')&&!(parseDate(entry.date).getDay()===3&&entry.type==='strength')&&
    typeof entry.completedAt==='string'&&
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(entry.completedAt)&&
    validDate(entry.completedAt.slice(0,10))&&Number.isFinite(Date.parse(entry.completedAt))
}

export const attendanceFromValues=(values:Record<string,unknown>):Attendance[]=>Object.entries(values)
  .filter((entry):entry is [string,Attendance]=>attendanceEntryValid(entry[0],entry[1]))
  .map(([,entry])=>entry).sort((a,b)=>a.date.localeCompare(b.date))

export function attendanceStats(entries:Attendance[],today=isoDate()) {
  const dates=[...new Set(entries.filter(entry=>attendanceEntryValid(`attendance:${entry.date}`,entry)&&entry.date<=today).map(entry=>entry.date))]
  const count=(start:string,end=today)=>dates.filter(date=>date>=start&&date<=end).length
  const weekStart=mondayOf(today)
  return {
    week:count(weekStart),
    month:count(`${today.slice(0,7)}-01`),
    total:dates.length,
    last28:count(addDays(today,-27)),
    previous28:count(addDays(today,-55),addDays(today,-28)),
    weeks:Array.from({length:8},(_,index)=>{
      const start=addDays(weekStart,(index-7)*7)
      return {start,count:count(start,addDays(start,6))}
    }),
  }
}
