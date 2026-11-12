// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DayChoice } from './DayChoice'
import { TrainingScreen } from './screens'
import { trainingEntryValid, type TrainingPlan } from './lib/training-plan'

const account=vi.hoisted(()=>({
  values:{} as Record<string,unknown>, session:{user:{id:'synthetic'}}, complete:true,
  confirmedValues:{} as Record<string,unknown>,
  loading:false, saving:false, error:'', set:vi.fn(), flush:vi.fn(), refresh:vi.fn(), remove:vi.fn(),
}))
vi.mock('./lib/account',()=>({
  useAccount:()=>account, AccountGate:({children}:{children:React.ReactNode})=>children,
  AccountPanel:()=>null, useCloudValue:vi.fn(), accountBackup:vi.fn(),
}))
beforeEach(()=>{
  account.values={}
  account.confirmedValues={}
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')}
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}
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
  expect(screen.queryByRole('combobox')).toBeNull()
  expect(screen.queryByRole('button',{name:'20 min'})).toBeNull()
  expect(screen.queryByRole('button',{name:'Guardar mi elección'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Bicicleta',pressed:false}))
  expect(screen.getByRole('button',{name:'20 min',pressed:false})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'20 min'}))
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
  expect(screen.queryByRole('button',{name:'Guardar mi elección'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:/Tren superior y abdomen/}))
  expect(account.set).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Guardar mi elección'}))
  await waitFor(()=>expect(account.values['training:2026-11-13']).toMatchObject({title:'Tren superior y abdomen'}))
})

it('muestra ambas versiones y guarda la corta solo en la fecha elegida',async()=>{
  const date='2026-11-12', other='training:2026-11-09'
  const untouched={title:'Mi sesión personalizada'}
  account.values[other]=untouched
  mount(date)
  fireEvent.click(screen.getByRole('button',{name:'Fuerza'}))
  fireEvent.click(screen.getByRole('button',{name:/Glúteos y femorales/}))
  expect(screen.getByText('Sentadilla búlgara con mancuernas')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Tengo 20 min'}))
  expect(screen.queryByText('Sentadilla búlgara con mancuernas')).toBeNull()
  expect(screen.getByText('Hip thrust con barra')).toBeTruthy()
  expect(account.set).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Guardar mi elección'}))
  await waitFor(()=>expect(account.values['training:'+date]).toMatchObject({
    title:'Glúteos y femorales · 20 min', exercises:[{exerciseId:'hip-thrust',sets:2,rest:150},{exerciseId:'lying-curl',sets:2,rest:90}],
  }))
  expect(account.values[other]).toBe(untouched)
  expect(Object.keys(account.values)).toHaveLength(2)
})
it('permite revisar las fotos antes de decidir y solo abre la sesión de hoy después de confirmar el guardado',async()=>{
  vi.setSystemTime(new Date('2026-11-12T12:00:00'))
  const saved=vi.fn()
  try {
    mount('2026-11-12',saved)
    fireEvent.click(screen.getByRole('button',{name:'Fuerza'}))
    fireEvent.click(screen.getByRole('button',{name:/Glúteos y femorales/}))
    fireEvent.click(screen.getByRole('button',{name:"Ver fotos y técnica"}))
    expect(screen.getByRole('button',{name:/Ver foto y técnica de Hip thrust/})).toBeTruthy()
    expect(account.set).not.toHaveBeenCalled()
    account.flush.mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error('Sin conexión'))
    fireEvent.click(screen.getByRole('button',{name:'Guardar y empezar'}))
    await screen.findByRole('alert')
    expect(saved).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'Reintentar guardado'}))
    await waitFor(()=>expect(saved).toHaveBeenCalledWith(true))
    expect(Object.keys(account.values)).toEqual(['training:2026-11-12'])
    expect(account.set).toHaveBeenCalledOnce()
  } finally {vi.useRealTimers()}
})
it('ignora la posición antigua sin planificación pero conserva el día entrenado anterior',()=>{
  const date='2026-10-19'
  account.confirmedValues['attendance:'+date]=account.values['attendance:'+date]={date,title:'Sesión ya hecha',type:'strength',completedAt:'2026-10-19T10:30:00Z'}
  render(<TrainingScreen date={date} setDate={vi.fn()} notify={vi.fn()} reader={{date,index:2}} bookmark={{date,index:2}} setReader={vi.fn()} finish={vi.fn()} onDirtyChange={vi.fn()}/>)
  expect(screen.queryByRole('heading',{name:'¿Qué quieres hacer este día?'})).toBeNull()
  expect(screen.getByRole('button',{name:'Añadir un plan a este día'})).toBeTruthy()
  expect(screen.getByRole('button',{name:'Quitar día entrenado'})).toBeTruthy()
  expect(screen.queryByRole('button',{name:/Terminar y registrar|Empezar entrenamiento|Registrar entrenamiento realizado/})).toBeNull()
  expect(account.set).not.toHaveBeenCalled()
})

it('mantiene la vista previa al comparar rutinas y devuelve el foco al cerrarla desde un ejercicio',()=>{
  mount('2026-11-12')
  fireEvent.click(screen.getByRole('button',{name:'Fuerza'}))
  const glutes=screen.getByRole('button',{name:/Glúteos y femorales/})
  fireEvent.click(glutes)
  const preview=screen.getByRole('button',{name:"Ver fotos y técnica"})
  fireEvent.click(preview)
  fireEvent.click(glutes)
  expect(screen.getByRole('region',{name:'Guía temporal'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:/Tren superior y abdomen/}))
  const photo=screen.getByRole('button',{name:/Ver foto y técnica de Jalón al pecho/})
  photo.focus()
  fireEvent.keyDown(photo,{key:'Escape'})
  expect(screen.queryByRole('region',{name:'Guía temporal'})).toBeNull()
  expect(document.activeElement).toBe(preview)
  expect(account.set).not.toHaveBeenCalled()
})

