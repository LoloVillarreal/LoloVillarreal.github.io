// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountProvider, loginErrorMessage, useAccount } from './account'
import type { AccountRow } from './account-pages'
import { defaultSettings, validateBackup } from './db'
import type { Backup } from '../types'

const fake=vi.hoisted(()=>({page:vi.fn(),replace:vi.fn(),switchUser:vi.fn()}))
vi.mock('@supabase/supabase-js',()=>({
  createClient:()=>({
    auth:{onAuthStateChange:(listener:(event:string,session:unknown)=>void)=>{
      listener('INITIAL_SESSION',{user:{id:'synthetic-user'}})
      fake.switchUser.mockImplementation((id:string)=>listener('SIGNED_IN',{user:{id}}))
      return {data:{subscription:{unsubscribe:()=>{}}}}
    }},
    from:()=>{
      let after:string|null=null
      const query={
        select:()=>query,eq:()=>query,order:()=>query,gt:(_column:string,key:string)=>{after=key;return query},
        limit:()=>fake.page(after)
      }
      return query
    },
    rpc:fake.replace
  })
}))
const backup:Backup={schemaVersion:2,exportedAt:'2026-11-11',workoutLogs:[],cardioLogs:[],progressLogs:[],mealChecks:{},settings:defaultSettings,localState:{}}
const first:AccountRow={key:'personalGoal',value:{data:'Synthetic goal'},version:1,updated_at:'2026-11-11'}
const pageOk=(after:string|null)=>({error:null,data:after===null?[first]:[]})
const pageInterrupted=(after:string|null)=>after===null?pageOk(null):{error:Error('sin conexión'),data:null}
describe('seguridad de copias con una sesión sintética',()=>{
  beforeEach(()=>{fake.page.mockReset();fake.replace.mockReset()})
  afterEach(cleanup)
  it('mantiene la cuenta incompleta tras fallar la carga inicial y permite reintentar',async()=>{
    fake.page.mockImplementation(pageInterrupted)
    const {result}=renderHook(()=>useAccount(),{wrapper:AccountProvider})
    await waitFor(()=>expect(result.current.error).not.toBe(''))
    expect(result.current.values).toEqual({})
    expect(result.current.complete).toBe(false)
    await expect(result.current.getBackup()).rejects.toThrow()
    fake.page.mockImplementation(pageOk)
    await act(()=>result.current.refresh())
    expect(result.current.complete).toBe(true)
    expect(result.current.values.personalGoal).toBe('Synthetic goal')
  })
  it('un editor de la sesión anterior no puede escribir ni borrar al cambiar de cuenta',async()=>{
    fake.page.mockImplementation(pageOk)
    const {result}=renderHook(()=>useAccount(),{wrapper:AccountProvider})
    await waitFor(()=>expect(result.current.complete).toBe(true))
    const old=result.current
    act(()=>fake.switchUser('synthetic-B'))
    await waitFor(()=>expect(result.current.session?.user.id).toBe('synthetic-B'))
    expect(()=>old.set('machineNote:D57C2EC7','Ajuste de A')).toThrow('sesión ha cambiado')
    await expect(old.remove('hipGoal')).rejects.toThrow('sesión ha cambiado')
    expect(result.current.values['machineNote:D57C2EC7']).toBeUndefined()
  })
  it('impide sustituir datos si la lectura previa a restaurar falla después de la primera página',async()=>{
    fake.page.mockImplementation(pageOk)
    const {result}=renderHook(()=>useAccount(),{wrapper:AccountProvider})
    await waitFor(()=>expect(result.current.complete).toBe(true))
    fake.page.mockImplementation(pageInterrupted)
    const saveBackup=vi.fn()
    await act(async()=>{await expect(result.current.restore(backup,saveBackup)).rejects.toThrow()})
    expect(saveBackup).not.toHaveBeenCalled()
    expect(fake.replace).not.toHaveBeenCalled()
    expect(result.current.complete).toBe(false)
    expect(result.current.values.personalGoal).toBe('Synthetic goal')
  })
  it('restaura ajustes de ejercicio, meta y material sin perder rutinas ni crear marcas',async()=>{
    fake.page.mockImplementation(pageOk)
    fake.replace.mockResolvedValue({error:null})
    const localState={ 'training:2026-11-11':{type:'cardio',title:'Caminata',notes:'',exercises:[],cardio:{activity:'Caminata',minutes:25}}, 'machineNote:D57C2EC7':'Banco 2','machineNote:32HKJ34K':'Zona de zancadas',hipGoal:{kg:52.5,reps:8},gymInventory:{pairs:null,hipBar:{id:'olympic-20',kg:20}} }
    const restored={...backup,localState}
    expect(validateBackup(restored)).toBe(true)
    expect(validateBackup({...restored,localState:{...localState,'machineNote:D57C2EC7':'x'.repeat(241)}})).toBe(false)
    const {result}=renderHook(()=>useAccount(),{wrapper:AccountProvider})
    await waitFor(()=>expect(result.current.complete).toBe(true))
    const before=vi.fn()
    await act(()=>result.current.restore(restored,before))
    expect(before.mock.calls[0][0].localState.personalGoal).toBe('Synthetic goal')
    expect(fake.replace).toHaveBeenCalledWith('replace_plan_data',{entries:Object.entries(localState).map(([key,data])=>({key,value:{data}}))})
  })
})

describe('mensajes de acceso',()=>{
  it('distingue credenciales, falta de internet y servidor inaccesible',()=>{
    expect(loginErrorMessage({code:'invalid_credentials',status:400},true)).toMatch(/contraseña incorrectos/)
    expect(loginErrorMessage({},false)).toMatch(/Sin conexión a internet/)
    for(const status of [0,408,503])expect(loginErrorMessage({status},true)).toMatch(/servicio de acceso no responde/)
  })
})
