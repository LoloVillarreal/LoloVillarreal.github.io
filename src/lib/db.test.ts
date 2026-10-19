import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearAll, getAll, importBackup, loadBackup, put, validateBackup } from './db'
import type { ProgressLog } from '../types'

describe('persistencia IndexedDB',()=>{
  beforeEach(async()=>clearAll())
  it('guarda y recupera registros',async()=>{
    const entry:ProgressLog={id:'p1',date:'2026-10-19',weight:54.5,energy:4,sleep:8,notes:'bien'}
    await put('progressLogs',entry)
    expect(await getAll<ProgressLog>('progressLogs')).toEqual([entry])
  })
  it('exporta, valida e importa una copia completa',async()=>{
    await put('progressLogs',{id:'p2',date:'2026-10-20',energy:3,sleep:7,notes:''} satisfies ProgressLog)
    const backup=await loadBackup()
    expect(validateBackup(backup)).toBe(true)
    await clearAll();await importBackup(backup)
    expect((await getAll<ProgressLog>('progressLogs')).length).toBe(1)
  })
})
