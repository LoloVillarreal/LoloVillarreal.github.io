import { useEffect, useState } from 'react'
import { useAccount } from './lib/account'

export function LoveNote(){
  const {session}=useAccount()
  const [burst,setBurst]=useState(0)
  useEffect(()=>{if(!burst)return;const timer=window.setTimeout(()=>setBurst(0),2400);return()=>clearTimeout(timer)},[burst])
  if(session?.user.id!=='b8c904e1-c36e-4c72-a0c1-266394fb8557')return null
  return <div className="love-note"><button onClick={()=>setBurst(previous=>previous+1)}>te amo mucho <span>by lolo</span></button>{burst>0&&<span key={burst} className="love-heart" role="status" aria-label="Un corazón para ti">♥</span>}</div>
}
