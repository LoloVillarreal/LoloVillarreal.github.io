// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RoutineGifDownload } from './RoutineGifDownload'
import { isRoutineGifSaved, isRoutineGifGroupSaved, rememberRoutineGifs, saveRoutineGif } from './lib/routine-gif-cache'

vi.mock('./lib/account', () => ({useAccount: () => ({session: {user: {id: 'qa'}}})}))
vi.mock('./data/routine-gifs', () => ({routineGifs: {
  A: {file: 'a.gif', bytes: 20000}, B: {file: 'b.gif', bytes: 30000}, C: {file: 'c.gif', bytes: 40000}
}}))
vi.mock('./lib/routine-gif-cache', () => ({
  gifGroupsChanged: 'gif-groups-changed', isRoutineGifSaved: vi.fn(), isRoutineGifGroupSaved: vi.fn(), rememberRoutineGifs: vi.fn(), saveRoutineGif: vi.fn()
}))

const exercises = (...ids: string[]) => ids.map(id => ({hevyId: id, name: 'Ejercicio ' + id}))
const onDevice = new Set<string>()
const download = () => screen.getByRole<HTMLButtonElement>('button', {name: /Descargar los GIF|Guardar esta rutina|Reintentar descarga/})

beforeEach(() => {
  vi.resetAllMocks()
  onDevice.clear()
  vi.mocked(isRoutineGifSaved).mockImplementation(async gif => onDevice.has(gif.file))
  vi.mocked(isRoutineGifGroupSaved).mockResolvedValue(false)
  vi.mocked(saveRoutineGif).mockImplementation(async gif => { onDevice.add(gif.file) })
  vi.mocked(rememberRoutineGifs).mockResolvedValue(undefined)
})
afterEach(cleanup)

it('continúa una descarga interrumpida sin repetir GIF y conserva el orden de los ejercicios disponibles', async () => {
  let interruption = true
  vi.mocked(saveRoutineGif).mockImplementation(async gif => {
    if (gif.file === 'b.gif' && interruption) {
      interruption = false
      throw new DOMException('Storage full', 'QuotaExceededError')
    }
    onDevice.add(gif.file)
  })
  render(<RoutineGifDownload exercises={exercises('A', 'X', 'A', 'B')}/>)
  expect(screen.getByText('1 ejercicio solo con foto')).toBeTruthy()
  expect(screen.getByText('Ejercicio X')).toBeTruthy()
  await waitFor(() => expect(download().disabled).toBe(false))
  expect(saveRoutineGif).not.toHaveBeenCalled()
  fireEvent.click(download())
  expect((await screen.findByRole('alert')).textContent).toMatch(/No queda espacio/)
  expect(download().textContent).toContain('1 de 2 guardados')
  expect(rememberRoutineGifs).not.toHaveBeenCalled()
  fireEvent.click(download())
  await screen.findByRole('button', {name: /GIF listos sin conexión/})
  expect(vi.mocked(saveRoutineGif).mock.calls.map(([gif]) => gif.file)).toEqual(['a.gif', 'b.gif', 'b.gif'])
  expect(rememberRoutineGifs).toHaveBeenCalledWith(['A', 'B'], 'qa')
})

it('permite guardar otra combinación ya descargada y luego la reconoce al reabrirla', async () => {
  onDevice.add('a.gif')
  onDevice.add('b.gif')
  const first = render(<RoutineGifDownload exercises={exercises('B', 'A')}/>)
  fireEvent.click(await screen.findByRole('button', {name: /Guardar esta rutina sin conexión/}))
  await screen.findByRole('button', {name: /GIF listos sin conexión/})
  expect(rememberRoutineGifs).toHaveBeenCalledWith(['B', 'A'], 'qa')
  expect(saveRoutineGif).not.toHaveBeenCalled()
  first.unmount()
  vi.mocked(isRoutineGifGroupSaved).mockResolvedValue(true)
  render(<RoutineGifDownload exercises={exercises('B', 'A')}/>)
  expect((await screen.findByRole<HTMLButtonElement>('button', {name: /GIF listos sin conexión/})).disabled).toBe(true)
  expect(rememberRoutineGifs).toHaveBeenCalledTimes(1)
})

it('cancela la descarga anterior al cambiar de selección y evita mezclar progresos', async () => {
  let resume!: () => void
  const pending = new Promise<void>(resolve => { resume = resolve })
  vi.mocked(saveRoutineGif).mockReturnValueOnce(pending)
  const view = render(<RoutineGifDownload exercises={exercises('A', 'B')}/>)
  await waitFor(() => expect(download().disabled).toBe(false))
  fireEvent.click(download())
  await waitFor(() => expect(saveRoutineGif).toHaveBeenCalledTimes(1))
  const signal = vi.mocked(saveRoutineGif).mock.calls[0][1]
  view.rerender(<RoutineGifDownload exercises={exercises('C')}/>)
  expect(signal?.aborted).toBe(true)
  await act(async () => { resume(); await pending })
  await waitFor(() => expect(download().textContent).toContain('1 GIF'))
  expect(rememberRoutineGifs).not.toHaveBeenCalled()
  expect(saveRoutineGif).toHaveBeenCalledTimes(1)
})
