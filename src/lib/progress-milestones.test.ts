import { expect, it } from 'vitest'
import { hipGoalValid, hipMarksThrough, goalComparison } from './hip-goal'
import { monthSummary, moveMonth } from './progress-month'
import type { ProgressLog } from '../types'
import type { Attendance } from './attendance'

const mark = (date:string, kg:number, reps?:number):ProgressLog=>({id:date,date,hipThrustKg:kg,hipThrustReps:reps,notes:''})
const attended = (date:string):Attendance=>({date,title:'Cardio de prueba',type:'cardio',completedAt:date+'T12:00:00Z'})

it('evalúa la carga y las repeticiones de una sola serie aunque la última marca sea distinta',()=>{
  const today='2026-11-12', goal={kg:50,reps:8}
  const logs=[mark('2026-11-02',40,12),mark('2026-11-04',52.5,6),mark('2026-11-05',55),
    mark('2026-11-13',60,8),mark('2026-11-31',60,9)]
  expect(goalComparison(goal,hipMarksThrough(logs,today))).toMatchObject({reachedLoad:true,bestReps:6,achieved:undefined})
  logs.push(mark('2026-11-07',50,8),mark('2026-11-08',45,5))
  const result=goalComparison(goal,hipMarksThrough(logs,today))
  expect(result.achieved?.date).toBe('2026-11-07')
  expect(result.latest?.date).toBe('2026-11-08')
  expect(goalComparison(goal,hipMarksThrough([mark('2026-11-10',60)],today))).toMatchObject({reachedLoad:true,bestReps:0,achieved:undefined})
})

it('solo acepta metas restaurables con una carga finita y repeticiones enteras',()=>{
  expect(hipGoalValid({kg:0,reps:1})).toBe(true)
  expect(hipGoalValid({kg:52.5,reps:10})).toBe(true)
  for(const invalid of [null,{kg:50},{kg:NaN,reps:2},{kg:-5,reps:5},{kg:20,reps:2.5},{kg:20,reps:0},{kg:20,reps:8,extra:'dato'}])expect(hipGoalValid(invalid)).toBe(false)
})

it('cuenta fechas únicas del mes y semanas de lunes a domingo; desempata por repeticiones y después por fecha',()=>{
  const today='2026-11-12'
  const attendance=['2026-10-31','2026-11-01','2026-11-01','2026-11-02','2026-11-05','2026-11-13'].map(attended)
  const marks=hipMarksThrough([mark('2026-10-31',80,2),mark('2026-11-02',50,5),mark('2026-11-07',50,8),
    mark('2026-11-08',50,8),mark('2026-11-10',50),mark('2026-11-12',45,10)],today)
  expect(monthSummary('2026-11',today,attendance,marks)).toMatchObject({days:3,weeks:2,best:{date:'2026-11-08',hipThrustReps:8},bestHasAttendance:false})
  expect(monthSummary('2026-10',today,attendance,marks)).toMatchObject({days:1,weeks:1,best:{date:'2026-10-31'},bestHasAttendance:true})
  expect(monthSummary('2026-09',today,attendance,marks)).toMatchObject({days:0,weeks:0,best:undefined})
  expect(moveMonth('2026-01',-1)).toBe('2025-12')
})
