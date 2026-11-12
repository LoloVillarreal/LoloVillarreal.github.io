export type MotionClip = {
  file: string
  seconds: number
  bytes: number
  cue: string
  source: string
  author: 'Goulart' | 'Matthew Holfinger'
}

// Each recording matches the equipment in the catalogue variant.
export const motionClips: Record<string, MotionClip> = {
  D57C2EC7: {file:'hip-thrust-barra',seconds:4,bytes:336325,cue:'Apoya la espalda alta en el banco, eleva la cadera y vuelve a bajar con control.',source:'https://wger.de/api/v2/video/73/',author:'Goulart'},
  '2B4B7310': {file:'rumano-barra',seconds:4.5,bytes:332154,cue:'Lleva la cadera atrás con las rodillas ligeramente flexionadas. Mantén la barra cerca al regresar.',source:'https://www.dvidshub.net/video/639927/barbell-romanian-deadlift',author:'Matthew Holfinger'},
  '72CFFAD5': {file:'rumano-mancuernas',seconds:4.5,bytes:404128,cue:'Deja que las mancuernas pasen cerca de los muslos al llevar la cadera atrás y al volver a subir.',source:'https://wger.de/api/v2/video/3/',author:'Goulart'},
  B8127AD1: {file:'curl-femoral',seconds:4,bytes:349365,cue:'Con la pelvis apoyada, flexiona las rodillas para acercar el rodillo. Alarga las piernas de nuevo con control.',source:'https://wger.de/api/v2/video/35/',author:'Goulart'},
  C7973E0E: {file:'prensa',seconds:5.35,bytes:459168,cue:'Flexiona las rodillas manteniendo la espalda y la pelvis apoyadas. Empuja con ambos pies para volver.',source:'https://wger.de/api/v2/video/44/',author:'Goulart'},
  '422B08F1': {file:'elevaciones-laterales',seconds:3.7,bytes:309775,cue:'Eleva las mancuernas hacia los lados, con los codos ligeramente flexionados. Baja sin balancearte.',source:'https://wger.de/api/v2/video/6/',author:'Goulart'},
  '0393F233': {file:'remo-polea',seconds:5.65,bytes:481045,cue:'Desde los brazos extendidos, acerca el agarre estrecho al tronco y acompaña la vuelta sin inclinarte hacia atrás.',source:'https://wger.de/api/v2/video/1/',author:'Goulart'},
}
export const motionCache='plan-la-movimientos-v1'
export const motionURL=(clip: MotionClip)=>new URL('./movimientos/'+clip.file+'.v1.mp4',document.baseURI).href

export async function loadMotion(clip: MotionClip, signal: AbortSignal) {
  const url=motionURL(clip)
  if ('caches' in window) {
    try {
      const saved=await caches.match(url,{cacheName:motionCache})
      if (saved) {
        const blob=await saved.blob()
        if (blob.size===clip.bytes) return {blob,saved:true}
      }
    } catch { /* Cache storage can be unavailable while online viewing still works. */ }
  }
  const response=await fetch(url,{signal})
  if (!response.ok) throw Error('No se pudo descargar el vídeo.')
  const blob=await response.blob()
  if (blob.size!==clip.bytes||await blob.slice(4,8).text()!=='ftyp') throw Error('No se recibió el vídeo completo.')
  return {blob:blob.type==='video/mp4'?blob:blob.slice(0,blob.size,'video/mp4'),saved:false}
}
