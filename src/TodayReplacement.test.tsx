// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import TodayReplacement from './TodayReplacement'
import { useAccount } from './lib/account'
import { planFromRoutine, workoutForDate } from './lib/training-plan'

vi.mock('./lib/account', () => ({ useAccount: vi.fn() }))
const date = '2026-11-09'
const key = `training:${date}`
const initial = planFromRoutine(workoutForDate(date))
const flush = vi.fn<() => Promise<void>>()
const remove = vi.fn()
let values: Record<string, unknown>
function Screen() {
  const [, update] = useState(0)
  vi.mocked(useAccount).mockReturnValue({
    session: { user: { id: 'synthetic' } },
    complete: true, values, loading: false, saving: false, flush,
    set(k:string, get:(previous:unknown)=>unknown) { values = { ...values, [k]: get(values[k]) }; update(i => i + 1) },
    remove: async (k:string) => { await remove(k); delete values[k]; update(i => i + 1) },
  } as unknown as ReturnType<typeof useAccount>)
  const item = workoutForDate(date, values[key] as typeof initial).exercises[0]
  return <><h1>{item.name}</h1><TodayReplacement date={date} exercise={item} index={0}/></>
}
afterEach(cleanup)
beforeEach(() => { values = {}; flush.mockReset().mockResolvedValue(); remove.mockReset().mockResolvedValue(undefined) })
describe('Sustitución en la guía diaria', () => {
  async function choose() {
    render(<Screen/>)
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar por otro ejercicio' }))
    fireEvent.click(screen.getByRole('button', { name: /Hip thrust en máquina.*Usar/ }))
    await screen.findByRole('heading', { name: 'Hip thrust en máquina' })
  }
  it('selecciona en dos toques y deshace en el mismo puesto conservando la rutina base', async () => {
    await choose()
    const undo = await screen.findByText('Deshacer cambio')
    expect(values[key]).toBeDefined()
    fireEvent.click(undo)
    await screen.findByText('Cambio deshecho.')
    expect(remove).toHaveBeenCalledWith(key)
    expect(values[key]).toBeUndefined()
  })
  it('restaura parámetros personalizados y preserva otra fecha', async () => {
    const saved = structuredClone(initial)
    saved.notes = 'Ajustada'; saved.exercises[0].sets = 5
    const other = 'training:2026-11-16'
    values = { [key]: saved, [other]: initial }
    await choose()
    fireEvent.click(await screen.findByText('Deshacer cambio'))
    await screen.findByText('Cambio deshecho.')
    expect(values[key]).toEqual(saved)
    expect(values[other]).toBe(initial)
    expect(remove).not.toHaveBeenCalled()
  })
  it('distingue un guardado fallido y confirma un reintento', async () => {
    flush.mockRejectedValueOnce(new Error('Sin conexión'))
    await choose()
    await screen.findByRole('alert')
    expect(screen.queryByText(/guardado para el/)).toBeNull()
    fireEvent.click(screen.getByRole('button', {name:'Reintentar guardado'}))
    await screen.findByText(/guardado para el/)
    expect(flush).toHaveBeenCalledTimes(2)
  })
})
