import type { RoutineGif } from '../data/routine-gifs'
const cacheName='plan-la-routine-gifs-v1'
const gifURL=(gif:RoutineGif)=>new URL('./movimientos/'+gif.file,document.baseURI).href
export const gifGroupsChanged='plan-la:gif-groups-changed'

function checkSignal(signal?:AbortSignal) {
  if(signal?.aborted)throw new DOMException('Descarga cancelada','AbortError')
}

async function readGif(response:Response|undefined,gif:RoutineGif) {
  if(!response?.ok)return null
  const data=await response.arrayBuffer()
  if(data.byteLength!==gif.bytes||data.byteLength<14)return null
  const bytes=new Uint8Array(data)
  if(!/^GIF8[79]a$/.test(String.fromCharCode(...bytes.subarray(0,6)))||bytes[bytes.length-1]!==0x3b)return null
  return new Blob([data],{type:'image/gif'})
}

async function cachedGif(gif:RoutineGif) {
  try { return await readGif(await caches.match(gifURL(gif),{cacheName}),gif) }
  catch { return null }
}

export async function isRoutineGifSaved(gif:RoutineGif) { return !!await cachedGif(gif) }

async function fetchGif(gif:RoutineGif,signal?:AbortSignal) {
  const data=await readGif(await fetch(gifURL(gif),{signal}),gif)
  if(!data)throw Error('No se recibió el GIF completo.')
  return data
}

export async function loadRoutineGif(gif:RoutineGif,signal?:AbortSignal) {
  checkSignal(signal)
  const saved=await cachedGif(gif)
  checkSignal(signal)
  return saved??fetchGif(gif,signal)
}

export async function saveRoutineGif(gif:RoutineGif,signal?:AbortSignal) {
  checkSignal(signal)
  const cache=await caches.open(cacheName)
  if(await isRoutineGifSaved(gif))return
  const blob=await fetchGif(gif,signal)
  checkSignal(signal)
  await cache.put(gifURL(gif),new Response(blob,{headers:{'Content-Type':'image/gif','Content-Length':String(blob.size)}}))
  if(!await isRoutineGifSaved(gif))throw Error('El GIF no se ha guardado en este dispositivo.')
}

// The media itself is public. Only the signed-in owner can see their local grouping.
const groupKey=(userId:string)=>'plan-la:routine-gif-groups:'+userId
export function localGifGroups(userId:string):string[][] {
  if(!userId)return []
  try {
    const rows:unknown=JSON.parse(localStorage.getItem(groupKey(userId))??'[]')
    return Array.isArray(rows)?rows.filter((row):row is string[]=>Array.isArray(row)&&row.length>0&&row.every(id=>typeof id==='string'&&/^[A-Z0-9]{8}$/.test(id))):[]
  }catch{return []}
}
const sameGroup=(a:string[],b:string[])=>a.length===b.length&&a.every((id,i)=>id===b[i])
export async function isRoutineGifGroupSaved(ids:string[],userId:string) {
  return localGifGroups(userId).some(row=>sameGroup(row,ids))
}
export async function rememberRoutineGifs(ids:string[],userId:string) {
  if(!userId||!ids.length)return
  const unique=[...new Set(ids)]
  const old=localGifGroups(userId)
  if(old.some(row=>sameGroup(row,unique)))return
  localStorage.setItem(groupKey(userId),JSON.stringify([unique,...old]))
  window.dispatchEvent(new Event(gifGroupsChanged))
}
