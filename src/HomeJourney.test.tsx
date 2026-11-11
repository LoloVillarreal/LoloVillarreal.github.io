// @vitest-environment jsdom
import "fake-indexeddb/auto"
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HomeScreen, TrainingScreen } from './screens'
import { planFromRoutine } from './lib/training-plan'
import { workoutDays } from './data/training'
const account = vi.hoisted(()=>({values:{} as Record<string,unknown>,session:{user:{id:'test'}},set:vi.fn(),remove:vi.fn(),loading:false,saving:false,complete:true,error:''}))
vi.mock('./lib/account',()=>({useAccount:()=>account, AccountGate:({children}:{children:React.ReactNode})=>children, AccountPanel:()=>null,useCloudValue:vi.fn(),accountBackup:vi.fn()}))
vi.mock('./lib/storage',()=>({useStored:()=>[1,vi.fn()],useStorage:()=>({})}))
const wednesday='2026-11-11'
const done={date:wednesday,title:'Cardio de prueba',type:'cardio',completedAt:wednesday+'T12:00:00Z'}
beforeEach(()=>{
  vi.setSystemTime(new Date(wednesday+'T12:00:00'))
  vi.spyOn(window,'scrollTo').mockImplementation(()=>{})
  account.values={}
  account.set.mockClear()
})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers()})
it('después de entrenar, Inicio ofrece ver el registro y preparar fuerza otro día sin asignar un entrenamiento',()=>{
  const go=vi.fn()
  account.values['attendance:'+wednesday]=done
  render(<HomeScreen go={go} reader={null} startTraining={vi.fn()} onStrength={vi.fn()}/>)
  expect(screen.getByRole('heading',{name:'Cardio de prueba'})).toBeTruthy()
  expect(screen.queryByRole('heading',{name:'¿Qué quieres hacer hoy?'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Ver mi registro'}))
  expect(go).toHaveBeenLastCalledWith('training',wednesday)
  fireEvent.click(screen.getByRole('button',{name:'Elegir entrenamiento del jueves'}))
  expect(go).toHaveBeenLastCalledWith('training','2026-11-12')
  expect(account.set).not.toHaveBeenCalled()
})
it('propone una fecha de fuerza disponible sin desplazar un descanso guardado',()=>{
  const go=vi.fn()
  account.values['training:2026-11-12']=planFromRoutine(workoutDays.find(day=>day.type==='recovery')!)
  render(<HomeScreen go={go} reader={null} startTraining={vi.fn()} onStrength={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'Elegir entrenamiento del viernes'}))
  expect(go).toHaveBeenCalledWith('training','2026-11-13')
  expect(account.set).not.toHaveBeenCalled()
})
it('mantiene el registro visible y abre la elección histórica solo por petición',()=>{
  account.values['attendance:'+wednesday]=done
  render(<TrainingScreen date={wednesday} setDate={vi.fn()} notify={vi.fn()} reader={null} bookmark={null} setReader={vi.fn()} finish={vi.fn()} onDirtyChange={vi.fn()}/>)
  expect(screen.getByRole('button',{name:'Quitar día entrenado'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Añadir un plan a este día'}))
  expect(screen.getByRole('heading',{name:'¿Qué quieres hacer hoy?'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Cancelar cambio'}))
  expect(screen.queryByRole('heading',{name:'¿Qué quieres hacer hoy?'})).toBeNull()
  expect(screen.getByRole('button',{name:'Quitar día entrenado'})).toBeTruthy()
  expect(account.set).not.toHaveBeenCalled()
})
