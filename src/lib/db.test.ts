import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAll, defaultSettings, getAll, getKV, importBackup, loadBackup, put, setKV, validateBackup } from './db'
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
  it('restaura las copias antiguas sin exigir campos nuevos',async()=>{
    const old={schemaVersion:1 as const,exportedAt:new Date().toISOString(),workoutLogs:[],cardioLogs:[],progressLogs:[{id:'old',date:'2026-10-01',energy:3,sleep:8,notes:'anterior',photo:'data:image/png;base64,AA=='}],mealChecks:{'2026-10-01-breakfast':true},settings:defaultSettings}
    expect(validateBackup(old)).toBe(true);await importBackup(old)
    expect((await getAll<ProgressLog>('progressLogs'))[0].photo).toBe(old.progressLogs[0].photo)
  })
  it('incluye el nuevo progreso y preferencias sin perderlos al restaurar',async()=>{
    await put('progressLogs',{id:'strength',date:'2026-10-01',energy:3,sleep:8,notes:'',hipThrustKg:60,hipThrustReps:10})
    await setKV('guideWeek',4);const backup=await loadBackup();expect(validateBackup(backup)).toBe(true)
    await clearAll();await importBackup(backup);expect(await getKV('guideWeek',1)).toBe(4);expect((await getAll<ProgressLog>('progressLogs'))[0].hipThrustKg).toBe(60)
  })
  it('rechaza archivos dañados antes de tocar los registros existentes',async()=>{
    await put('progressLogs',{id:'safe',date:'2026-10-01',energy:3,sleep:8,notes:''})
    const bad={...await loadBackup(),progressLogs:[{id:'bad'}]} as never
    expect(validateBackup(bad)).toBe(false);await expect(importBackup(bad)).rejects.toThrow();expect((await getAll<ProgressLog>('progressLogs'))[0].id).toBe('safe')
  })
  it('conserva asistencia y registros parciales al exportar y restaurar',async()=>{
    const attendance={date:'2026-10-19',title:'Glúteos',type:'strength',completedAt:'2026-10-19T18:00:00.000Z'}
    await setKV('attendance:2026-10-19',attendance)
    await put('progressLogs',{id:'weight-only',date:'2026-10-19',weight:54.5,notes:''})
    const backup=JSON.parse(JSON.stringify(await loadBackup()))
    expect(validateBackup(backup)).toBe(true)
    await clearAll();await importBackup(backup)
    expect(await getKV('attendance:2026-10-19',null)).toEqual(attendance)
    expect((await getAll<ProgressLog>('progressLogs'))[0]).toEqual({id:'weight-only',date:'2026-10-19',weight:54.5,notes:''})
    backup.localState['attendance:2026-10-19'].date='2026-10-20'
    expect(validateBackup(backup)).toBe(false)
  })
  it('permite recuperar un borrador incompleto sin tratarlo como una medición',async()=>{
    await setKV('progressDraft',{id:'draft',date:'2026-10-20',weight:'54,',waist:'',hip:'',hipThrustKg:'',hipThrustReps:'',energy:'',sleep:'',notes:'',photo:''})
    const backup=await loadBackup();expect(validateBackup(backup)).toBe(true)
    await clearAll();await importBackup(backup)
    expect(await getAll('progressLogs')).toHaveLength(0)
    expect((await getKV('progressDraft',{weight:''})).weight).toBe('54,')
  })
  it('revierte toda la restauración si falla una escritura',async()=>{
    await put('progressLogs',{id:'safe',date:'2026-10-01',energy:3,sleep:8,notes:''})
    const backup=await loadBackup();backup.progressLogs[0].id='new'
    const original=IDBObjectStore.prototype.put
    const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,value,key){if(this.name==='progressLogs'&&value.id==='new')throw new DOMException('Simulated failure','QuotaExceededError');return original.call(this,value,key)})
    try{await expect(importBackup(backup)).rejects.toThrow('Simulated failure')}finally{spy.mockRestore()}
    expect((await getAll<ProgressLog>('progressLogs'))[0].id).toBe('safe')
  })
})