it('al cancelar la creación conserva la rutina, la vista previa y el foco de regreso',async()=>{
  mount('2026-11-12')
  fireEvent.click(screen.getByRole('button',{name:'Fuerza'}))
  fireEvent.click(screen.getByRole('button',{name:/Glúteos y femorales/}))
  fireEvent.click(screen.getByRole('button',{name:"Ver fotos y técnica"}))
  fireEvent.click(screen.getByRole('button',{name:'Elegir mis ejercicios'}))
  fireEvent.click(screen.getByRole('button',{name:'Cerrar biblioteca'}))
  const reload=new Event('beforeunload',{cancelable:true})
  window.dispatchEvent(reload)
  expect(reload.defaultPrevented).toBe(true)
  const close=screen.getByRole('button',{name:'Cerrar'})
  close.focus()
  fireEvent.click(close)
  const create=screen.getByRole('button',{name:'Elegir mis ejercicios'})
  await waitFor(()=>expect(document.activeElement).toBe(create))
  expect(screen.getByRole('button',{name:/Glúteos y femorales/,pressed:true})).toBeTruthy()
  expect(screen.getByRole('region',{name:'Guía temporal'})).toBeTruthy()
  expect(account.set).not.toHaveBeenCalled()
})

it('crea fuerza con los ejercicios elegidos y empieza solo al confirmar',async()=>{
  vi.setSystemTime(new Date('2026-11-12T12:00:00'))
  const saved=vi.fn()
  try {
    mount('2026-11-12',saved)
    fireEvent.click(screen.getByRole('button',{name:'Fuerza'}))
    fireEvent.click(screen.getByRole('button',{name:'Elegir mis ejercicios'}))
    expect(screen.getByRole('dialog',{name:'Elegir ejercicios'})).toBeTruthy()
    expect(screen.getByText('0 ejercicios en tu rutina')).toBeTruthy()
    fireEvent.change(screen.getByRole('searchbox',{name:'Buscar ejercicio'}),{target:{value:'Hip thrust'}})
    const add=screen.getAllByRole('button',{name:/^Añadir Hip thrust/i})[0]
    fireEvent.click(add)
    expect(screen.getByText('1 ejercicio en tu rutina')).toBeTruthy()
    fireEvent.click(add)
    expect(screen.getByText('0 ejercicios en tu rutina')).toBeTruthy()
    fireEvent.click(add)
    fireEvent.click(screen.getByRole('button',{name:'Ver mi rutina'}))
    expect(account.set).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'Guardar y empezar'}))
    await waitFor(()=>expect(saved).toHaveBeenCalledWith(true))
    const plan=account.values['training:2026-11-12'] as TrainingPlan
    expect(plan.type).toBe('strength')
    expect(plan.exercises).toHaveLength(1)
    expect(account.set).toHaveBeenCalledOnce()
  } finally {vi.useRealTimers()}
})

it('protege una elección sin guardar al recargar y deja salir después de volver o desmontar',()=>{
  const dirty=vi.fn()
  const view=render(<DayChoice date="2026-11-12" onBegin={vi.fn()} onSaved={vi.fn()} onDirtyChange={dirty}/>)
  const canLeave=()=>window.dispatchEvent(new Event('beforeunload',{cancelable:true}))
  fireEvent.click(screen.getByRole('button',{name:'Fuerza'}))
  expect(canLeave()).toBe(true)
  expect(dirty).toHaveBeenLastCalledWith(false)
  fireEvent.click(screen.getByRole('button',{name:/Glúteos y femorales/}))
  expect(canLeave()).toBe(false)
  expect(dirty).toHaveBeenLastCalledWith(true)
  fireEvent.click(screen.getByRole('button',{name:'Cambiar tipo de actividad'}))
  expect(canLeave()).toBe(true)
  fireEvent.click(screen.getByRole('button',{name:'Cardio'}))
  fireEvent.click(screen.getByRole('button',{name:'Caminata'}))
  expect(canLeave()).toBe(false)
  view.unmount()
  expect(canLeave()).toBe(true)
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

it('busca por nombre español sin tildes y conserva el identificador de la actividad con duración personalizada',async()=>{
  mount('2026-11-09')
  fireEvent.click(screen.getByRole('button',{name:'Cardio'}))
  fireEvent.click(screen.getByRole('button',{name:'Más actividades'}))
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'natacion'}})
  fireEvent.click(screen.getByRole('button',{name:'Natación'}))
  fireEvent.click(screen.getByRole('button',{name:'Escribir otra duración'}))
  fireEvent.change(screen.getByLabelText('Duración en minutos'),{target:{value:'181'}})
  expect(screen.queryByRole('button',{name:'Guardar mi elección'})).toBeNull()
  fireEvent.change(screen.getByLabelText('Duración en minutos'),{target:{value:'27'}})
  expect(account.set).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Guardar mi elección'}))
  await waitFor(()=>expect(account.values['training:2026-11-09']).toMatchObject({title:'Natación',cardio:{activity:'Swimming',minutes:27}}))
})
