// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { useState } from 'react'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AttendanceControl } from './TrainingCalendar'
import { useGuidePosition } from './lib/guide-position'
import { workoutDays } from './data/training'
import { TrainingScreen } from './screens'
import { planFromRoutine } from './lib/training-plan'
import { pendingWorkout } from './WorkoutReturn'

const account=vi.hoisted(()=>({
  session:{user:{id:'QA-A'}}, values:{} as Record<string,unknown>, confirmedValues:{} as Record<string,unknown>, complete:true, loading:false,
  saving:false, error:'', set:vi.fn(), flush:vi.fn(), remove:vi.fn()
}))
vi.mock('./lib/account',()=>({useAccount:()=>account}))
vi.mock('./lib/storage',async importOriginal=>({
  ...await importOriginal<typeof import('./lib/storage')>(),useStored:()=>[1,vi.fn()]
}))

beforeEach(()=>{
  localStorage.clear()
  account.values={}
  account.confirmedValues={}
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')}
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}
  HTMLElement.prototype.scrollIntoView=vi.fn()
  account.flush.mockReset().mockResolvedValue(undefined)
  account.set.mockReset().mockImplementation((key:string,value:unknown)=>{account.values[key]=value})
  Object.defineProperty(navigator,'onLine',{configurable:true,value:true})
})
afterEach(()=>{cleanup();vi.useRealTimers();Object.defineProperty(navigator,'onLine',{configurable:true,value:true})})

it('recupera el punto disponible si se acortó la rutina y retira el acceso si ya se registró o eliminó',()=>{
  const date='2026-11-12', position={date,index:2}
  const plan=planFromRoutine(workoutDays[0])
  plan.exercises=plan.exercises.slice(0,1)
  const values:Record<string,unknown>={['training:'+date]:plan}
  expect(pendingWorkout(position,values,date)).toMatchObject({date,index:0,detail:'Ejercicio 1 de 1'})
  expect(pendingWorkout(position,{},date)).toBeNull()
  expect(pendingWorkout(null,values,date)).toBeNull()
  values['attendance:'+date]={date,type:'strength',title:plan.title,completedAt:date+'T10:00:00Z'}
  expect(pendingWorkout(position,values,date)).toBeNull()
})

it.each(['futura','registrada','pasada'])('consultar una rutina %s no desplaza la sesión en curso ni modifica su asistencia',kind=>{
  const date=kind==='futura'?'2099-01-01':'2026-10-19', plan=planFromRoutine(workoutDays[0])
  plan.notes='Nota ficticia para consultar'
  account.values['training:'+date]=plan
  if(kind==='registrada')account.values['attendance:'+date]={date,title:plan.title,type:'strength',completedAt:date+'T18:00:00Z'}
  const setReader=vi.fn()
  render(<TrainingScreen date={date} setDate={vi.fn()} notify={vi.fn()} reader={null} bookmark={{date:'2026-10-12',index:2}} setReader={setReader} finish={vi.fn()} onDirtyChange={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:/Consultar guía|Ver la guía de/}))
  const note=screen.getByText('Notas de la sesión')
  fireEvent.click(note)
  expect(note.closest('details')?.open).toBe(true)
  expect(screen.getByText(plan.notes)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:/Siguiente ejercicio/}))
  expect(screen.getByRole('button',{name:/Ejercicio 2 de/})).toBeTruthy()
  expect(screen.queryByText('Medir el descanso')).toBeNull()
  expect(screen.queryByRole('button',{name:/Terminar y registrar|Quitar día entrenado/})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Volver a la rutina'}))
  expect(setReader).not.toHaveBeenCalled()
  expect(account.set).not.toHaveBeenCalled()
  expect(account.remove).not.toHaveBeenCalled()
})

