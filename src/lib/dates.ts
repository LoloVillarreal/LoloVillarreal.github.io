export const isoDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
export const parseDate=(date:string)=>new Date(`${date}T12:00:00`)
export const addDays=(date:string,days:number)=>{const d=parseDate(date);d.setDate(d.getDate()+days);return isoDate(d)}
export const mondayOf=(date=isoDate())=>addDays(date,-((parseDate(date).getDay()+6)%7))
export const weekDates=(date:string)=>Array.from({length:7},(_,i)=>addDays(mondayOf(date),i))
export const shortDate=(date:string)=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short'}).format(parseDate(date))
export const validDate=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(parseDate(value).getTime())&&isoDate(parseDate(value))===value
