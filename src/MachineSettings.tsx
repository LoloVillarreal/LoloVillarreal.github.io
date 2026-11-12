import { useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useAccount } from './lib/account'
import { machineNoteKey, machineNoteLimit } from './lib/fitness-preferences'
import './machine-settings.css'

export function MachineSettings({ exerciseId }: { exerciseId: string }) {
  const account = useAccount()
  if (!account.session) return null
  return <NoteEditor key={account.session.user.id + exerciseId} account={account} noteKey={machineNoteKey(exerciseId)}/>
}

function NoteEditor({ account, noteKey }: { account: ReturnType<typeof useAccount>; noteKey: string }) {
  const value = account.confirmedValues?.[noteKey]
  const saved = typeof value === 'string' ? value : ''
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const baseline = useRef<unknown>()
  const writing = useRef(false)
  const trigger = useRef<HTMLButtonElement>(null)
  function close() {
    setDraft(null)
    requestAnimationFrame(() => trigger.current?.focus({preventScroll:true}))
  }
  async function save(remove = false) {
    if (writing.current || !account.complete || !navigator.onLine || draft === null) return
    const text = draft.trim()
    if (!remove && !text) return
    if (remove && !confirm('¿Quitar los ajustes guardados para este ejercicio?')) return
    writing.current = true
    setBusy(true)
    setMessage('')
    try {
      await account.flush()
      const changed = 'Los ajustes han cambiado. Cancela y vuelve a abrirlos para ver la última versión.'
      if (remove) {
        if (account.values[noteKey] !== baseline.current) throw Error(changed)
        await account.remove(noteKey)
      } else {
        account.set(noteKey, (current: unknown) => {
          if (current !== baseline.current && current !== text) throw Error(changed)
          return text
        })
        await account.flush()
      }
      close()
      setMessage(remove ? 'Ajustes eliminados.' : 'Ajustes guardados en tu cuenta.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo confirmar el guardado. Vuelve a intentarlo.')
    } finally {
      writing.current = false
      setBusy(false)
    }
  }
  return <section className="machine-settings" aria-label="Mis ajustes del ejercicio">
    {draft === null ? <>
      <button className="machine-settings-open" type="button" ref={trigger} disabled={!account.complete} onClick={() => {
        baseline.current = value
        setDraft(saved)
        setMessage('')
      }}><SlidersHorizontal size={16} aria-hidden="true"/><strong>Mis ajustes</strong><span>{!account.complete ? 'Pendiente de conexión' : saved ? 'Editar' : 'Añadir'}</span></button>
      {saved && <p className="machine-settings-note">{saved}</p>}
    </> : <>
      <label>Mis ajustes de este ejercicio
        <textarea autoFocus rows={2} maxLength={machineNoteLimit} value={draft} disabled={busy}
          placeholder="Por ejemplo, asiento 4 y respaldo 2" onChange={event=>setDraft(event.target.value)}/>
      </label>
      <div className="machine-settings-actions">
        <button type="button" className="secondary" disabled={busy||!account.complete||!navigator.onLine||!draft.trim()} onClick={()=>void save()}>Guardar ajustes</button>
        <button type="button" className="text-button" disabled={busy} onClick={()=>{close();setMessage('')}}>Cancelar</button>
        {saved&&<button type="button" className="text-button" disabled={busy||!account.complete||!navigator.onLine} onClick={()=>void save(true)}>Quitar</button>}
      </div>
      {(!account.complete || !navigator.onLine)&&<p className="small-note">Necesitas conexión y la cuenta cargada para guardar.</p>}
    </>}
    {message&&<p role="status">{message}</p>}
  </section>
}
