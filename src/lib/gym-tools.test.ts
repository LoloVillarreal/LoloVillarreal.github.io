import { describe, expect, it } from 'vitest'
import { kgToLb, lbToKg, platesPerSide } from './gym-tools'
import { techniqueFor } from './exercise-technique'
import { exerciseLibrary } from './exercise-library'
describe('Herramientas de gimnasio',()=>{
 it('convierte kg y lb de ida y vuelta',()=>{expect(kgToLb(20)).toBeCloseTo(44.09245,4);expect(lbToKg(kgToLb(20))).toBeCloseTo(20,8)})
 it('reparte discos simétricamente contando la barra',()=>{const p=platesPerSide(82.5,20)!;expect(p.remainder).toBe(0);expect(p.plates.reduce((n,p)=>n+p.weight*p.count,0)*2+20).toBe(82.5)})
 it('no inventa discos para pesos imposibles y rechaza entradas inválidas',()=>{expect(platesPerSide(61,20)?.remainder).toBe(.5);expect(platesPerSide(15,20)).toBeNull();expect(platesPerSide(NaN,20)).toBeNull();expect(platesPerSide(20,20)?.plates).toEqual([])})
 it('conserva técnica de la rutina y distingue variantes sin guía específica',()=>{const hip=exerciseLibrary.find(e=>e.id==='hip-thrust')!;expect(techniqueFor(hip).text).toBe(hip.technique);const arnold=exerciseLibrary.find(e=>e.hevyName==='Arnold Press (Dumbbell)')!;expect(techniqueFor(arnold).source).toContain('arnold-press');const other=exerciseLibrary.find(e=>e.hevyName==='Clean and Jerk')!;expect(techniqueFor(other).text).toContain('no incluye instrucciones técnicas específicas')})
})
