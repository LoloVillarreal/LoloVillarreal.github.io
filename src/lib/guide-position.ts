import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useSyncExternalStore } from 'react'
import { validDate } from './dates'

export type SessionClock = { startedAt: number; elapsedMs: number; runningSince: number | null }
export type GuidePosition = { date: string; index: number; clock?: SessionClock }
type Bookmark = GuidePosition & { open: boolean }
const memory = new Map<string, string | null>()
const bookmarkKey = (owner: string) => 'la-guide:' + owner

function storedValue(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null
  try { return localStorage.getItem(key) } catch { return null }
}

function bookmarkFrom(raw: string | null): Bookmark | null {
  if (!raw) return null
  try {
    const saved = JSON.parse(raw)
    if (!saved || !validDate(saved.date) || !Number.isInteger(saved.index) ||
        saved.index < 0 || saved.index >= 30 || typeof saved.open !== 'boolean') return null
    const {date, index, open, clock} = saved
    const validClock = clock && Number.isSafeInteger(clock.startedAt) && clock.startedAt >= 0 &&
      Number.isSafeInteger(clock.elapsedMs) && clock.elapsedMs >= 0 &&
      (clock.runningSince === null || Number.isSafeInteger(clock.runningSince) && clock.runningSince >= 0)
    return validClock ? {date, index, open, clock} : {date, index, open}
  } catch { return null }
}

function startedClock(now: number): SessionClock {
  return {startedAt: now, elapsedMs: 0, runningSince: now}
}

function elapsedMs(clock: SessionClock, now: number) {
  return clock.elapsedMs + (clock.runningSince === null ? 0 : Math.max(0, now - clock.runningSince))
}

export function elapsedSeconds(clock?: SessionClock, now = Date.now()): number | null {
  return clock ? Math.floor(elapsedMs(clock, now) / 1000) : null
}

export function formatSessionDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  const digits = (n: number) => String(n).padStart(2, '0')
  return (hours ? hours + ':' : '') + digits(minutes) + ':' + digits(seconds % 60)
}

export function useElapsedSeconds(clock?: SessionClock): number | null {
  const [, refresh] = useReducer(value => value + 1, 0)
  const running = clock?.runningSince != null
  useEffect(() => {
    if (!running) return
    const tick = window.setInterval(() => { if (!document.hidden) refresh() }, 1000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('pageshow', refresh)
    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('pageshow', refresh)
    }
  }, [running])
  return elapsedSeconds(clock)
}

export function useGuidePosition(owner?: string) {
  const key = owner ? bookmarkKey(owner) : ''
  const scope = useMemo(() => ({key}), [key])
  const currentScope = useRef<typeof scope | null>(scope)
  useLayoutEffect(() => {
    currentScope.current = scope
    return () => { currentScope.current = null }
  }, [scope])
  const subscribe = useCallback((changed: () => void) => {
    if (!key) return () => {}
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== key) return
      memory.delete(key)
      changed()
    }
    window.addEventListener(key, changed)
    window.addEventListener('storage', onStorage)
    window.addEventListener('pageshow', changed)
    return () => {
      window.removeEventListener(key, changed)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pageshow', changed)
    }
  }, [key])
  const raw = useSyncExternalStore(subscribe, () => key ? storedValue(key) : null, () => null)
  const bookmark = useMemo(() => bookmarkFrom(raw), [raw])
  // A single click can issue two commands before React renders, e.g. resume and reopen.
  const lastCommand = useRef<{raw: string | null; value: Bookmark | null}>()
  useLayoutEffect(() => { lastCommand.current = undefined }, [raw, scope])

  // Refresh from disk before each command: a second tab may just have paused or ended it.
  function change(update: (current: Bookmark | null) => Bookmark | null) {
    if (!key || currentScope.current !== scope) return false
    const current = bookmarkFrom(storedValue(key))
    const expected = lastCommand.current?.raw === raw ? lastCommand.current.value : bookmark
    if (expected?.date !== current?.date || expected?.clock?.startedAt !== current?.clock?.startedAt) return false
    const value = update(current)
    if (value === current) return false
    const next = value ? JSON.stringify(value) : null
    try {
      if (next) localStorage.setItem(key, next)
      else localStorage.removeItem(key)
      memory.delete(key)
    } catch { memory.set(key, next) }
    lastCommand.current = {raw, value}
    window.dispatchEvent(new Event(key))
    return true
  }
  return {
    bookmark,
    reader: bookmark?.open ? bookmark : null,
    setReader(position: GuidePosition | null) {
      return change(current => {
        if (!position) return current?.open ? {...current, open: false} : current
        if (!validDate(position.date) || !Number.isInteger(position.index) || position.index < 0 || position.index >= 30) return current
        if (current && current.date !== position.date) return current
        return {date: position.date, index: position.index, open: true, clock: current?.clock ?? startedClock(Date.now())}
      })
    },
    pause(date: string) {
      return change(current => {
        if (current?.date !== date || current.clock?.runningSince == null) return current
        const clock = current.clock
        return {...current, clock: {...clock, elapsedMs: elapsedMs(clock, Date.now()), runningSince: null}}
      })
    },
    resume(date: string) {
      return change(current => {
        if (current?.date !== date || current.clock?.runningSince != null) return current
        const now = Date.now()
        const clock = current.clock ? {...current.clock, runningSince: now} : startedClock(now)
        return {...current, clock}
      })
    },
    finish(date: string, expectedStartedAt?: number | null) {
      return change(current => {
        if (current?.date !== date ||
            expectedStartedAt !== undefined && expectedStartedAt !== (current.clock?.startedAt ?? null)) return current
        return null
      })
    }
  }
}
