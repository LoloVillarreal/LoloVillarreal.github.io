// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ExerciseSetLog } from './ExerciseSetLog'
import { WorkoutSummary } from './WorkoutSummary'
import { workoutDays } from './data/training'
import { replaceSet, type SetEntry, type SetLog } from './lib/workout-sets'
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

it('muestra la referencia sin rellenar hoy y copia de un toque solo los campos disponibles de esa serie', () => {
  const previous = {date:'2026-11-09', sets:[{number:1,kg:0,amount:8}, {number:3,kg:22.5}]}
  const write = vi.fn()
  function Form() {
    const [sets, setSets] = useState<SetEntry[]>([{number:3,amount:12}])
    return <ExerciseSetLog exercise={{...exercise,sets:3}} sets={sets} previous={previous} onChange={entry=>{
      write(entry)
      setSets(rows=>[...rows.filter(row=>row.number!==entry.number),entry])
    }}/>
  }
  render(<Form/>)
  const region=screen.getByRole('region',{name:'Mis series'})
  expect(region.querySelector('time')?.dateTime).toBe(previous.date)
  const value=(name:string)=>(screen.getByRole('textbox',{name}) as HTMLInputElement).value
  const copy=screen.getByRole('button',{name:'Copiar serie 1, 0 kg, 8 reps'})
  expect(value('Peso en kg, serie 1')).toBe('')
  expect(screen.queryByRole('button',{name:/Copiar serie 2/})).toBeNull()
  expect(write).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Peso en kg, serie 1'),{target:{value:'bad'}})
  fireEvent.click(copy)
  expect(write).toHaveBeenCalledTimes(1)
  expect(write).toHaveBeenLastCalledWith({number:1,kg:0,amount:8})
  expect(value('Peso en kg, serie 1')).toBe('0')
  expect(value('Repeticiones, serie 1')).toBe('8')
  expect(screen.getByLabelText('Peso en kg, serie 1').getAttribute('aria-invalid')).toBeNull()
  expect(screen.getByText('Serie 1 copiada.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Copiar serie 3, 22,5 kg'}))
  expect(write).toHaveBeenLastCalledWith({number:3,kg:22.5,amount:12})
  fireEvent.change(screen.getByLabelText('Peso en kg, serie 1'),{target:{value:''}})
  expect(value('Peso en kg, serie 1')).toBe('')
  expect(value('Repeticiones, serie 1')).toBe('8')
})

it('muestra unidades por lado y nunca confirma una copia rechazada o desactivada', () => {
  const props={exercise:{...exercise,sets:1,unit:'seconds' as const,perSide:true},sets:[],
    previous:{date:'2026-11-06',sets:[{number:1,amount:35}]},onChange:vi.fn(()=>false)}
  const {rerender}=render(<ExerciseSetLog {...props}/>)
  const copy=screen.getByRole('button',{name:'Copiar serie 1, 35 s por lado'})
  fireEvent.click(copy)
  expect(screen.getByRole('status').textContent).toBe('No se pudo copiar la serie.')
  expect((screen.getByLabelText('Segundos, serie 1') as HTMLInputElement).value).toBe('')
  rerender(<ExerciseSetLog {...props} disabled/>)
  fireEvent.click(copy)
  expect(props.onChange).toHaveBeenCalledTimes(1)
})

it('permite copiar una serie adicional de la sesión anterior y añadir el primer número libre', async () => {
  const onChange=vi.fn()
  render(<ExerciseSetLog exercise={{...exercise,sets:2}} sets={[]} previous={{date:'2026-11-06',sets:[{number:50,kg:10}]}} onChange={onChange}/>)
  expect(screen.getAllByRole('rowheader').map(cell=>cell.textContent)).toEqual(['1','2','50'])
  fireEvent.click(screen.getByRole('button',{name:'Copiar serie 50, 10 kg'}))
  expect(onChange).toHaveBeenCalledWith({number:50,kg:10})
  fireEvent.click(screen.getByRole('button',{name:'Añadir serie'}))
  await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('Peso en kg, serie 3')))
  expect(screen.getAllByRole('rowheader').map(cell=>cell.textContent)).toEqual(['1','2','3','50'])
})
