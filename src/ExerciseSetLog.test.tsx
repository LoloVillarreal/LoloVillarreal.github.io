// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ExerciseSetLog } from './ExerciseSetLog'
import { WorkoutSummary } from './WorkoutSummary'
import { workoutDays } from './data/training'
import { replaceSet, type SetLog } from './lib/workout-sets'
import type { Attendance } from './lib/attendance'
import type { Exercise } from './types'

const exercise = workoutDays.flatMap(day => day.exercises)[0]
const day: Attendance = { date:'2026-11-12', title:'Fuerza', type:'strength', completedAt:'2026-11-12T20:00:00Z' }
afterEach(cleanup)

it('admite una coma decimal, cero kg, anotaciones parciales y series extra sin copiar los objetivos', () => {
  function Form() {
    const [log, setLog] = useState<SetLog>()
    return <ExerciseSetLog exercise={{...exercise, sets:1}} sets={log?.[exercise.id] ?? []}
      onChange={entry => setLog(value => {
        const next = replaceSet(value, exercise.id, entry)
        return next === false ? value : next
      })}/>
  }
  render(<Form/>)
  const field = (label: string) => screen.getByRole('textbox', {name:label}) as HTMLInputElement
  const kg = field('Peso en kg, serie 1')
  const reps = field('Repeticiones, serie 1')
  expect([kg.value, reps.value]).toEqual(['',''])
  fireEvent.change(kg, {target:{value:'12,'}})
  expect(kg.value).toBe('12,')
  fireEvent.change(kg, {target:{value:'12,5'}})
  fireEvent.blur(kg)
  expect(kg.value).toBe('12,5')
  fireEvent.change(reps, {target:{value:'8'}})
  fireEvent.change(kg, {target:{value:''}})
  expect([kg.value,reps.value]).toEqual(['','8'])
  fireEvent.click(screen.getByRole('button',{name:'Añadir serie'}))
  const extra = field('Peso en kg, serie 2')
  fireEvent.change(extra, {target:{value:'0'}})
  fireEvent.blur(extra)
  expect(extra.value).toBe('0')
  expect(field('Repeticiones, serie 2').value).toBe('')
})

it.each(['seconds','meters'] as const)('respeta la unidad %s y conserva el último dato válido al introducir un valor inválido', unit => {
  const onChange = vi.fn()
  const movement: Exercise = {...exercise, sets:1, unit, perSide:true}
  render(<ExerciseSetLog exercise={movement} sets={[{number:1, amount:9}]} onChange={onChange}/>)
  const field = screen.getByRole('textbox',{name:unit==='seconds'?'Segundos, serie 1':'Metros, serie 1'})
  expect(screen.getByText('por lado')).toBeTruthy()
  fireEvent.change(field,{target:{value:'4,5'}})
  fireEvent.blur(field)
  expect(field.getAttribute('aria-invalid')).toBe('true')
  expect(screen.getByText(/Este valor no se ha guardado/)).toBeTruthy()
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.change(field,{target:{value:'12'}})
  expect(onChange).toHaveBeenLastCalledWith({number:1,amount:12})
})

it('muestra lo anotado bajo cada nombre y conserva los huecos y la marca de sustitución', () => {
  render(<WorkoutSummary entry={{...day, exerciseNames:['Plancha lateral','Sentadilla','Paseo','Remo'],
    performedSets:[
      {exerciseIndex:0, unit:'seconds', perSide:true, sets:[{number:2, amount:40}]},
      {exerciseIndex:1, unit:'reps', sets:[{number:1, kg:12.5, amount:8},{number:3,kg:0}],replaced:true},
      {exerciseIndex:2, unit:'meters', sets:[{number:1, amount:20}]},
    ]}}/>)
  const squat = within(screen.getByLabelText('Series anotadas de Sentadilla'))
  expect(squat.getByText('12,5 kg · 8 reps')).toBeTruthy()
  expect(squat.getByText('0 kg')).toBeTruthy()
  expect(squat.queryByText('Serie 2')).toBeNull()
  expect(screen.getByText('Sustituido durante la sesión').closest('li')?.textContent).toContain('Sentadilla')
  expect(screen.getByText('Sin series anotadas').closest('li')?.textContent).toContain('Remo')
  expect(screen.getByText('40 s por lado')).toBeTruthy()
  expect(screen.getByText('20 m')).toBeTruthy()
})

it('avisa si la sesión ya no acepta cambios y mantiene a la vista lo que se intentó escribir', () => {
  render(<ExerciseSetLog exercise={{...exercise,sets:1}} sets={[]} onChange={()=>false}/>)
  const field = screen.getByRole('textbox',{name:'Peso en kg, serie 1'}) as HTMLInputElement
  fireEvent.change(field,{target:{value:'25'}})
  fireEvent.blur(field)
  expect(field.value).toBe('25')
  expect(screen.getByText(/No se pudo guardar este cambio/)).toBeTruthy()
})