it('lets a reader jump to any exercise and return without registering or editing the day',()=>{
  const date='2026-10-19',routine=workoutDays[0]
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(date+'T12:00:00'))
  account.values['training:'+date]=planFromRoutine(routine)
  const scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{})
  function Guide(){
    const position=useGuidePosition('QA-A')
    return <TrainingScreen date={date} setDate={vi.fn()} notify={vi.fn()} {...position} onDirtyChange={vi.fn()}/>
  }
  try {
    render(<Guide/>)
    fireEvent.click(screen.getByRole('button',{name:'Empezar entrenamiento'}))
    const next=screen.getByRole('button',{name:'Siguiente ejercicio '+routine.exercises[1].name})
    const firstTap=new MouseEvent('click',{bubbles:true,detail:1})
    fireEvent(next,firstTap)
    fireEvent.click(next,{detail:1})
    const delayedDoubleClick=new MouseEvent('click',{bubbles:true,detail:2})
    Object.defineProperty(delayedDoubleClick,'timeStamp',{value:firstTap.timeStamp+500})
    fireEvent(next,delayedDoubleClick)
    const toggle=screen.getByRole('button',{name:/Ver ejercicios\. Ejercicio 2 de/})
    toggle.focus()
    fireEvent.click(toggle)
    fireEvent.keyDown(toggle,{key:'Escape'})
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle)
    fireEvent.click(toggle)
    const current=screen.getByRole('button',{current:'step'})
    fireEvent.keyDown(current,{key:'Escape'})
    expect(document.activeElement).toBe(toggle)
    expect(screen.queryByRole('list',{name:'Ejercicios de esta sesión'})).toBeNull()
    fireEvent.click(toggle)
    const last=routine.exercises[routine.exercises.length-1]
    fireEvent.click(screen.getByRole('button',{name:routine.exercises.length+' '+last.name}))
    expect(document.activeElement).toBe(screen.getByRole('heading',{name:last.name}))
    expect(screen.getByRole('button',{name:'Finalizar entrenamiento'})).toBeTruthy()
    fireEvent.click(screen.getByRole('button',{name:'Ejercicio anterior'}))
    expect(document.activeElement).toBe(screen.getByRole('heading',{name:routine.exercises[routine.exercises.length-2].name}))
    expect(account.set).not.toHaveBeenCalled()
  } finally {scroll.mockRestore()}
})

it('moves focus into the cardio guide when starting it',()=>{
  const date='2026-10-21'
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(date+'T12:00:00'))
  const cardio=workoutDays.find(day=>day.type==='cardio')!
  account.values['training:'+date]=planFromRoutine(cardio)
  const scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{})
  function Guide(){
    const position=useGuidePosition('QA-A')
    return <TrainingScreen date={date} setDate={vi.fn()} notify={vi.fn()} {...position} onDirtyChange={vi.fn()}/>
  }
  try {
    render(<Guide/>)
    fireEvent.click(screen.getByRole('button',{name:'Empezar cardio'}))
    expect(document.activeElement).toBe(screen.getByRole('region',{name:cardio.title}))
  } finally {scroll.mockRestore()}
})

