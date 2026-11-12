import { useEffect, useState, useSyncExternalStore } from 'react'

const storageKey = (userId: string) => 'la-rest-clock:' + userId
const initial = { preset: 90, endsAt: null as number | null, paused: null as number | null }
let clock = initial
let owner: string | null | undefined
let signedInAt = 0
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

// Only the clock's numbers survive a reload in this tab. A new login starts afresh.
export function selectRestSession(user: { id: string; last_sign_in_at?: string; created_at?: string } | null) {
  const nextOwner = user?.id ?? null
  const nextLogin = Date.parse(user?.last_sign_in_at || user?.created_at || '') || 0
  if (owner === nextOwner && signedInAt === nextLogin) return
  const previousOwner = owner
  const restoring = previousOwner === undefined && nextOwner !== null
  owner = nextOwner
  signedInAt = nextLogin
  clock = initial
  try {
    if (previousOwner) sessionStorage.removeItem(storageKey(previousOwner))
    const saved = restoring ? JSON.parse(sessionStorage.getItem(storageKey(nextOwner)) || 'null') : null
    if (saved?.login === nextLogin && Number.isInteger(saved.preset) && saved.preset > 0 && saved.preset <= 300 &&
        (saved.endsAt === null || Number.isSafeInteger(saved.endsAt) && saved.endsAt > 0) &&
        (saved.paused === null || Number.isInteger(saved.paused) && saved.paused > 0 && saved.paused <= 900 && saved.endsAt === null)) {
      clock = { preset: saved.preset, endsAt: saved.endsAt, paused: saved.paused }
    } else if (nextOwner) sessionStorage.removeItem(storageKey(nextOwner))
  } catch { /* The clock also works in memory. */ }
  listeners.forEach(listener => listener())
}

function update(change: Partial<typeof initial>) {
  clock = { ...clock, ...change }
  if (owner) {
    try { sessionStorage.setItem(storageKey(owner), JSON.stringify({ ...clock, login: signedInAt })) } catch { /* Memory only. */ }
  }
  listeners.forEach(listener => listener())
}

const secondsLeft = (end: number) => Math.max(0, Math.ceil((end - Date.now()) / 1000))
export const useRestPreset = () => useSyncExternalStore(subscribe, () => clock.preset)
export const setRestPreset = (preset: number) => update({ preset })
export const startRest = (seconds: number) => update({ endsAt: Date.now() + seconds * 1000, paused: null })
export const resetRest = () => update({ endsAt: null, paused: null })
export function pauseRest() {
  const left = clock.endsAt === null ? 0 : secondsLeft(clock.endsAt)
  if (left > 0) update({ endsAt: null, paused: left })
}

export function useRestClock(defaultSeconds?: number) {
  const snapshot = useSyncExternalStore(subscribe, () => clock)
  const { endsAt, paused, preset } = snapshot
  const [, tick] = useState(0)
  const remaining = endsAt !== null ? secondsLeft(endsAt) : paused ?? defaultSeconds ?? preset
  const running = endsAt !== null && remaining > 0
  useEffect(() => {
    if (!running) return
    // Use the deadline so time spent asleep or in another app counts too.
    const refresh = () => tick(value => value + 1)
    const timer = window.setInterval(refresh, 500)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [running])
  return { preset, remaining, running, paused: paused !== null, finished: endsAt !== null && !running }
}
