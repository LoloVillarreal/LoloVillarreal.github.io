import { describe, expect, it } from 'vitest'
import { attendanceEntryValid, attendanceFromValues, attendanceStats, type Attendance } from './attendance'

const attended=(date:string,type:Attendance['type']='cardio'):Attendance=>({date,title:'Mi entrenamiento',type,completedAt:`${date}T18:00:00.000Z`})

describe('días entrenados',()=>{
  it('valida la fecha, el tipo, el título y la hora sin aceptar campos adicionales',()=>{
    const entry=attended('2026-10-19','strength')
    expect(attendanceEntryValid('attendance:2026-10-19',entry)).toBe(true)
    expect(attendanceEntryValid('attendance:2026-10-20',entry)).toBe(false)
    expect(attendanceEntryValid('attendance:2026-10-19',{...entry,title:'  '})).toBe(false)
    expect(attendanceEntryValid('attendance:2026-10-19',{...entry,title:'x'.repeat(101)})).toBe(false)
    expect(attendanceEntryValid('attendance:2026-10-19',{...entry,type:'recovery'})).toBe(false)
    expect(attendanceEntryValid('attendance:2026-10-19',{...entry,completedAt:'2026-10-19'})).toBe(false)
    expect(attendanceEntryValid('attendance:2026-10-19',{...entry,completedAt:'2026-02-30T18:00:00Z'})).toBe(false)
    expect(attendanceEntryValid('attendance:2026-10-19',{...entry,completedAt:'2026-10-19T25:00:00Z'})).toBe(false)
    expect(attendanceEntryValid('attendance:2026-10-19',{...entry,completedAt:'2026-10-19T18:00:00+02:00'})).toBe(true)
    expect(attendanceEntryValid('attendance:2026-10-19',{...entry,photo:'private'})).toBe(false)
    expect(attendanceEntryValid('attendance:2026-02-29',attended('2026-02-29'))).toBe(false)
  })
  it('permite cardio el miércoles y nunca fuerza',()=>{
    expect(attendanceEntryValid('attendance:2026-10-21',attended('2026-10-21'))).toBe(true)
    expect(attendanceEntryValid('attendance:2026-10-21',attended('2026-10-21','strength'))).toBe(false)
    expect(attendanceStats([attended('2026-10-21','strength')],'2026-10-22').total).toBe(0)
  })
  it('lee solo asistencias válidas, ordenadas por fecha; preparar una rutina no cuenta como entrenar',()=>{
    expect(attendanceFromValues({
      'attendance:2026-10-22':attended('2026-10-22'),
      'training:2026-10-20':{title:'Rutina preparada',type:'strength',exercises:[]},
      'attendance:2026-10-19':attended('2026-10-19'),
      'attendance:2026-10-21':attended('2026-10-21','strength'),
      'attendance:2026-10-23':attended('2026-10-22'),
    }).map(entry=>entry.date)).toEqual(['2026-10-19','2026-10-22'])
    expect(attendanceStats(attendanceFromValues({'training:2026-10-20':attended('2026-10-20')}),'2026-10-25').total).toBe(0)
  })
  it('cierra la semana el domingo y empieza otra el lunes, sin duplicar días',()=>{
    const entries=['2026-10-18','2026-10-19','2026-10-25','2026-10-26'].map(date=>attended(date))
    const sunday=attendanceStats([...entries,attended('2026-10-25')],'2026-10-25')
    expect(sunday.week).toBe(2)
    expect(sunday.total).toBe(3)
    expect(sunday.weeks[7]).toEqual({start:'2026-10-19',count:2})
    const monday=attendanceStats(entries,'2026-10-26')
    expect(monday.week).toBe(1)
    expect(monday.weeks[6]).toEqual({start:'2026-10-19',count:2})
    expect(monday.weeks[7]).toEqual({start:'2026-10-26',count:1})
  })
  it('separa meses y mantiene la semana compartida al cambiar de año',()=>{
    const stats=attendanceStats(['2026-12-27','2026-12-28','2026-12-31','2027-01-01','2027-01-03','2027-01-04'].map(date=>attended(date)),'2027-01-03')
    expect(stats.week).toBe(4)
    expect(stats.month).toBe(2)
    expect(stats.total).toBe(5)
    expect(stats.weeks).toHaveLength(8)
    expect(stats.weeks[0].start).toBe('2026-11-09')
    expect(stats.weeks[7]).toEqual({start:'2026-12-28',count:4})
  })
  it('cuenta dos ventanas de 28 días contiguas, inclusivas y sin solaparlas',()=>{
    const stats=attendanceStats(['2026-08-30','2026-08-31','2026-09-27','2026-09-28','2026-10-25','2026-10-26'].map(date=>attended(date)),'2026-10-25')
    expect(stats.last28).toBe(2)
    expect(stats.previous28).toBe(2)
    expect(stats.total).toBe(5)
  })
  it('conserva fechas futuras en una copia pero las excluye de todas las estadísticas',()=>{
    const future=attended('2030-01-01')
    expect(attendanceEntryValid('attendance:2030-01-01',future)).toBe(true)
    const stats=attendanceStats([attended('2026-10-19'),attended('2026-10-20'),future],'2026-10-19')
    expect(stats).toMatchObject({week:1,month:1,total:1,last28:1,previous28:0})
    expect(stats.weeks.reduce((sum,week)=>sum+week.count,0)).toBe(1)
  })
  it('recalcula inmediatamente al borrar un día y conserva ocho semanas vacías sin registros',()=>{
    const values:Record<string,unknown>={'attendance:2026-10-19':attended('2026-10-19'),'attendance:2026-10-20':attended('2026-10-20')}
    expect(attendanceStats(attendanceFromValues(values),'2026-10-20').week).toBe(2)
    delete values['attendance:2026-10-19']
    expect(attendanceStats(attendanceFromValues(values),'2026-10-20')).toMatchObject({week:1,month:1,total:1,last28:1})
    const empty=attendanceStats([],'2026-10-20')
    expect(empty).toMatchObject({week:0,month:0,total:0,last28:0,previous28:0})
    expect(empty.weeks).toHaveLength(8)
    expect(empty.weeks.every(week=>week.count===0)).toBe(true)
  })
})
