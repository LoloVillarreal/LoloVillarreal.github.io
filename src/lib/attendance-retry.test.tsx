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
it.each([true,false])('accepts a retried insert only if its receipt matches (match=%s)', async match=>{
  const data={date:'2026-11-09',type:'strength',title:'Sesión QA',completedAt:'2026-11-09T12:00:00.000Z'}
  fake.insert.mockResolvedValueOnce({error:{code:'offline'}}).mockResolvedValueOnce({error:{code:'23505'}})
  fake.receipt.mockResolvedValue({data:{version:1,updated_at:data.completedAt,value:{data:{...data,title:match?data.title:'Otra rutina'}}}})
  const hook=renderHook(()=>useAccount(),{wrapper:AccountProvider})
  await waitFor(()=>expect(hook.result.current.complete).toBe(true))
  act(()=>hook.result.current.set('attendance:'+data.date,data))
  await waitFor(()=>expect(hook.result.current.error).not.toBe(''))
  if(match)await act(()=>hook.result.current.flush())
  else await act(async()=>{await expect(hook.result.current.flush()).rejects.toThrow('otro dispositivo')})
  expect(fake.receipt).toHaveBeenCalledOnce()
  expect(hook.result.current.error==='').toBe(match)
})
