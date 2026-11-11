// @vitest-environment jsdom
import "fake-indexeddb/auto"
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  account.complete=true
  account.set.mockClear()
})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers()})
it('mantiene el punto de lectura al abrir sin datos y reanuda cuando vuelve la rutina',()=>{
  const date='2026-11-12',startTraining=vi.fn(),go=vi.fn()
  vi.setSystemTime(new Date(date+'T12:00:00'))
  const props={go,reader:{date,index:2},startTraining,onStrength:vi.fn()}
  account.complete=false
  const {rerender}=render(<HomeScreen {...props}/>)
  expect(screen.getByRole('heading',{name:'Tu sesión está en pausa'})).toBeTruthy()
  expect(screen.getByText(/Te quedaste en el ejercicio 3/)).toBeTruthy()
  expect(screen.queryByRole('button',{name:'Fuerza'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Abrir herramientas'}))
  expect(go).toHaveBeenCalledWith('nutrition')
  account.values['training:'+date]=planFromRoutine(workoutDays[0])
  account.complete=true
  rerender(<HomeScreen {...props}/>)
  fireEvent.click(screen.getByRole('button',{name:/Continuar · ejercicio 3/}))
  expect(startTraining).toHaveBeenCalledWith(date,2)
  expect(account.set).not.toHaveBeenCalled()
})
it('el calendario solo pide descartar una elección si cambia de día y hay algo elegido',()=>{
  const date='2026-11-12',setDate=vi.fn()
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(false)
  render(<TrainingScreen date={date} setDate={setDate} notify={vi.fn()} reader={null} bookmark={null} setReader={vi.fn()} finish={vi.fn()} onDirtyChange={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'Fuerza'}))
  fireEvent.click(screen.getByRole('button',{name:/viernes, 13 de noviembre/i}))
  expect(confirm).not.toHaveBeenCalled()
  expect(setDate).toHaveBeenCalledWith('2026-11-13')
  setDate.mockClear()
  fireEvent.click(screen.getByRole('button',{name:/Glúteos y femorales/}))
  fireEvent.click(screen.getByRole('button',{name:/jueves, 12 de noviembre/i}))
  expect(confirm).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:/viernes, 13 de noviembre/i}))
  expect(confirm).toHaveBeenCalledOnce()
  expect(setDate).not.toHaveBeenCalled()
  expect(screen.getByRole('button',{name:/Glúteos y femorales/,pressed:true})).toBeTruthy()
})
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
  fireEvent.click(screen.getByRole('button',{name:/lunes, 9 de noviembre, sin registro/i}))
  expect(go).toHaveBeenLastCalledWith('training','2026-11-09')
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
it.each(['Inicio','Entrenos'])('mantiene el foco al abrir y cancelar un cambio de rutina desde %s',async origin=>{
  const key='training:'+wednesday
  const original=planFromRoutine(workoutDays.find(day=>day.type==='cardio')!)
  account.values[key]=original
  render(origin==='Inicio'
    ?<HomeScreen go={vi.fn()} reader={null} startTraining={vi.fn()} onStrength={vi.fn()}/>
    :<TrainingScreen date={wednesday} setDate={vi.fn()} notify={vi.fn()} reader={null} bookmark={null} setReader={vi.fn()} finish={vi.fn()} onDirtyChange={vi.fn()}/>)
  const opener=screen.getByRole('button',{name:'Cambiar mi elección'})
  opener.focus()
  fireEvent.click(opener)
  expect(document.activeElement).toBe(screen.getByRole('heading',{name:'¿Qué quieres hacer hoy?'}))
  fireEvent.click(screen.getByRole('button',{name:'Cancelar cambio'}))
  await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('button',{name:'Cambiar mi elección'})))
  expect(account.values[key]).toBe(original)
  expect(account.set).not.toHaveBeenCalled()
})
it('mantiene el registro visible y abre la elección histórica solo por petición',async()=>{
  account.values['attendance:'+wednesday]=done
  render(<TrainingScreen date={wednesday} setDate={vi.fn()} notify={vi.fn()} reader={null} bookmark={null} setReader={vi.fn()} finish={vi.fn()} onDirtyChange={vi.fn()}/>)
  expect(screen.getByRole('button',{name:'Quitar día entrenado'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Añadir un plan a este día'}))
  expect(document.activeElement).toBe(screen.getByRole('heading',{name:'¿Qué quieres hacer hoy?'}))
  fireEvent.click(screen.getByRole('button',{name:'Cancelar cambio'}))
  expect(screen.queryByRole('heading',{name:'¿Qué quieres hacer hoy?'})).toBeNull()
  expect(screen.getByRole('button',{name:'Quitar día entrenado'})).toBeTruthy()
  await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('button',{name:'Añadir un plan a este día'})))
  expect(account.set).not.toHaveBeenCalled()
})
