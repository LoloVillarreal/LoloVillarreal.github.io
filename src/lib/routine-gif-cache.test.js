// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { Blob as NativeBlob } from 'node:buffer'
import { afterEach, expect, it, vi } from 'vitest'
import { workoutDays } from '../data/training'
import { alternativeExercise } from './exercise-library'
import { routineGifs } from '../data/routine-gifs'
import { isRoutineGifSaved, isRoutineGifGroupSaved, loadRoutineGif, localGifGroups, rememberRoutineGifs, saveRoutineGif } from './routine-gif-cache'

const ids=['D57C2EC7','C6C9B8A0']
function repositoryFile(gif) { return readFileSync('public/movimientos/'+gif.file) }
function browserCache(){
  vi.stubGlobal('Blob',NativeBlob)
  const items=new Map(), cache={
    match:vi.fn(async url=>items.get(url)?.clone()),
    put:vi.fn(async(url,response)=>items.set(url,response.clone())),
  }
  vi.stubGlobal('caches',{match:cache.match,open:async()=>cache})
  return cache
}
afterEach(()=>{localStorage.clear();vi.unstubAllGlobals()})

it('incluye un GIF reproducible de varios fotogramas para cada variante del plan',()=>{
  const required=[...new Set(workoutDays.flatMap(day=>day.exercises.flatMap(e=>[
    e.hevyId,...e.alternatives.flatMap(name=>{const alt=alternativeExercise(name);return alt?[alt.hevyId]:[]})
  ])))]
  expect(new Set(required.map(id=>routineGifs[id]?.file)).size).toBe(required.length)
  for(const id of new Set([...required,...Object.keys(routineGifs)])){
    const gif=routineGifs[id], data=repositoryFile(gif)
    expect(data.length).toBe(gif.bytes)
    expect(data.subarray(0,6).toString()).toBe('GIF89a')
    expect(data.at(-1)).toBe(0x3b)
    let i=13+((data[10]&0x80)?3*(2**((data[10]&7)+1)):0),frames=0
    const skipBlocks=()=>{while(i<data.length&&data[i])i+=1+data[i];i++}
    while(i<data.length-1){
      const block=data[i++]
      if(block===0x21){i++;skipBlocks();continue}
      expect(block).toBe(0x2c)
      const packed=data[i+8];i+=9+((packed&0x80)?3*(2**((packed&7)+1)):0)
      i++;skipBlocks();frames++
    }
    expect(frames).toBeGreaterThan(1)
  }
})

it('reutiliza la copia verificada después de un reinicio sin red',async()=>{
  const gif=routineGifs[ids[0]], cache=browserCache()
  const request=vi.fn().mockResolvedValueOnce(new Response(repositoryFile(gif))).mockRejectedValue(Error('Sin red'))
  vi.stubGlobal('fetch',request)
  expect(await isRoutineGifSaved(gif)).toBe(false)
  await saveRoutineGif(gif)
  expect(await isRoutineGifSaved(gif)).toBe(true)
  await saveRoutineGif(gif)
  const blob=await loadRoutineGif(gif)
  expect(blob.size).toBe(gif.bytes);expect(blob.type).toBe('image/gif')
  expect(request).toHaveBeenCalledTimes(1);expect(cache.put).toHaveBeenCalledTimes(1)
})

it('no marca como listos archivos truncados, HTML de error ni escrituras sin espacio',async()=>{
  const gif=routineGifs[ids[0]],cache=browserCache(),data=repositoryFile(gif)
  const request=vi.fn().mockResolvedValueOnce(new Response(data.subarray(0,-1)))
    .mockResolvedValueOnce(new Response(Buffer.alloc(data.length,0x20))).mockResolvedValueOnce(new Response(data))
  vi.stubGlobal('fetch',request)
  await expect(saveRoutineGif(gif)).rejects.toThrow('completo')
  await expect(saveRoutineGif(gif)).rejects.toThrow('completo')
  cache.put.mockRejectedValueOnce(new DOMException('Sin espacio','QuotaExceededError'))
  await expect(saveRoutineGif(gif)).rejects.toThrow('Sin espacio')
  expect(await isRoutineGifSaved(gif)).toBe(false)
})

it('separa las rutinas por cuenta y conserva el orden sin duplicar descargas',async()=>{
  await rememberRoutineGifs(ids,'cuenta-a')
  await rememberRoutineGifs([...ids,ids[0]],'cuenta-a')
  expect(localGifGroups('cuenta-a')).toEqual([ids])
  expect(await isRoutineGifGroupSaved([...ids].reverse(),'cuenta-a')).toBe(false)
  expect(localGifGroups('cuenta-b')).toEqual([])
})
