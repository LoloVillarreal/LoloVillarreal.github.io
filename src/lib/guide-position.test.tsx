// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { elapsedSeconds, formatSessionDuration, useElapsedSeconds, useGuidePosition } from './guide-position'

const owner = 'training-test', key = 'la-guide:' + owner, date = '2026-11-12'
const start = Date.parse(date + 'T23:59:50Z')
beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(start) })
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })

it('acumula tiempo real al minimizar, cruzar medianoche y recargar; la pausa persiste', () => {
  let hook = renderHook(() => useGuidePosition(owner))
  act(() => hook.result.current.setReader({date, index: 2}))
  act(() => { vi.setSystemTime(start + 34567); hook.result.current.setReader(null) })
  hook.unmount()
  hook = renderHook(() => useGuidePosition(owner))
  expect(hook.result.current.reader).toBeNull()
  expect(elapsedSeconds(hook.result.current.bookmark?.clock)).toBe(34)
  act(() => { hook.result.current.setReader({date, index: 3}); hook.result.current.pause(date) })
  expect(hook.result.current.bookmark?.clock).toEqual({startedAt: start, elapsedMs: 34567, runningSince: null})
  vi.setSystemTime(start + 600000)
  hook.unmount()
  hook = renderHook(() => useGuidePosition(owner))
  expect(hook.result.current.reader?.index).toBe(3)
  expect(elapsedSeconds(hook.result.current.reader?.clock)).toBe(34)
  act(() => { hook.result.current.resume(date); hook.result.current.setReader({date, index: 3}) })
  vi.setSystemTime(start + 601500)
  expect(elapsedSeconds(hook.result.current.bookmark?.clock)).toBe(36)
  expect(formatSessionDuration(36)).toBe('00:36')
  expect(formatSessionDuration(3761)).toBe('1:02:41')
})

it('recupera el marcador anterior sin inventar su hora de inicio ni modificarlo al leer', () => {
  const legacy = JSON.stringify({date, index: 5, open: false})
  localStorage.setItem(key, legacy)
  const hook = renderHook(() => useGuidePosition(owner))
  expect(hook.result.current.bookmark?.index).toBe(5)
  expect(elapsedSeconds(hook.result.current.bookmark?.clock)).toBeNull()
  expect(localStorage.getItem(key)).toBe(legacy)
  act(() => { hook.result.current.resume(date); hook.result.current.setReader({date, index: 5}) })
  expect(hook.result.current.reader?.index).toBe(5)
  expect(hook.result.current.bookmark?.clock?.startedAt).toBe(start)
  act(() => { expect(hook.result.current.finish(date, null)).toBe(false) })
  expect(hook.result.current.reader).not.toBeNull()
})

it('respeta lo escrito en otra pestaña y no reabre sesiones que esa pestaña ya descartó', () => {
  const hook = renderHook(() => useGuidePosition(owner))
  act(() => hook.result.current.setReader({date, index: 0}))
  const {setReader, finish} = hook.result.current
  const external = {date, index: 1, open: true, clock: {startedAt: start, elapsedMs: 8000, runningSince: null}}
  // Current disk state can lead the storage event.
  localStorage.setItem(key, JSON.stringify(external))
  act(() => setReader({date, index: 2}))
  expect(hook.result.current.bookmark?.clock).toEqual(external.clock)
  localStorage.removeItem(key)
  act(() => setReader({date, index: 3}))
  expect(localStorage.getItem(key)).toBeNull()
  act(() => window.dispatchEvent(new StorageEvent('storage', {key})))
  expect(hook.result.current.bookmark).toBeNull()
  vi.setSystemTime(start + 9000)
  act(() => hook.result.current.setReader({date, index: 0}))
  act(() => {
    expect(finish(date)).toBe(false)
    expect(setReader(null)).toBe(false)
    expect(hook.result.current.finish(date, start)).toBe(false)
    expect(hook.result.current.setReader({date: '2026-11-13', index: 0})).toBe(false)
  })
  expect(hook.result.current.reader?.clock?.startedAt).toBe(start + 9000)
})

it('terminar o descartar limpia solo la sesión activa del propietario actual', () => {
  const hook = renderHook(({user}) => useGuidePosition(user), {initialProps: {user: owner}})
  localStorage.setItem('la-guide:other', JSON.stringify({date, index: 1, open: false}))
  localStorage.setItem('routine-fixture', 'datos conservados')
  act(() => hook.result.current.setReader({date, index: 0}))
  const stale = hook.result.current
  hook.rerender({user: 'other'})
  act(() => expect(stale.finish(date)).toBe(false))
  hook.rerender({user: owner})
  act(() => expect(stale.finish(date)).toBe(false))
  act(() => expect(hook.result.current.finish(date, start)).toBe(true))
  expect(hook.result.current.reader).toBeNull()
  expect(localStorage.getItem(key)).toBeNull()
  expect(localStorage.getItem('la-guide:other')).not.toBeNull()
  expect(localStorage.getItem('routine-fixture')).toBe('datos conservados')
})

it('actualiza la lectura al recuperar la pantalla sin escribir cada segundo', () => {
  const clock = {startedAt: start, runningSince: start, elapsedMs: 0}
  const write = vi.spyOn(Storage.prototype, 'setItem')
  const hook = renderHook(() => useElapsedSeconds(clock))
  expect(hook.result.current).toBe(0)
  vi.setSystemTime(start + 124000)
  act(() => window.dispatchEvent(new Event('pageshow')))
  expect(hook.result.current).toBe(124)
  expect(write).not.toHaveBeenCalled()
})

it('conserva las series al avanzar, pausar, minimizar y volver en otra pestaña', () => {
  let hook = renderHook(() => useGuidePosition(owner))
  act(() => hook.result.current.setReader({date, index: 0}))
  const mark = (number: number, kg?: number, amount?: number) => hook.result.current.updateSet(date, start, 'hip-thrust', {number, kg, amount})
  act(() => { expect(mark(3, undefined, 9)).toBe(true); expect(mark(1, 17.5)).toBe(true) })
  const write = vi.spyOn(Storage.prototype, 'setItem')
  act(() => { expect(mark(1, 17.5)).toBe(true); expect(mark(2)).toBe(true) })
  expect(write).not.toHaveBeenCalled()
  act(() => { hook.result.current.setReader({date, index: 1}); hook.result.current.pause(date); hook.result.current.setReader(null) })
  hook.unmount()
  hook = renderHook(() => useGuidePosition(owner))
  expect(hook.result.current.bookmark?.setLog?.['hip-thrust']).toEqual([{number: 1, kg: 17.5}, {number: 3, amount: 9}])
  const clock = hook.result.current.bookmark?.clock
  const fromOtherTab = JSON.parse(localStorage.getItem(key)!)
  fromOtherTab.setLog.rdl = [{number: 1, kg: 20, amount: 8}]
  localStorage.setItem(key, JSON.stringify(fromOtherTab))
  act(() => { mark(3); mark(1, 0, 10) })
  expect(hook.result.current.bookmark).toMatchObject({clock, setLog: {'hip-thrust': [{number: 1, kg: 0, amount: 10}], rdl: fromOtherTab.setLog.rdl}})
  const stale = hook.result.current.updateSet
  act(() => hook.result.current.finish(date, start))
  vi.setSystemTime(start + 2000)
  act(() => hook.result.current.setReader({date, index: 0}))
  act(() => expect(stale(date, start, 'rdl', {number: 1, kg: 20})).toBe(false))
  expect(hook.result.current.bookmark).not.toHaveProperty('setLog')
})
