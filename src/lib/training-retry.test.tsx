// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AccountProvider, useAccount } from './account'
import { planFromRoutine, type TrainingPlan } from './training-plan'
import { workoutDays } from '../data/training'

type Row = {user_id:string; key:string; value:{data:TrainingPlan}; version:number; updated_at:string}
const db = vi.hoisted(() => ({
  row: null as Row | null,
  loseReply: true,
  commits: 0,
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {onAuthStateChange: (listener: (event:string, session:unknown) => void) => {
      listener('INITIAL_SESSION', {user:{id:'test-owner'}})
      return {data:{subscription:{unsubscribe(){}}}}
    }},
    from: () => {
      const filters: Record<string, unknown> = {}
      let after=''
      const matches = () => db.row && Object.entries(filters).every(([key,value]) => db.row![key as keyof Row] === value)
      function write(row:Row, insert:boolean) {
        if (insert && db.row) return {error:{code:'23505'},data:null}
        if (!insert && !matches()) return {error:null,data:[]}
        db.row = structuredClone(row)
        db.commits++
        if (db.loseReply) {
          db.loseReply = false
          return {error:{code:'',message:'response lost'},data:null}
        }
        return {error:null,data:[db.row]}
      }
      const query = {
        eq(column:string,value:unknown) { filters[column] = value; return query },
        select: () => query, order: () => query, gt(_column:string,value:string) {after=value;return query},
        limit: () => ({data:matches() && db.row!.key>after ? [db.row] : []}),
        maybeSingle: () => ({data:matches() ? db.row : null}),
        insert: (row:Row) => ({select: () => write(row,true)}),
        update: (row:Row) => {
          const mutation = {eq(column:string,value:unknown) { filters[column] = value; return mutation },select: () => write(row,false)}
          return mutation
        }
      }
      return query
    },
  })
}))

const plan = planFromRoutine(workoutDays[0])
const key = 'training:2026-11-12'
beforeEach(() => { db.row=null; db.loseReply=true; db.commits=0 })
afterEach(cleanup)

async function loseSaveResponse() {
  const {result} = renderHook(() => useAccount(), {wrapper:AccountProvider})
  await waitFor(() => expect(result.current.complete).toBe(true))
  act(() => result.current.set(key,plan))
  await waitFor(() => expect(result.current.error).toMatch(/sincronizar/))
  expect(db.commits).toBe(1)
  return result
}

it.each(['nueva','existente'])('recupera el guardado de una rutina %s tras perder su respuesta', async mode => {
  if (mode==='existente') db.row={user_id:'test-owner',key,value:{data:{...plan,title:'Anterior'}},version:4,updated_at:'2026-11-10T12:00:00Z'}
  const result=await loseSaveResponse()
  await act(() => result.current.flush())
  expect(result.current.error).toBe('')
  expect(db.commits).toBe(1)
  expect(db.row?.version).toBe(mode==='existente' ? 5 : 1)
})

it('respeta un cambio de otro dispositivo entre la respuesta perdida y el reintento',async () => {
  const result=await loseSaveResponse()
  db.row={...db.row!,version:2,value:{data:{...plan,notes:'Desde otro dispositivo'}}}
  await act(async () => { await expect(result.current.flush()).rejects.toThrow('otro dispositivo') })
  expect(db.row.value.data.notes).toBe('Desde otro dispositivo')
  expect(db.commits).toBe(1)
})

it('un ajuste pendiente solo pasa a confirmado tras corroborar la respuesta perdida',async()=>{
  const {result}=renderHook(()=>useAccount(),{wrapper:AccountProvider})
  await waitFor(()=>expect(result.current.complete).toBe(true))
  const note='machineNote:D57C2EC7'
  act(()=>result.current.set(note,'Banco 2'))
  await waitFor(()=>expect(result.current.error).toMatch(/sincronizar/))
  expect(result.current.values[note]).toBe('Banco 2')
  expect(result.current.confirmedValues[note]).toBeUndefined()
  await act(()=>result.current.flush())
  expect(result.current.confirmedValues[note]).toBe('Banco 2')
  expect(db.commits).toBe(1)
})

it('recupera una marca confirmada en el servidor sin repetirla tras perder la respuesta',async()=>{
  const {result}=renderHook(()=>useAccount(),{wrapper:AccountProvider})
  await waitFor(()=>expect(result.current.complete).toBe(true))
  const key='progress:qa', mark={id:'qa',date:'2026-11-12',hipThrustKg:50,hipThrustReps:8,weight:undefined,notes:''}
  act(()=>result.current.set(key,mark))
  await waitFor(()=>expect(result.current.error).toMatch(/sincronizar/))
  expect(result.current.confirmedValues[key]).toBeUndefined()
  db.row=JSON.parse(JSON.stringify(db.row))
  await act(()=>result.current.flush())
  expect(result.current.confirmedValues[key]).toMatchObject({hipThrustKg:50,hipThrustReps:8})
  expect(db.commits).toBe(1)
})

it('confirma primero la escritura interrumpida y luego aplica la siguiente edición local',async () => {
  const result=await loseSaveResponse()
  const newer={...plan,notes:'Segunda elección'}
  act(() => result.current.set(key,newer))
  await act(() => result.current.flush())
  expect(db.row).toMatchObject({version:2,value:{data:newer}})
  expect(db.commits).toBe(2)
})