it('consultar una ficha de hoy antes de empezar deja el cronómetro apagado',()=>{
  const date='2026-10-19',routine=workoutDays[0]
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(date+'T12:00:00'))
  account.values['training:'+date]=planFromRoutine(routine)
  const setReader=vi.fn()
  render(<TrainingScreen date={date} setDate={vi.fn()} notify={vi.fn()} reader={null} bookmark={null} setReader={setReader} finish={vi.fn()} onDirtyChange={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:new RegExp('^'+routine.exercises[1].name+' .*series')}))
  expect(screen.getByRole('heading',{name:routine.exercises[1].name})).toBeTruthy()
  expect(screen.queryByRole('timer')).toBeNull()
  expect(screen.queryByRole('button',{name:'Cancelar entrenamiento'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Volver a la rutina'}))
  expect(setReader).not.toHaveBeenCalled()
})

it('cancelar permite seguir y descartar sólo el marcador y el reloj del entrenamiento',()=>{
  const date='2026-10-19',plan=planFromRoutine(workoutDays[0])
  const saved={['training:'+date]:plan,'progress:anterior':{weight:12}}
  account.values={...saved}
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(date+'T12:00:00'))
  function Guide(){const position=useGuidePosition('QA-A')
    return <TrainingScreen date={date} setDate={vi.fn()} notify={vi.fn()} {...position} onDirtyChange={vi.fn()}/>}
  render(<Guide/>)
  fireEvent.click(screen.getByRole('button',{name:'Empezar entrenamiento'}))
  fireEvent.click(screen.getByRole('button',{name:'Siguiente ejercicio '+workoutDays[0].exercises[1].name}))
  fireEvent.click(screen.getByRole('button',{name:'Cancelar entrenamiento'}))
  const stay=screen.getByRole('button',{name:'Seguir entrenando'})
  expect(document.activeElement).toBe(stay)
  fireEvent.click(stay)
  expect(screen.getByRole('heading',{name:workoutDays[0].exercises[1].name})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Cancelar entrenamiento'}))
  fireEvent.click(screen.getByRole('button',{name:'Descartar sesión'}))
  expect(localStorage.getItem('la-guide:QA-A')).toBeNull()
  expect(account.set).not.toHaveBeenCalled();expect(account.remove).not.toHaveBeenCalled()
  expect(account.values).toEqual(saved)
})

it('sólo cierra tras confirmar la asistencia y guarda una vez la duración activa de una sesión pausada',async()=>{
  const date='2026-10-19', key='attendance:'+date,started=new Date(date+'T12:00:00').getTime()
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(started)
  account.values['training:'+date]=planFromRoutine(workoutDays[0])
  let confirmSave!:()=>void
  account.flush.mockResolvedValueOnce(undefined).mockImplementationOnce(()=>new Promise<void>(resolve=>{confirmSave=resolve}))
  function Guide(){const position=useGuidePosition('QA-A')
    return <TrainingScreen date={date} setDate={vi.fn()} notify={vi.fn()} {...position} onDirtyChange={vi.fn()}/>}
  const view=render(<Guide/>)
  fireEvent.click(screen.getByRole('button',{name:'Empezar entrenamiento'}))
  vi.setSystemTime(started+73100)
  fireEvent.click(screen.getByRole('button',{name:'Pausar'}))
  vi.setSystemTime(started+95000)
  fireEvent.click(screen.getByRole('button',{name:'Finalizar'}))
  const button=within(screen.getByRole('dialog',{name:'¿Finalizar entrenamiento?'})).getByRole('button',{name:'Guardar entrenamiento'})
  await act(async()=>{fireEvent.click(button);fireEvent.click(button)})
  expect(account.set).toHaveBeenCalledTimes(1)
  const names=workoutDays[0].exercises.map(exercise=>exercise.name)
  expect(account.values[key]).toMatchObject({date,durationSeconds:73,exerciseNames:names})
  expect(screen.queryByRole('region',{name:'Resumen del entrenamiento'})).toBeNull()
  expect(localStorage.getItem('la-guide:QA-A')).toBeTruthy()
  await act(async()=>{account.confirmedValues[key]=account.values[key];confirmSave()})
  view.rerender(<Guide/>)
  expect(localStorage.getItem('la-guide:QA-A')).toBeNull()
  const summary=within(screen.getByRole('region',{name:'Resumen del entrenamiento'}))
  expect(summary.getByText('01:13')).toBeTruthy()
  for(const name of names) expect(summary.getByText(name)).toBeTruthy()
})

it('remembers the guide after reopening, isolates accounts and keeps the place when the summary opens',()=>{
  const hook=renderHook(({owner}:{owner:string})=>useGuidePosition(owner),{initialProps:{owner:'QA-A'}})
  act(()=>hook.result.current.setReader({date:'2026-10-19',index:2}))
  hook.unmount()
  const reopened=renderHook(({owner}:{owner:string})=>useGuidePosition(owner),{initialProps:{owner:'QA-A'}})
  expect(reopened.result.current.reader?.index).toBe(2)
  act(()=>reopened.result.current.setReader(null))
  expect(reopened.result.current.reader).toBe(null)
  expect(reopened.result.current.bookmark?.index).toBe(2)
  reopened.rerender({owner:'QA-B'})
  expect(reopened.result.current.bookmark).toBe(null)
  reopened.rerender({owner:'QA-A'})
  act(()=>reopened.result.current.finish('2026-10-19'))
  expect(reopened.result.current.bookmark).toBe(null)
})

it('abre el mismo resumen desde semana y mes aunque cambie o se borre el plan',async()=>{
  const date='2026-10-19',key='attendance:'+date
  const receipt={date,title:'Rutina del lunes',type:'strength',completedAt:date+'T11:00:00Z',exerciseNames:['Remo','Sentadilla']}
  account.confirmedValues[key]=account.values[key]=receipt
  account.values['training:'+date]=planFromRoutine(workoutDays[0])
  function Calendar(){const [selected,setSelected]=useState('2026-10-20')
    return <TrainingScreen date={selected} setDate={setSelected} notify={vi.fn()} reader={null} bookmark={null} setReader={vi.fn()} finish={vi.fn()} onDirtyChange={vi.fn()}/>}
  render(<Calendar/>)
  for(const mode of ['semana','mes']){
    if(mode==='mes'){
      delete account.values['training:'+date]
      fireEvent.click(screen.getByRole('button',{name:'Ver mes completo'}))
    }
    fireEvent.click(screen.getByRole('button',{name:/lunes, 19 de octubre de 2026.*ver resumen/}))
    const summary=screen.getByRole('region',{name:'Resumen del entrenamiento'})
    await waitFor(()=>expect(document.activeElement).toBe(summary))
    expect(within(summary).getAllByRole('listitem').map(item=>item.textContent)).toEqual(receipt.exerciseNames)
    expect(within(summary).getByText('Sin registrar')).toBeTruthy()
    fireEvent.click(screen.getByRole('button',{name:/martes, 20 de octubre de 2026/}))
    expect(screen.queryByRole('region',{name:'Resumen del entrenamiento'})).toBeNull()
  }
  expect(account.set).not.toHaveBeenCalled()
})

it('one registration waits for server confirmation, even with a double tap',async()=>{
  let confirmSave!:()=>void
  account.flush.mockResolvedValueOnce(undefined).mockImplementationOnce(()=>new Promise<void>(r=>{confirmSave=r}))
  const confirmed=vi.fn()
  render(<AttendanceControl date="2026-10-19" day={workoutDays[0]} notify={vi.fn()} finishGuide onRegistered={confirmed}/>)
  const button=screen.getByRole('button',{name:'Terminar y registrar'})
  fireEvent.click(button);fireEvent.click(button)
  await waitFor(()=>expect(account.set).toHaveBeenCalledTimes(1))
  expect(confirmed).not.toHaveBeenCalled()
  await act(async()=>confirmSave())
  expect(confirmed).toHaveBeenCalledTimes(1)
})

it('allows an explicit retry after offline completion; merely reconnecting never marks the day',async()=>{
  Object.defineProperty(navigator,'onLine',{configurable:true,value:false})
  const confirmed=vi.fn()
  render(<AttendanceControl date="2026-10-19" day={workoutDays[0]} notify={vi.fn()} finishGuide onRegistered={confirmed}/>)
  fireEvent.click(screen.getByRole('button',{name:'Terminar y registrar'}))
  expect(screen.getByRole('alert').textContent).toMatch('Registro pendiente')
  Object.defineProperty(navigator,'onLine',{configurable:true,value:true})
  act(()=>window.dispatchEvent(new Event('online')))
  expect(account.set).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Reintentar registro'}))
  await waitFor(()=>expect(confirmed).toHaveBeenCalledTimes(1))
})

it('a future date and Wednesday strength never show the registration action',()=>{
  const props={day:workoutDays[0],notify:vi.fn(),finishGuide:true}
  const {rerender}=render(<AttendanceControl {...props} date="2099-01-01"/>)
  expect(screen.queryByRole('button',{name:'Terminar y registrar'})).toBe(null)
  rerender(<AttendanceControl {...props} date="2026-10-21"/>)
  expect(screen.queryByRole('button',{name:'Terminar y registrar'})).toBe(null)
})
