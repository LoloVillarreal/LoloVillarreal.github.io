// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HipGoalPanel, MonthlyReport } from './ProgressMilestones'
import { addDays, isoDate } from './lib/dates'
import { moveMonth } from './lib/progress-month'

const account=vi.hoisted(()=>({confirmedValues:{} as Record<string,unknown>,complete:true,saving:false,set:vi.fn(),flush:vi.fn(),remove:vi.fn()}))
vi.mock('./lib/account',()=>({useAccount:()=>account}))
beforeEach(()=>{vi.clearAllMocks();account.confirmedValues={};account.flush.mockResolvedValue(undefined);account.remove.mockResolvedValue(undefined)})
afterEach(()=>{cleanup();vi.restoreAllMocks()})

it('guarda una meta sin crear un registro; un fallo conserva los valores del formulario',async()=>{
  render(<HipGoalPanel marks={[]}/>)
  fireEvent.click(screen.getByRole('button',{name:'Elegir meta'}))
  fireEvent.change(screen.getByLabelText('Carga de la meta (kg)'),{target:{value:'52,5'}})
  fireEvent.change(screen.getByLabelText('Repeticiones de la meta'),{target:{value:'8'}})
  account.flush.mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error('Sin conexión'))
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Guardar meta'}))})
  expect(screen.getByRole('alert').textContent).toContain('Sin conexión')
  expect((screen.getByLabelText('Carga de la meta (kg)') as HTMLInputElement).value).toBe('52,5')
  const [key,write]=account.set.mock.calls[0]
  expect(key).toBe('hipGoal')
  expect(write(undefined)).toEqual({kg:52.5,reps:8})
  expect(()=>write({kg:80,reps:4})).toThrow('ha cambiado')
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Reintentar guardado'}))})
  expect(screen.queryByLabelText('Carga de la meta (kg)')).toBeNull()
  expect(account.set).toHaveBeenCalledTimes(1)
})

it('edita o quita solo la meta y permite cancelar el borrado',async()=>{
  account.confirmedValues={hipGoal:{kg:50,reps:8}}
  vi.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
  render(<HipGoalPanel marks={[]}/>)
  fireEvent.click(screen.getByRole('button',{name:'Editar meta'}))
  expect((screen.getByLabelText('Carga de la meta (kg)') as HTMLInputElement).value).toBe('50')
  fireEvent.click(screen.getByRole('button',{name:'Quitar meta'}))
  expect(account.remove).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Quitar meta'}))
  await waitFor(()=>expect(account.remove).toHaveBeenCalledWith('hipGoal'))
  expect(account.set).not.toHaveBeenCalled()
})

it('abre desde el mes anterior la fecha exacta de una marca, incluso sin asistencia',()=>{
  const previous=moveMonth(isoDate().slice(0,7),-1)
  const date=addDays(previous+'-01',10)
  const onDate=vi.fn()
  render(<MonthlyReport attendance={[]} marks={[{date,id:'qa',hipThrustKg:42.5,hipThrustReps:8,notes:''}]} complete onDate={onDate}/>)
  const card=within(screen.getByRole('region',{name:'Tu mes en tres datos'}))
  expect(card.getByText('Sin marca registrada este mes.')).toBeTruthy()
  fireEvent.click(card.getByRole('button',{name:'Ver el mes anterior'}))
  fireEvent.click(card.getByRole('button',{name:/Ver el día de la marca/}))
  expect(onDate).toHaveBeenCalledWith(date)
  expect(card.getByText(/sin asistencia registrada/)).toBeTruthy()
})
