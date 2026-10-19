import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { workoutDays } from '../data/training'
import { exerciseLibrary, planFromRoutine, trainingEntryValid, trainingPlanValid, workoutForDate } from './training-plan'
import { defaultSettings, validateBackup } from './db'

describe('selección de entrenamiento por fecha',()=>{
  it('mantiene el programa si no hay una selección',()=>{
    expect(workoutForDate('2026-10-19').title).toBe('Glúteos y femorales')
    expect(workoutForDate('2026-10-21').type).toBe('cardio')
    expect(workoutForDate('2026-10-23').optional).toBe(true)
  })
  it('permite elegir una rutina distinta y conserva orden, imágenes y parámetros',()=>{
    const plan=planFromRoutine(workoutDays.find(day=>day.day===2)!)
    plan.exercises.reverse();plan.exercises[0].sets=4;plan.exercises[0].reps=[12,16];plan.exercises[0].rest=80
    const resolved=workoutForDate('2026-10-19',plan)
    expect(resolved.title).toBe('Tren superior y abdomen');expect(resolved.exercises[0].id).toBe(plan.exercises[0].exerciseId)
    expect(resolved.exercises[0].sets).toBe(4);expect(resolved.exercises[0].reps).toEqual([12,16]);expect(resolved.exercises[0].rest).toEqual([80,80]);expect(resolved.exercises[0].hevyId).toBeTruthy()
  })
  it('impide fuerza los miércoles y no convierte el viernes en obligatorio',()=>{
    const plan=planFromRoutine(workoutDays[0])
    expect(trainingEntryValid('training:2026-10-21',plan)).toBe(false)
    expect(workoutForDate('2026-10-21',plan).type).toBe('cardio')
    expect(workoutForDate('2026-10-23',plan).optional).toBe(true)
  })
  it('rechaza IDs desconocidos, duplicados y parámetros dañados',()=>{
    const plan=planFromRoutine(workoutDays[0]);expect(trainingPlanValid(plan)).toBe(true)
    expect(trainingPlanValid({...plan,exercises:[...plan.exercises,plan.exercises[0]]})).toBe(false)
    expect(trainingPlanValid({...plan,exercises:[{...plan.exercises[0],exerciseId:'unknown'}]})).toBe(false)
    expect(trainingPlanValid({...plan,exercises:[{...plan.exercises[0],reps:[15,10]}]})).toBe(false)
    expect(trainingPlanValid({...plan,photo:'data:image/png;base64,AA=='})).toBe(false)
    expect(trainingEntryValid('training:not-a-date',plan)).toBe(false)
    expect(new Set(exerciseLibrary.map(item=>item.hevyId)).size).toBe(exerciseLibrary.length)
  })
  it('incluye selecciones en copias válidas y rechaza fuerza el miércoles al importar',()=>{
    const plan=planFromRoutine(workoutDays[0]),backup={schemaVersion:2,exportedAt:new Date().toISOString(),workoutLogs:[],cardioLogs:[],progressLogs:[],mealChecks:{},settings:defaultSettings,localState:{'training:2026-10-19':plan}}
    expect(validateBackup(backup)).toBe(true)
    expect(validateBackup({...backup,localState:{'training:2026-10-21':plan}})).toBe(false)
  })
})
