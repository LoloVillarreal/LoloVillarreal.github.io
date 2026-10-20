import { describe, expect, it } from 'vitest'
import { emptyProgress, progressDraft, progressEntry } from './progress-entry'

describe('registro de progreso sin datos inventados',()=>{
  it('guarda solo un peso y acepta coma decimal sin añadir sueño ni energía',()=>{
    const form={...emptyProgress('2026-10-20'),weight:' 54,5 '}
    expect(progressEntry(form,'2026-10-20')).toMatchObject({weight:54.5,energy:undefined,sleep:undefined})
  })
  it('permite bienestar o notas por separado y rechaza un registro vacío',()=>{
    const form=emptyProgress('2026-10-20')
    expect(()=>progressEntry(form,'2026-10-20')).toThrow('al menos un dato')
    expect(progressEntry({...form,energy:1},'2026-10-20').sleep).toBeUndefined()
    expect(progressEntry({...form,notes:' Día tranquilo '},'2026-10-20').notes).toBe('Día tranquilo')
  })
  it('edita el mismo registro sin perder medidas no modificadas ni duplicar su id',()=>{
    const original={id:'existing',date:'2026-10-19',weight:55,waist:65,energy:4,sleep:7,notes:'anterior'}
    const changed=progressEntry({...progressDraft(original),hipThrustKg:'60',hipThrustReps:'10'},'2026-10-20')
    expect(changed).toMatchObject({...original,hipThrustKg:60,hipThrustReps:10})
  })
  it('distingue valores vacíos de cero y valida fechas, sueño y repeticiones',()=>{
    const form={...emptyProgress('2026-10-20'),hipThrustKg:'0'}
    expect(progressEntry(form,'2026-10-20').hipThrustKg).toBe(0)
    for(const patch of [{weight:'0'},{weight:'abc'},{date:'2026-10-21'},{date:'2026-02-30'},{sleep:'25'},{hipThrustReps:'1.5'},{hipThrustKg:'',hipThrustReps:'10'}])expect(()=>progressEntry({...form,...patch},'2026-10-20')).toThrow()
  })
})
