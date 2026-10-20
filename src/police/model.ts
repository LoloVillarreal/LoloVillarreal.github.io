import { addDays, mondayOf, parseDate, validDate } from '../lib/dates'

export type Kind='prefs'|'study'|'coffee'|'plan'|'priority'|'result'|'training'|'checkin'|'goal'
export type Segment={start:string;end:string;kind:'study'|'break'}
export type Item={id:string;kind:Kind;day:string|null;payload:Record<string,any>;version:number}
export type Timer={user_id:string;session_id:string;segments:Segment[];phase:'study'|'break'|'paused';resume_phase:'study'|'break';phase_started_at:string|null;remaining_seconds:number|null;pomodoro:boolean;focus_minutes:number;break_minutes:number;version:number}
export type Prefs={timezone:string;dailyHours:number;weeklyHours:number;academyUrl:string;examDate:string;motivation:string;restWeekdays:number[]}
export const defaultPrefs:Prefs={timezone:'Europe/Madrid',dailyHours:2,weeklyHours:10,academyUrl:'',examDate:'',motivation:'',restWeekdays:[0]}
export const labels:Record<Kind,string>={prefs:'Preferencias',study:'Estudio',coffee:'Café',plan:'Bloque del plan',priority:'Prioridad',result:'Resultado de academia',training:'Entrenamiento',checkin:'Bienestar',goal:'Objetivo personal'}
export const dateInZone=(time:number|string,zone:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time))
export const localTime=(time:number|string,zone:string)=>{
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(time))
  const value=(key:string)=>parts.find(p=>p.type===key)?.value
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`
}
export function localToISO(value:string,zone:string){
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)||!validDate(value.slice(0,10)))throw Error('Revisa la fecha y la hora.')
  const desired=Date.parse(`${value}:00Z`)
  if(!Number.isFinite(desired))throw Error('Hora no válida.')
  let guess=desired
  for(let i=0;i<4;i++){const represented=Date.parse(`${localTime(guess,zone)}:00Z`);guess+=desired-represented}
  if(localTime(guess,zone)!==value)throw Error('Esa hora no existe en tu zona por el cambio de horario. Elige una hora válida.')
  if([guess-3600000,guess+3600000].some(time=>localTime(time,zone)===value))throw Error('Esa hora se repite por el cambio de horario. Usa una hora fuera del tramo repetido o el cronómetro.')
  return new Date(guess).toISOString()
}
export const duration=(seconds:number)=>`${Math.floor(Math.max(0,seconds)/3600)} h ${Math.floor(Math.max(0,seconds)%3600/60)} min`
export const clockTime=(seconds:number)=>[Math.floor(Math.max(0,seconds)/3600),Math.floor(Math.max(0,seconds)%3600/60),Math.floor(Math.max(0,seconds)%60)].map(n=>String(n).padStart(2,'0')).join(':')
export function timerSegments(timer:Timer,now=Date.now()):Segment[]{
  const segments=[...timer.segments]
  if(timer.phase!=='paused'&&timer.phase_started_at){
    const start=Date.parse(timer.phase_started_at),end=Math.min(now,timer.remaining_seconds===null?now:start+timer.remaining_seconds*1000)
    if(end>start)segments.push({start:new Date(start).toISOString(),end:new Date(end).toISOString(),kind:timer.phase})
  }
  return segments
}
export const segmentSeconds=(segments:Segment[],kind:'study'|'break',now=Date.now())=>segments.filter(s=>s.kind===kind).reduce((sum,s)=>sum+Math.max(0,Math.min(Date.parse(s.end),now)-Date.parse(s.start))/1000,0)

// Split actual UTC intervals at local midnight; repeated/missing DST hours retain their real duration.
export function studyByDay(items:Item[],zone:string,now=Date.now()){
  const intervals=items.filter(item=>item.kind==='study').flatMap(item=>(item.payload.segments as Segment[]??[]).filter(s=>s.kind==='study').map(s=>[Date.parse(s.start),Math.min(Date.parse(s.end),now)] as [number,number])).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)&&b>a).sort((a,b)=>a[0]-b[0])
  const merged:[number,number][]=[]
  for(const interval of intervals){const last=merged[merged.length-1];if(last&&interval[0]<=last[1])last[1]=Math.max(last[1],interval[1]);else merged.push([...interval])}
  const days:Record<string,number>={}
  for(const [start,end] of merged){
    let cursor=start
    while(cursor<end){
      const day=dateInZone(cursor,zone)
      // Binary search the next local day boundary, supporting time zones with midnight transitions.
      let low=cursor,high=Math.min(end,cursor+27*3600000)
      if(dateInZone(high-1,zone)!==day){while(high-low>1){const middle=Math.floor((low+high)/2);if(dateInZone(middle,zone)===day)low=middle;else high=middle}}
      const stop=high
      days[day]=(days[day]??0)+(stop-cursor)/1000
      cursor=stop
    }
  }
  return days
}
export function stats(items:Item[],prefs:Prefs,now=Date.now()){
  const today=dateInZone(now,prefs.timezone),days=studyByDay(items,prefs.timezone,now),monday=mondayOf(today),previous=addDays(monday,-7)
  const sum=(start:string,end=today)=>Object.entries(days).filter(([day])=>day>=start&&day<=end).reduce((n,[,s])=>n+s,0)
  const first=Object.keys(days).sort()[0],elapsed=first?Math.floor((Date.parse(today+"T00:00:00Z")-Date.parse(first+"T00:00:00Z"))/86400000)+1:0
  const weekDates=Array.from({length:7},(_,i)=>addDays(monday,i))
  const rest=(day:string)=>prefs.restWeekdays.includes(parseDate(day).getDay())||items.some(i=>i.kind==='plan'&&i.day===day&&i.payload.category==='Descanso')
  const expected=weekDates.filter(day=>day<=today&&!rest(day))
  return {today,days,day:days[today]??0,week:sum(monday),month:sum(`${today.slice(0,7)}-01`),total:sum('0000-01-01'),previousWeek:sum(previous,addDays(monday,-1)),sessions:items.filter(i=>i.kind==='study'&&segmentSeconds(i.payload.segments,'study',now)>0).length,average:elapsed?sum(first)/elapsed:0,elapsed,expectedDays:expected.length,studiedExpectedDays:expected.filter(day=>(days[day]??0)>0).length,restDays:weekDates.filter(day=>day<=today&&rest(day)).length,weeks:Array.from({length:8},(_,i)=>{const start=addDays(monday,(i-7)*7);return {start,seconds:sum(start,addDays(start,6))}})}
}
export function coffeeStats(items:Item[],zone:string,now=Date.now()){
  const today=dateInZone(now,zone),week=mondayOf(today)
  const coffees=items.filter(i=>i.kind==='coffee'&&Date.parse(i.payload.at)<=now)
  const dayOf=(i:Item)=>dateInZone(i.payload.at,zone)
  const priced=coffees.filter(i=>typeof i.payload.price==='number')
  return {today:coffees.filter(i=>dayOf(i)===today).length,week:coffees.filter(i=>dayOf(i)>=week).length,month:coffees.filter(i=>dayOf(i).slice(0,7)===today.slice(0,7)).length,total:coffees.length,priced:priced.length,spent:priced.reduce((n,i)=>n+i.payload.price,0)}
}
export function comparableKey(item:Item){
  const p=item.payload
  return item.kind==='result'?`${String(p.category).trim().toLocaleLowerCase()} · escala ${p.scale}`:`${String(p.activity).trim().toLocaleLowerCase()} · ${String(p.unit).trim().toLocaleLowerCase()} · ${p.direction==='lower'?'menor es mejor':'mayor es mejor'}`
}
export function goalProgress(goal:Item,items:Item[],prefs:Prefs,now=Date.now()){
  const days=studyByDay(items,prefs.timezone,now),from=goal.payload.from
  if(goal.payload.metric==='studyHours')return Object.entries(days).filter(([day])=>day>=from).reduce((n,[,seconds])=>n+seconds/3600,0)
  if(goal.payload.metric==='studyDays')return Object.entries(days).filter(([day,seconds])=>day>=from&&seconds>0).length
  return items.filter(item=>item.kind==='training'&&item.day!>=from&&item.day!<=dateInZone(now,prefs.timezone)).length
}
export function validateItem(item:Item,now=Date.now()){
  const p=item.payload,number=(v:any,min=0,max=1e8)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,text=(v:any,max=2000)=>typeof v==='string'&&v.length<=max
  if(!item.id||!labels[item.kind]||!p||typeof p!=='object'||Array.isArray(p)||!number(item.version,1))return false
  if(item.kind!=='prefs'&&!validDate(item.day))return false
  if(item.kind==='prefs'){try{dateInZone(now,p.timezone);if(p.academyUrl){const url=new URL(p.academyUrl);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return false}}catch{return false}return number(p.dailyHours,0,24)&&number(p.weeklyHours,0,168)&&text(p.academyUrl,2000)&&(!p.academyUrl||/^https?:\/\//.test(p.academyUrl))&&text(p.motivation)&&(!p.examDate||validDate(p.examDate))&&Array.isArray(p.restWeekdays)&&p.restWeekdays.every((v:any)=>Number.isInteger(v)&&v>=0&&v<=6)}
  if(item.kind==='study')return Array.isArray(p.segments)&&p.segments.length>0&&p.segments.length<=2000&&p.segments.every((s:Segment)=>['study','break'].includes(s.kind)&&Number.isFinite(Date.parse(s.start))&&Number.isFinite(Date.parse(s.end))&&Date.parse(s.end)>=Date.parse(s.start)&&Date.parse(s.end)<=now+2000)&&segmentSeconds(p.segments,'study',now)>0&&text(p.label,120)&&text(p.note)
  if(item.kind==='coffee')return Number.isFinite(Date.parse(p.at))&&Date.parse(p.at)<=now+2000&&(p.price===undefined||number(p.price,0,10000))&&text(p.note)
  if(item.kind==='plan')return text(p.title,120)&&!!p.title.trim()&&['Academia','Repaso','Clase','Entrenamiento','Descanso'].includes(p.category)&&number(p.minutes,1,1440)&&['pending','done','rescheduled'].includes(p.state)&&text(p.note)
  if(item.kind==='priority')return text(p.title,120)&&!!p.title.trim()&&typeof p.done==='boolean'
  if(['result','training','checkin'].includes(item.kind)&&Date.parse(item.day!+'T00:00:00Z')>now+14*3600000)return false
  if(item.kind==='result')return text(p.name,120)&&!!p.name.trim()&&text(p.category,120)&&!!p.category.trim()&&number(p.scale,.01,1e6)&&number(p.score,0,p.scale)&&text(p.note)
  if(item.kind==='training')return text(p.activity,120)&&!!p.activity.trim()&&number(p.minutes,.1,1440)&&(p.mark===undefined||number(p.mark,.001)&&text(p.unit,30)&&!!p.unit.trim())&&['higher','lower'].includes(p.direction)&&text(p.feeling,300)&&text(p.note)
  if(item.kind==='checkin')return ['energy','focus','mood'].every(k=>p[k]===undefined||number(p[k],1,5))&&(['energy','focus','mood'].some(k=>p[k]!==undefined)||!!p.note?.trim())&&text(p.note)
  return text(p.title,120)&&!!p.title.trim()&&['studyHours','studyDays','workouts'].includes(p.metric)&&number(p.target,.1,100000)&&validDate(p.from)
}
export function exportCsv(items:Item[]){
  const cell=(value:any)=>{let text=String(value??'');if(/^[=+@-]/.test(text))text="'"+text;return `"${text.replace(/"/g,'""')}"`}
  const rows=[['Tipo','Fecha','Nombre / etiqueta','Estudio efectivo min','Descanso min','Precio EUR','Nota obtenida','Escala','Grupo','Entrenamiento min','Marca','Unidad','Mejorar','Estado','Notas','Energía actual 1-5','Concentración 1-5','Ánimo 1-5','Métrica objetivo','Meta','Contar desde','Datos completos JSON'],...items.filter(i=>i.kind!=='prefs').map(i=>{const p=i.payload;return [labels[i.kind],i.day,p.title??p.name??p.label??p.activity,i.kind==='study'?segmentSeconds(p.segments,'study')/60:'',i.kind==='study'?segmentSeconds(p.segments,'break')/60:'',p.price,p.score,p.scale,p.category,p.minutes,p.mark,p.unit,p.direction,p.state,p.note,p.energy,p.focus,p.mood,p.metric,p.target,p.from,JSON.stringify(p)]})]
  return '\ufeff'+rows.map(row=>row.map(cell).join(';')).join('\r\n')
}
