// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountProvider, loginErrorMessage, useAccount } from './account'
import type { AccountRow } from './account-pages'
import { defaultSettings } from './db'
import type { Backup } from '../types'

const fake=vi.hoisted(()=>({page:vi.fn(),replace:vi.fn()}))
vi.mock('@supabase/supabase-js',()=>({
  createClient:()=>({
    auth:{onAuthStateChange:(listener:(event:string,session:unknown)=>void)=>{
      listener('INITIAL_SESSION',{user:{id:'synthetic-user'}})
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
})

describe('mensajes de acceso',()=>{
  it('distingue credenciales, falta de internet y servidor inaccesible',()=>{
    expect(loginErrorMessage({code:'invalid_credentials',status:400},true)).toMatch(/contraseña incorrectos/)
    expect(loginErrorMessage({},false)).toMatch(/Sin conexión a internet/)
    for(const status of [0,408,503])expect(loginErrorMessage({status},true)).toMatch(/servicio de acceso no responde/)
  })
})
