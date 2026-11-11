// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AttendanceControl } from './TrainingCalendar'
import { useGuidePosition } from './lib/guide-position'
import { workoutDays } from './data/training'
import { TrainingScreen } from './screens'
import { planFromRoutine } from './lib/training-plan'

const account=vi.hoisted(()=>({
  session:{user:{id:'QA-A'}}, values:{} as Record<string,unknown>, complete:true, loading:false,
  saving:false, error:'', set:vi.fn(), flush:vi.fn(), remove:vi.fn()
}))
vi.mock('./lib/account',()=>({useAccount:()=>account}))
vi.mock('./lib/storage',async importOriginal=>({
  ...await importOriginal<typeof import('./lib/storage')>(),useStored:()=>[1,vi.fn()]
}))

beforeEach(()=>{
  localStorage.clear()
  account.values={}
  account.flush.mockReset().mockResolvedValue(undefined)
  account.set.mockReset().mockImplementation((key:string,value:unknown)=>{account.values[key]=value})
  Object.defineProperty(navigator,'onLine',{configurable:true,value:true})
})
afterEach(()=>{cleanup();Object.defineProperty(navigator,'onLine',{configurable:true,value:true})})

it('lets a reader jump to any exercise and return without registering or editing the day',()=>{
  const date='2026-10-19',routine=workoutDays[0]
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
    fireEvent.click(next)
    const toggle=screen.getByRole('button',{name:/Ver ejercicios\. Ejercicio 2 de/})
    fireEvent.click(toggle)
    const current=screen.getByRole('button',{current:'step'})
    fireEvent.keyDown(current,{key:'Escape'})
    expect(document.activeElement).toBe(toggle)
    expect(screen.queryByRole('list',{name:'Ejercicios de esta sesión'})).toBeNull()
    fireEvent.click(toggle)
    const last=routine.exercises[routine.exercises.length-1]
    fireEvent.click(screen.getByRole('button',{name:routine.exercises.length+' '+last.name}))
    expect(document.activeElement).toBe(screen.getByRole('heading',{name:last.name}))
    expect(screen.getByRole('button',{name:'Terminar y registrar'})).toBeTruthy()
    fireEvent.click(screen.getByRole('button',{name:'Ejercicio anterior'}))
    expect(document.activeElement).toBe(screen.getByRole('heading',{name:routine.exercises[routine.exercises.length-2].name}))
    expect(account.set).not.toHaveBeenCalled()
  } finally {scroll.mockRestore()}
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
