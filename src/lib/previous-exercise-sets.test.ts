import { expect, it } from 'vitest'
import { previousExerciseSets } from './previous-exercise-sets'
import { exerciseById } from './exercise-library'
import type { Attendance } from './attendance'
import type { PerformedExercise } from './workout-sets'

const hip = exerciseById.get('hip-thrust')!
const thursdayHip = exerciseById.get('hip-thrust-thu')!
const machine = exerciseById.get('hevy-68CE0B9B')!
const rows = [{ number: 1, kg: 0, amount: 12 }, { number: 3, kg: 32.5 }]

function receipt(date: string, names: string[], groups: PerformedExercise[]): Attendance {
  return { date, title:'Entreno', type:'strength', completedAt:date+'T14:30:00Z', exerciseNames:names, performedSets:groups }
}

function confirmed(...receipts: Attendance[]) {
  return Object.fromEntries(receipts.map(entry => ['attendance:'+entry.date, entry]))
}

it('encuentra la última sesión confirmada con el mismo ejercicio y toma todas las series de ese día, incluidos los huecos', () => {
  const group = { exerciseIndex:0, unit:'reps' as const, hevyId:hip.hevyId, sets:rows }
  const latest = receipt('2026-11-09', ['Máquina','Nombre mostrado entonces'], [{...group, exerciseIndex:1, replaced:true}])
  const old = receipt('2026-11-06', [hip.name], [{...group, sets:[{number:2, kg:55, amount:8}]}])
  const different = receipt('2026-11-10', [hip.name], [{...group, hevyId:machine.hevyId}])
  const current = {...old, date:'2026-11-12'}
  const later = {...old, date:'2026-11-13'}
  const values = {...confirmed(latest, later, different, old, current), 'training:2026-11-11':latest}
  expect(previousExerciseSets(values, current.date, thursdayHip)).toEqual({date:latest.date, sets:rows})
  expect(previousExerciseSets(values, current.date, machine)).toEqual({date:different.date, sets:rows})
  expect(previousExerciseSets({}, current.date, hip)).toBeUndefined()
})

it('recupera recibos antiguos por nombre inequívoco y diferencia barra, máquina y ejercicios sin datos', () => {
  const legacy = receipt('2026-11-05', [hip.name, machine.name], [
    {exerciseIndex:0, unit:'reps', sets:rows},
    {exerciseIndex:1, unit:'reps', sets:[{number:2, amount:6}]},
  ])
  const later = receipt('2026-11-09', ['Hip thrust'], [{exerciseIndex:0, unit:'reps', sets:[{number:1, kg:3}]}])
  const onlyPlan = {...legacy, date:'2026-11-10', performedSets:undefined}
  delete onlyPlan.performedSets
  const values = confirmed(later, legacy, onlyPlan)
  expect(previousExerciseSets(values, '2026-11-12', thursdayHip)).toEqual({date:legacy.date, sets:rows})
  expect(previousExerciseSets(values, '2026-11-12', machine)?.sets).toEqual([{number:2, amount:6}])
  expect(previousExerciseSets(values, '2026-11-12', exerciseById.get('side-plank')!)).toBeUndefined()
})

it('descarta coincidencias de unidad, lateralidad o identidad incompatibles y grupos duplicados ambiguos', () => {
  const side = exerciseById.get('side-plank')!
  const group = {exerciseIndex:0, unit:'seconds' as const, perSide:true as const, sets:[{number:1, amount:35}]}
  const safe = receipt('2026-11-02', [side.name], [group])
  const otherUnit = receipt('2026-11-03', [side.name], [{...group, unit:'meters'}])
  const otherSide = receipt('2026-11-05', [side.name], [{...group, perSide:undefined}])
  delete otherSide.performedSets![0].perSide
  const renamed = receipt('2026-11-06', [side.name], [{...group, hevyId:hip.hevyId}])
  const duplicate = receipt('2026-11-09', [side.name, side.name], [group, {...group, exerciseIndex:1}])
  const invalid = receipt('2026-11-10', [side.name], [{...group, exerciseIndex:1}])
  expect(previousExerciseSets(confirmed(safe, otherUnit, renamed, duplicate, invalid, otherSide), '2026-11-12', side))
    .toEqual({date:safe.date, sets:group.sets})
})
