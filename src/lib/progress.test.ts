import { describe, expect, it } from 'vitest'
import { hipThrustProgress } from './calculations'
import { progressCsv } from './files'
import type { ProgressLog } from '../types'

const entry=(id:string,date:string,hipThrustKg?:number):ProgressLog=>({id,date,hipThrustKg,energy:3,sleep:8,notes:''})
describe('progreso de carga en hip thrust',()=>{
  it('distingue el récord de la última carga y calcula el cambio desde el inicio',()=>{
    const values=[entry('c','2026-10-18',50),entry('a','2026-10-01',40),entry('b','2026-10-10',60),entry('d','2026-10-19')]
    const result=hipThrustProgress(values)
    expect(result.best?.hipThrustKg).toBe(60);expect(result.latest?.hipThrustKg).toBe(50);expect(result.first?.hipThrustKg).toBe(40);expect(result.gain).toBe(20)
    expect(values[0].id).toBe('c')
  })
  it('admite un inicio sin carga y no inventa datos cuando faltan',()=>{expect(hipThrustProgress([entry('a','2026-10-01',0),entry('b','2026-10-10',20)]).gain).toBe(20);expect(hipThrustProgress([entry('a','2026-10-01')]).best).toBeUndefined()})
  it('incluye carga y repeticiones en la copia CSV',()=>{const csv=progressCsv([{...entry('a','2026-10-01',40),hipThrustReps:10}]);expect(csv).toContain('Hip thrust kg');expect(csv).toContain('"40";"10"')})
})
