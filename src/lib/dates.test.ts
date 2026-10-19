import { describe, expect, it } from 'vitest'
import { addDays, isoDate, mondayOf, validDate, weekDates } from './dates'

describe('fechas de la guía',()=>{
  it('mantiene semanas correctas al cruzar de año',()=>expect(weekDates('2027-01-01')).toEqual(['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']))
  it('usa el calendario local y soporta el cambio de hora',()=>{expect(addDays('2026-03-28',2)).toBe('2026-03-30');expect(mondayOf('2026-10-25')).toBe('2026-10-19');expect(isoDate(new Date(2026,9,19,0,1))).toBe('2026-10-19')})
  it('rechaza fechas inexistentes sin normalizarlas a otro día',()=>{expect(validDate('2026-02-29')).toBe(false);expect(validDate('2024-02-29')).toBe(true);expect(validDate('')).toBe(false)})
})
