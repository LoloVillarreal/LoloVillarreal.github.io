import { useEffect, useRef, useState } from 'react'
import ExercisePhoto from './ExercisePhoto'
import { useAccount } from './lib/account'
import { shortDate } from './lib/dates'
import { guideByName } from './lib/exercise-guides'
import { alternativeExercise, catalogById, equipmentNames } from './lib/exercise-library'
import { replaceForDate, samePlan } from './lib/today-replacement'
import { trainingEntryValid, type TrainingPlan } from './lib/training-plan'
import type { Exercise } from './types'
import './today-replacement.css'

type Props = { date: string; exercise: Exercise; index: number }
type Change = { previous?: TrainingPlan; next: TrainingPlan; name: string }

export default function TodayReplacement(props: Props) {
  const account = useAccount()
  return <Replacement key={`${account.session?.user.id}:${props.date}:${props.index}`} {...props}/>
}

function Replacement({ date, exercise, index }: Props) {
  const account = useAccount()
  const key = `training:${date}`
  const displayedPlan = useRef(account.values[key])
  displayedPlan.current = account.values[key]
  const [open, setOpen] = useState(false)
  const [change, setChange] = useState<Change | null>(null)
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const retry = useRef<(() => Promise<void>) | null>(null)
  const [notice, setNotice] = useState('')
  const [failed, setFailed] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const sameChange = change && samePlan(account.values[key], change.next)
  const unavailable = !online || busy || account.loading || account.saving || !account.complete
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    window.addEventListener('offline', sync)
    window.addEventListener('online', sync)
    return () => { window.removeEventListener('offline', sync); window.removeEventListener('online', sync) }
  }, [])

  async function run(action: () => Promise<void>) {
    if (locked.current || unavailable) return
    locked.current = true
    setBusy(true)
    setFailed(false)
    try { await action() }
    catch (error) {
      setFailed(true)
      setNotice(error instanceof Error ? error.message : 'No se pudo confirmar el cambio.')
    }
    finally { locked.current = false; setBusy(false) }
  }

  function replace(name: string) {
    void run(async () => {
      retry.current = null
      account.set(key, (previous: unknown) => {
        const next = replaceForDate(date, previous, index, exercise.id, name)
        setChange({ previous: trainingEntryValid(key, previous) ? previous : undefined, next, name })
        return next
      })
      setOpen(false)
      setNotice('Guardando el cambio…')
      const confirm = async () => {
        await account.flush()
        setNotice(`${name} guardado para el ${shortDate(date)}.`)
        retry.current = null
      }
      retry.current = confirm
      await confirm()
    })
  }

  function undo() {
    if (!change || !sameChange) return
    void run(async () => {
      retry.current = null
      if (change.previous) {
        account.set(key, (current: unknown) => {
          if (!samePlan(current, change.next)) throw new Error('La rutina cambió después de la sustitución.')
          return change.previous
        })
      }
      const confirm = async () => {
        if (change.previous) await account.flush()
        else {
          if (!samePlan(displayedPlan.current, change.next)) {
            retry.current = null
            throw new Error('La rutina cambió después de la sustitución.')
          }
          await account.remove(key)
        }
        setChange(null)
        setNotice('Cambio deshecho.')
        retry.current = null
      }
      retry.current = confirm
      await confirm()
    })
  }

  if (!exercise.alternatives.length && !notice && !change) return null
  return <section className="today-replacement" aria-label="Alternativas para esta sesión">
    {exercise.alternatives.length > 0 && <button type="button" className="secondary" aria-expanded={open}
      onClick={() => setOpen(!open)}>{open ? 'Cerrar alternativas' : 'Cambiar por otro ejercicio'}</button>}
    {open && <div><p>Elige qué hacer el {shortDate(date)}.</p><ul>{exercise.alternatives.map(name => {
      const target = alternativeExercise(name)
      const guide = guideByName.get(name)
      if (!target) return <li key={name}><details><summary>{name} · Ver guía</summary>
        <p>{guide?.instruction}</p>{guide && <a href={guide.source} target="_blank" rel="noreferrer">Referencia de técnica ↗</a>}
      </details></li>
      const row = catalogById.get(target.hevyId)
      return <li key={name} className="replacement-option"><ExercisePhoto exercise={target}/>
        <button className="replacement-select" type="button" disabled={unavailable} onClick={() => replace(name)}>
          <span><strong>{name}</strong><small>{target.muscle}{row && ` · ${equipmentNames[row.equipment] ?? row.equipment}`}</small></span>
          <b>Usar</b>
        </button>
      </li>
    })}</ul></div>}
    {!online && open && <p className="small-note">Necesitas conexión para cambiar la rutina del {shortDate(date)}.</p>}
    {notice && <p role={failed ? 'alert' : 'status'}>{notice}</p>}
    {change && sameChange && !failed && <button className="text-button" disabled={unavailable} onClick={undo}>Deshacer cambio</button>}
    {failed && retry.current && <button className="secondary" disabled={unavailable}
      onClick={() => { if (retry.current) void run(retry.current) }}>Reintentar guardado</button>}
  </section>
}
