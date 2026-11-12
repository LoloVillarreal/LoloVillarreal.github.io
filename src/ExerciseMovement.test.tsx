// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { workoutDays } from './data/training'
import { loadRoutineGif } from './lib/routine-gif-cache'
import { ExerciseMovement } from './ExerciseMovement'

vi.mock('./lib/routine-gif-cache',()=>({loadRoutineGif:vi.fn()}))
const exercise=workoutDays[0].exercises[0]
const preference=Object.assign(new EventTarget(),{matches:false})
const release=vi.fn()

beforeEach(()=>{
  preference.matches=false
  vi.stubGlobal('matchMedia',()=>preference)
  vi.stubGlobal('URL',class extends URL {
    static createObjectURL(){return 'blob:demo-local'}
    static revokeObjectURL=release
  })
})
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();vi.clearAllMocks()})

it('muestra una sola imagen y la detiene cuando se activa reducir movimiento',async()=>{
  vi.mocked(loadRoutineGif).mockResolvedValue(new Blob(['gif']))
  render(<ExerciseMovement exercise={exercise} showPoster/>)
  expect(loadRoutineGif).not.toHaveBeenCalled()
  expect(screen.getByRole('img',{name:'Demostración de '+exercise.name})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Ver GIF'}))
  await screen.findByRole('img',{name:'Movimiento de '+exercise.name})
  expect(screen.getAllByRole('img')).toHaveLength(1)
  act(()=>{preference.matches=true;preference.dispatchEvent(new Event('change'))})
  expect(screen.getByRole('button',{name:'Ver GIF'})).toBeTruthy()
  expect(release).toHaveBeenCalledWith('blob:demo-local')
})

it('cancela la descarga al pasar al siguiente ejercicio sin mostrar el GIF anterior',async()=>{
  let finish!:(value:Blob)=>void
  vi.mocked(loadRoutineGif).mockReturnValue(new Promise(resolve=>{finish=resolve}))
  const view=render(<ExerciseMovement exercise={exercise}/>)
  fireEvent.click(screen.getByRole('button',{name:'Ver GIF'}))
  const signal=vi.mocked(loadRoutineGif).mock.calls[0][1]!
  view.rerender(<ExerciseMovement exercise={workoutDays[0].exercises[1]}/>)
  expect(signal.aborted).toBe(true)
  await act(async()=>{finish(new Blob(['gif']))})
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByRole('button',{name:'Ver GIF'})).toBeTruthy()
})

it('reproduce al entrar desde Ver GIF de la rutina aun con reducir movimiento y permite detenerlo',async()=>{
  preference.matches=true
  vi.mocked(loadRoutineGif).mockResolvedValue(new Blob(['gif']))
  render(<ExerciseMovement exercise={exercise} showPoster startGif/>)
  await screen.findByRole('img',{name:'Movimiento de '+exercise.name})
  fireEvent.click(screen.getByRole('button',{name:'Detener GIF'}))
  expect(screen.getByRole('img',{name:'Demostración de '+exercise.name})).toBeTruthy()
})

it('explica una descarga ausente sin conexión y permite reintentar',async()=>{
  vi.spyOn(navigator,'onLine','get').mockReturnValue(false)
  vi.mocked(loadRoutineGif).mockRejectedValueOnce(new Error()).mockResolvedValueOnce(new Blob(['gif']))
  render(<ExerciseMovement exercise={exercise}/>)
  fireEvent.click(screen.getByRole('button',{name:'Ver GIF'}))
  expect(await screen.findByText(/Este GIF no está disponible sin conexión/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Reintentar GIF'}))
  await screen.findByRole('img',{name:'Movimiento de '+exercise.name})
  fireEvent.click(screen.getByRole('button',{name:'Detener GIF'}))
  expect(screen.queryByRole('img')).toBeNull()
})
