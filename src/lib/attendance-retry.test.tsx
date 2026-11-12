// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AccountProvider, useAccount } from './account'

const fake=vi.hoisted(()=>({insert:vi.fn(),receipt:vi.fn()}))
vi.mock('@supabase/supabase-js',()=>({
  createClient:()=>({
    auth:{onAuthStateChange:(listener:(event:string,session:unknown)=>void)=>{
      listener('INITIAL_SESSION',{user:{id:'synthetic'}})
      return {data:{subscription:{unsubscribe(){}}}}
    }},
    from:()=>{
      const query={
        eq:()=>query,gt:()=>query,order:()=>query,select:()=>query,
        limit:async()=>({data:[],error:null}),maybeSingle:fake.receipt,
        insert:()=>({select:fake.insert})
      }
      return query
    }
  })
}))

afterEach(()=>{cleanup();vi.resetAllMocks()})
it.each(['same','other-title','other-duration','other-order','missing-list','other-set-weight','missing-sets'])('checks the attendance receipt after a lost response (%s)', async scenario=>{
  const legacy={date:'2026-11-09',type:'strength',title:'Sesión QA',durationSeconds:300,completedAt:'2026-11-09T12:00:00.000Z'}
  const setGroup={exerciseIndex:1,unit:'reps',sets:[{number:1,kg:20.5,amount:8}]}
  const data={...legacy,exerciseNames:['Hip thrust en máquina','Remo en máquina'],performedSets:[setGroup]}
  const match=scenario==='same'
  fake.insert.mockResolvedValueOnce({error:{code:'offline'}}).mockResolvedValueOnce({error:{code:'23505'}})
  const receipt={...legacy,title:scenario==='other-title'?'Otra rutina':data.title,durationSeconds:scenario==='other-duration'?301:300,
    ...(scenario!=='missing-list' && {exerciseNames:scenario==='other-order'?[...data.exerciseNames].reverse():[...data.exerciseNames]}),
    ...(scenario!=='missing-sets' && {performedSets:[{...setGroup,sets:[{amount:8,kg:scenario==='other-set-weight'?21:20.5,number:1}]}]})}
  fake.receipt.mockResolvedValue({data:{version:1,updated_at:data.completedAt,value:{data:receipt}}})
  const hook=renderHook(()=>useAccount(),{wrapper:AccountProvider})
  await waitFor(()=>expect(hook.result.current.complete).toBe(true))
  act(()=>hook.result.current.set('attendance:'+data.date,data))
  await waitFor(()=>expect(hook.result.current.error).not.toBe(''))
  if(match)await act(()=>hook.result.current.flush())
  else await act(async()=>{await expect(hook.result.current.flush()).rejects.toThrow('otro dispositivo')})
  expect(fake.receipt).toHaveBeenCalledOnce()
  expect(hook.result.current.error==='').toBe(match)
})
