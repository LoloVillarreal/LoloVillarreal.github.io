// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { loadMotion, motionCache, motionClips, motionURL } from './exercise-motion'

afterEach(()=>vi.unstubAllGlobals())

it('vincula cada variante a un MP4 completo y a su fuente concreta',()=>{
  for(const clip of Object.values(motionClips)){
    const file=readFileSync(resolve('public/movimientos',clip.file+'.v1.mp4'))
    expect(file.length).toBe(clip.bytes)
    expect(file.subarray(4,8).toString()).toBe('ftyp')
    expect(clip.source).toMatch(/^https:\/\//)
  }
})

it('recupera la descarga guardada sin solicitar red, y rechaza un archivo incompleto',async()=>{
  const clip=motionClips.D57C2EC7
  const bytes=readFileSync(resolve('public/movimientos',clip.file+'.v1.mp4'))
  const hit=new Response(bytes,{headers:{'Content-Type':'video/mp4'}})
  const match=vi.fn().mockResolvedValueOnce(hit).mockResolvedValueOnce(undefined)
  const fetch=vi.fn().mockResolvedValue(new Response(bytes.subarray(0,24),{headers:{'Content-Type':'video/mp4'}}))
  vi.stubGlobal('caches',{match})
  vi.stubGlobal('fetch',fetch)
  const signal=new AbortController().signal
  const result=await loadMotion(clip,signal)
  expect(match).toHaveBeenCalledWith(motionURL(clip),{cacheName:motionCache})
  expect(result.saved).toBe(true)
  expect(fetch).not.toHaveBeenCalled()
  await expect(loadMotion(clip,signal)).rejects.toThrow('completo')
})
