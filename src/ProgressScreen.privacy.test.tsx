// @vitest-environment jsdom
import { useState, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ProgressScreen } from './ProgressScreen'
import { isoDate } from './lib/dates'

const save = vi.hoisted(() => vi.fn())
vi.mock('./lib/account', () => ({
  AccountGate: ({ children }: { children: ReactNode }) => children,
  useCloudValue: <T,>(_key: string, initial: T | (() => T)) => useState(initial),
  useAccount: () => ({
    values: { 'progress:test': { id: 'test', date: isoDate(), notes: '', weight: 58, waist: 70, hip: 90 } },
    set: save,
    flush: async () => {},
  }),
}))
beforeEach(() => vi.stubGlobal('requestAnimationFrame', vi.fn()))
afterEach(() => { cleanup(); save.mockClear(); vi.unstubAllGlobals() })

it.each(['Hip thrust', 'Bienestar'])('protege las medidas al abrir %s y conserva sus valores al guardar', async (category) => {
  render(<ProgressScreen hide notify={vi.fn()} onTraining={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button', { name: category }))
  const form = within(screen.getByRole('region', { name: 'Registro de progreso' }))
  expect(form.queryByLabelText('Peso corporal (kg)')).toBeNull()
  expect(form.queryByLabelText('Cadera (cm)')).toBeNull()
  fireEvent.click(form.getByRole('button', { name: 'Medidas' }))
  expect((form.getByLabelText('Cintura (cm)') as HTMLInputElement).value).toBe('70')
  expect(form.queryByLabelText('Peso corporal (kg)')).toBeNull()
  fireEvent.click(form.getByRole('button', { name: category }))
  fireEvent.change(form.getByLabelText('Nota (opcional)'), { target: { value: 'sesión de prueba' } })
  fireEvent.click(form.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(save).toHaveBeenCalledWith('progress:test', expect.objectContaining({
    weight: 58, waist: 70, hip: 90, notes: 'sesión de prueba',
  })))
})

it('abre la marca de hip thrust desde Hoy y conserva la privacidad de las medidas', async () => {
  render(<ProgressScreen hide initialCapture="strength" notify={vi.fn()} onTraining={vi.fn()}/>)
  const form = within(await screen.findByRole('region', {name:'Registro de progreso'}))
  expect(form.getByLabelText('Carga máxima hip thrust (kg)')).toBeDefined()
  expect(form.queryByLabelText('Peso corporal (kg)')).toBeNull()
  expect(form.queryByLabelText('Cadera (cm)')).toBeNull()
})

it('muestra únicamente el dato elegido y guarda juntos los cambios de dos categorías', async () => {
  render(<ProgressScreen hide={false} notify={vi.fn()} onTraining={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button', {name:'Peso'}))
  const form=within(screen.getByRole('region', {name:'Registro de progreso'}))
  expect(screen.getAllByRole('button', {name:'Peso'})).toHaveLength(1)
  fireEvent.change(form.getByLabelText('Peso corporal (kg)'), {target:{value:'59,2'}})
  fireEvent.click(form.getByRole('button', {name:'Hip thrust'}))
  expect(form.queryByLabelText('Peso corporal (kg)')).toBeNull()
  expect(form.queryByLabelText('Cintura (cm)')).toBeNull()
  fireEvent.change(form.getByLabelText('Carga máxima hip thrust (kg)'), {target:{value:'45'}})
  fireEvent.click(form.getByRole('button', {name:'Guardar cambios'}))
  await waitFor(()=>expect(save).toHaveBeenCalledWith('progress:test',expect.objectContaining({
    weight:59.2,hipThrustKg:45,waist:70,hip:90,
  })))
})
