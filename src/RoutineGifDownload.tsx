import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Download } from 'lucide-react'
import { routineGifs } from './data/routine-gifs'
import { useAccount } from './lib/account'
import { gifGroupsChanged, isRoutineGifGroupSaved, isRoutineGifSaved, rememberRoutineGifs, saveRoutineGif } from './lib/routine-gif-cache'
import type { Exercise } from './types'
import './routine-gif-download.css'

type ExerciseSummary = Pick<Exercise, 'hevyId' | 'name'>

export function RoutineGifDownload({exercises}: {exercises: readonly ExerciseSummary[]}) {
  const userId = useAccount().session?.user.id
  const unique = [...new Map(exercises.map(exercise => [exercise.hevyId, exercise])).values()]
  const ids = unique.filter(exercise => routineGifs[exercise.hevyId]).map(exercise => exercise.hevyId).join(',')
  const missing = unique.filter(exercise => !routineGifs[exercise.hevyId])
  if (!userId || !unique.length) return null
  return <div className="routine-gif-download">
    {ids && <DownloadButton key={userId + ':' + ids} selection={ids} userId={userId}/>}
    {missing.length > 0 && <details className="routine-gif-missing">
      <summary>{missing.length === 1 ? '1 ejercicio solo con foto' : missing.length + ' ejercicios solo con foto'}</summary>
      <ul>{missing.map(exercise => <li key={exercise.hevyId}>{exercise.name}</li>)}</ul>
    </details>}
  </div>
}

function DownloadButton({selection, userId}: {selection: string; userId: string}) {
  const ids = useMemo(() => selection.split(','), [selection])
  const [saved, setSaved] = useState<string[]>([])
  const [phase, setPhase] = useState<'checking' | 'idle' | 'saving' | 'ready'>('checking')
  const [appReady, setAppReady] = useState(() => Boolean(navigator.serviceWorker?.controller))
  const [error, setError] = useState('')
  const active = useRef<AbortController | null>(null)
  const checkVersion = useRef(0)
  useEffect(() => {
    const workers = navigator.serviceWorker
    if (phase !== 'ready' || !workers || appReady) return
    let mounted = true
    let worker: ServiceWorker | null = null
    function check() {
      if (mounted && (workers.controller || worker?.state === 'activated')) setAppReady(true)
    }
    workers.addEventListener('controllerchange', check)
    check()
    void workers.ready.then(registration => {
      if (!mounted) return
      worker = registration.active
      worker?.addEventListener('statechange', check)
      check()
    }).catch(() => {})
    return () => {
      mounted = false
      workers.removeEventListener('controllerchange', check)
      worker?.removeEventListener('statechange', check)
    }
  }, [appReady, phase])
  useEffect(() => {
    let mounted = true
    async function check() {
      if (active.current) return
      const version = ++checkVersion.current
      try {
        const [onDevice, grouped] = await Promise.all([
          Promise.all(ids.map(id => isRoutineGifSaved(routineGifs[id]))),
          isRoutineGifGroupSaved(ids, userId)
        ])
        if (!mounted || version !== checkVersion.current) return
        setSaved(ids.filter((_, index) => onDevice[index]))
        setPhase(onDevice.every(Boolean) && grouped ? 'ready' : 'idle')
      } catch {
        if (mounted && version === checkVersion.current) setPhase('idle')
      }
    }
    void check()
    window.addEventListener('focus', check)
    window.addEventListener('pageshow', check)
    window.addEventListener(gifGroupsChanged, check)
    return () => {
      mounted = false
      active.current?.abort()
      window.removeEventListener('focus', check)
      window.removeEventListener('pageshow', check)
      window.removeEventListener(gifGroupsChanged, check)
    }
  }, [ids, userId])

  async function download() {
    if (active.current) return
    const controller = new AbortController()
    active.current = controller
    ++checkVersion.current
    setError('')
    setPhase('saving')
    try {
      for (const id of ids) {
        const gif = routineGifs[id]
        if (controller.signal.aborted) return
        if (!await isRoutineGifSaved(gif)) await saveRoutineGif(gif, controller.signal)
        if (controller.signal.aborted) return
        setSaved(previous => previous.includes(id) ? previous : [...previous, id])
      }
      await rememberRoutineGifs(ids, userId)
      if (!controller.signal.aborted) setPhase('ready')
    } catch (cause) {
      if (controller.signal.aborted) return
      setPhase('idle')
      setError(cause && typeof cause === 'object' && 'name' in cause && cause.name === 'QuotaExceededError'
        ? 'No queda espacio en este dispositivo. Libera espacio y reintenta.'
        : !navigator.onLine ? 'Sin conexión. Vuelve a intentarlo cuando tengas internet.'
        : 'No se pudo completar la descarga. Comprueba la conexión y el espacio disponible.')
    } finally {
      if (active.current === controller) active.current = null
    }
  }

  const remaining = ids.filter(id => !saved.includes(id))
  const bytes = remaining.reduce((sum, id) => sum + routineGifs[id].bytes, 0)
  const megabytes = new Intl.NumberFormat('es-ES', {maximumFractionDigits: 1}).format(Math.max(0.1, bytes / 1_000_000))
  const title = phase === 'ready' ? (appReady ? 'GIF listos sin conexión' : 'GIF guardados')
    : phase === 'saving' ? 'Descargando los GIF…'
    : error ? 'Reintentar descarga'
    : !remaining.length ? 'Guardar esta rutina sin conexión' : 'Descargar los GIF de la rutina'
  const detail = phase === 'checking' ? 'Comprobando este dispositivo…'
    : phase === 'ready' && !appReady ? (navigator.serviceWorker
      ? 'La primera vez, deja la app abierta y con conexión hasta que esté lista.'
      : 'Este navegador necesita conexión para abrir la app.')
    : phase === 'ready' ? ids.length + ' GIF en este dispositivo'
    : phase === 'saving' || saved.length ? saved.length + ' de ' + ids.length + ' guardados'
    : ids.length + ' GIF · ' + megabytes + ' MB'

  return <>
    <button type="button" className="routine-gif-action"
      disabled={phase !== 'idle'} onClick={download}>
      {phase === 'ready' ? <Check size={19} aria-hidden="true"/> : <Download size={19} aria-hidden="true"/>}
      <span>{title}<small>{detail}</small></span>
    </button>
    <span className="sr-only" role="status">{phase === 'saving' || phase === 'ready' ? title + ' · ' + detail : ''}</span>
    {error && <p className="routine-gif-error" role="alert">{error}</p>}
  </>
}
