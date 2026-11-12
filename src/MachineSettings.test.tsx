// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MachineSettings } from './MachineSettings'
import { workoutDays } from './data/training'

const account=vi.hoisted(()=>({
  session:{user:{id:'synthetic-A'}},complete:true,values:{} as Record<string,unknown>,confirmedValues:{} as Record<string,unknown>,
  set:vi.fn(),flush:vi.fn(),remove:vi.fn(),
}))
vi.mock('./lib/account',()=>({useAccount:()=>account}))
afterEach(()=>{cleanup();vi.restoreAllMocks()})

it('recuerda el ajuste del mismo ejercicio en dos rutinas sin copiarlo a otra máquina',async()=>{
  account.set.mockImplementation((key:string,fn:(v:unknown)=>unknown)=>{account.values[key]=fn(account.values[key])})
  account.flush.mockImplementation(async()=>{account.confirmedValues={...account.values}})
  const monday=workoutDays.find(day=>day.day===1)!.exercises.find(e=>e.id==='hip-thrust')!
  const thursday=workoutDays.find(day=>day.day===4)!.exercises.find(e=>e.id==='hip-thrust-thu')!
  const view=render(<MachineSettings exerciseId={monday.hevyId}/>)
  fireEvent.click(screen.getByRole('button',{name:/Mis ajustes/}))
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'  Banco 2  '}})
  expect(account.set).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Guardar ajustes'}))
  await waitFor(()=>expect(screen.getByText('Banco 2')).toBeTruthy())
  view.rerender(<MachineSettings exerciseId="C7973E0E"/>)
  expect(screen.queryByText('Banco 2')).toBeNull()
  view.rerender(<MachineSettings exerciseId={thursday.hevyId}/>)
  expect(screen.getByText('Banco 2')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:/Editar/}))
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Descartar esto'}})
  fireEvent.click(screen.getByRole('button',{name:'Cancelar'}))
  expect(screen.getByText('Banco 2')).toBeTruthy()
  expect(Object.keys(account.confirmedValues)).toEqual(['machineNote:D57C2EC7'])
})
