// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DayChoice } from './DayChoice'
import { TrainingScreen } from './screens'
import { trainingEntryValid, type TrainingPlan } from './lib/training-plan'

const account=vi.hoisted(()=>({
  values:{} as Record<string,unknown>, session:{user:{id:'synthetic'}}, complete:true,
  loading:false, saving:false, error:'', set:vi.fn(), flush:vi.fn(), refresh:vi.fn(), remove:vi.fn(),
}))
vi.mock('./lib/account',()=>({
  useAccount:()=>account, AccountGate:({children}:{children:React.ReactNode})=>children,
  AccountPanel:()=>null, useCloudValue:vi.fn(), accountBackup:vi.fn(),
}))
beforeEach(()=>{
  account.values={}
  vi.spyOn(window,'scrollTo').mockImplementation(()=>{})
  account.set.mockReset().mockImplementation((key:string,update:unknown)=>{account.values[key]=typeof update==='function'?update(account.values[key]):update})
  account.flush.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator,'onLine',{value:true,configurable:true})
})
afterEach(()=>{cleanup();vi.restoreAllMocks()})
const mount=(date:string,onSaved=vi.fn())=>render(<DayChoice date={date} onBegin={()=>{}} onSaved={onSaved}/>)

it('el miércoles ofrece cardio y descanso sin elegir actividad ni tiempo y guarda solo tras confirmación',async()=>{
  const saved=vi.fn();mount('2026-11-11',saved)
  expect(screen.queryByRole('button',{name:'Fuerza'})).toBeNull()
  expect(account.set).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Cardio'}))
  expect((screen.getByLabelText('Actividad') as HTMLSelectElement).value).toBe('')
  expect((screen.getByLabelText('Duración en minutos') as HTMLInputElement).value).toBe('')
  expect((screen.getByRole('button',{name:'Guardar mi elección'}) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('Actividad'),{target:{value:'Bicicleta'}})
  fireEvent.change(screen.getByLabelText('Duración en minutos'),{target:{value:'20'}})
  expect(account.set).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Guardar mi elección'}))
  await waitFor(()=>expect(saved).toHaveBeenCalledWith(false))
  expect(account.values['training:2026-11-11']).toMatchObject({type:'cardio',title:'Bicicleta',cardio:{activity:'Bicicleta',minutes:20}})
})
it('permite guardar descanso el miércoles sin crear una asistencia',async()=>{
  mount('2026-11-11')
  fireEvent.click(screen.getByRole('button',{name:'Descanso'}))
  fireEvent.click(screen.getByRole('button',{name:'Guardar descanso'}))
  await waitFor(()=>expect(account.set).toHaveBeenCalledTimes(1))
  const key=account.set.mock.calls[0][0] as string,plan=account.values[key] as TrainingPlan
  expect(key).toBe('training:2026-11-11');expect(plan.type).toBe('recovery');expect(trainingEntryValid(key,plan)).toBe(true)
})
it('exige elegir también la rutina de fuerza en un viernes opcional',async()=>{
  mount('2026-11-13')
  expect(screen.getByText('Entrenar el viernes es opcional.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Fuerza'}))
  const save=screen.getByRole('button',{name:'Guardar mi elección'}) as HTMLButtonElement
  expect(save.disabled).toBe(true)
  fireEvent.click(screen.getByRole('button',{name:/Tren superior y abdomen/}))
  expect(account.set).not.toHaveBeenCalled();fireEvent.click(save)
  await waitFor(()=>expect(account.values['training:2026-11-13']).toMatchObject({title:'Tren superior y abdomen'}))
})
it('ignora la posición antigua sin planificación pero conserva el día entrenado anterior',()=>{
  const date='2026-10-19'
  account.values['attendance:'+date]={date,title:'Sesión ya hecha',type:'strength',completedAt:'2026-10-19T10:30:00Z'}
  render(<TrainingScreen date={date} setDate={vi.fn()} notify={vi.fn()} reader={{date,index:2}} bookmark={{date,index:2}} setReader={vi.fn()} finish={vi.fn()} onDirtyChange={vi.fn()}/>)
  expect(screen.getByRole('heading',{name:'¿Qué quieres hacer este día?'})).toBeTruthy()
  expect(screen.getByRole('button',{name:'Quitar día entrenado'})).toBeTruthy()
  expect(screen.queryByRole('button',{name:/Terminar y registrar|Empezar entrenamiento|Registrar entrenamiento realizado/})).toBeNull()
  expect(account.set).not.toHaveBeenCalled()
})

it('cancela o reemplaza un cardio guardado sin cambiar asistencia',async()=>{
  const date='2026-11-11',key='training:'+date
  const original:TrainingPlan={type:'cardio',title:'Bicicleta',cardio:{activity:'Bicicleta',minutes:25},exercises:[],notes:''}
  account.values[key]=original
  const props={date,previousPlan:original,onBegin:vi.fn(),onSaved:vi.fn(),onCancel:vi.fn()}
  render(<DayChoice {...props}/>)
  fireEvent.click(screen.getByRole('button',{name:'Cancelar cambio'}))
  expect(props.onCancel).toHaveBeenCalledOnce();expect(account.set).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Descanso'}))
  expect(account.values[key]).toEqual(original)
  fireEvent.click(screen.getByRole('button',{name:'Guardar descanso'}))
  await waitFor(()=>expect(props.onSaved).toHaveBeenCalledWith(false))
  expect(account.values[key]).toMatchObject({type:'recovery'})
  expect(Object.keys(account.values)).toEqual([key])
})
it('rechaza sobrescribir un plan que cambió mientras la elección estaba abierta',async()=>{
  const date='2026-11-11',key='training:'+date
  const original:TrainingPlan={type:'cardio',title:'Bicicleta',cardio:{activity:'Bicicleta',minutes:25},exercises:[],notes:''}
  account.values[key]=original
  render(<DayChoice date={date} previousPlan={original} onBegin={vi.fn()} onSaved={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'Descanso'}))
  account.values[key]={...original,notes:'Nueva nota guardada'}
  fireEvent.click(screen.getByRole('button',{name:'Guardar descanso'}))
  await screen.findByRole('alert')
  expect(account.values[key]).toMatchObject({type:'cardio',notes:'Nueva nota guardada'})
})
it('permite consultar fuerza sin conexión y reconectar sin guardar la elección ni la asistencia',()=>{
  Object.defineProperty(navigator,'onLine',{value:false,configurable:true})
  mount('2026-11-09')
  fireEvent.click(screen.getByRole('button',{name:'Fuerza'}))
  fireEvent.click(screen.getByRole('button',{name:/Glúteos y femorales/}))
  fireEvent.click(screen.getByRole('button',{name:'Consultar esta guía sin guardar'}))
  expect(screen.getByRole('region',{name:'Guía temporal'})).toBeTruthy()
  expect(screen.getByRole('button',{name:/Ver foto y técnica de Hip thrust/})).toBeTruthy()
  Object.defineProperty(navigator,'onLine',{value:true,configurable:true})
  fireEvent(window,new Event('online'))
  expect(account.set).not.toHaveBeenCalled()
})
