import { useId } from 'react'

export type BarShape = 'straight' | 'short' | 'ez' | 'triceps' | 'trap' | 'open-trap' | 'safety' | 'multi' | 'smith' | 'cambered' | 'axle' | 'custom'

type Plate = { weight: number; count: number; color: string }
type Props = { shape: BarShape; plates?: ReadonlyArray<Plate>; miniature?: boolean }

const frame: Record<BarShape, string> = {
  straight: 'M-84 0H84',
  short: 'M-84 0H84',
  ez: 'M-84 0H-62L-40 -10L-20 7L0 -3L20 7L40 -10L62 0H84',
  triceps: 'M-84 0H-57M57 0H84 M-57 -8Q-57 -17 -46 -17H46Q57 -17 57 -8V8Q57 17 46 17H-46Q-57 17 -57 8Z M-22 -16V16M22 -16V16',
  trap: 'M-84 0H-67L-41 -25H41L67 0L41 25H-41L-67 0 M67 0H84 M-46 -18V19M46 -18V19',
  'open-trap': 'M-84 0H-64M64 0H84 M-41 23L-64 2V-5L-43 -24H43L64 -5V2L41 23 M-49 -17V13M49 -17V13',
  safety: 'M-84 0H-65L-55 -9H55L65 0H84 M-20 -9L-24 21M20 -9L24 21',
  multi: 'M-84 0H-66M66 0H84 M-65 -11L-56 -17H56L65 -11V11L56 17H-56L-65 11Z M-45 -15L-35 15M-14 -15L-8 15M14 -15L8 15M45 -15L35 15',
  smith: 'M-84 0H84',
  cambered: 'M-84 0H-64Q-60 0 -60 -4V-19Q-60 -23 -55 -23H55Q60 -23 60 -19V-4Q60 0 64 0H84',
  axle: 'M-84 0H84',
  custom: 'M-84 0H84',
}

function DrawPlate({ x, thickness, plate }: { x:number; thickness:number; plate:Plate }) {
  const radius = Math.min(37, 12 + Math.sqrt(plate.weight) * 5)
  const round = Math.min(6, thickness * .58)
  const face = x + thickness
  return <g fill={plate.color} strokeLinejoin="round">
    <path d={`M${x} ${-radius}H${face}V${radius}H${x}C${x-round*1.3} ${radius} ${x-round*1.3} ${-radius} ${x} ${-radius}Z`} stroke="#263b3b" strokeWidth="1.3"/>
    <path d={`M${x} ${-radius+2}H${face}`} stroke="#fff" strokeOpacity=".55" strokeWidth="1.7"/>
    <ellipse cx={face} rx={round} ry={radius} stroke="#263b3b" strokeWidth="1.3"/>
    <ellipse cx={face} rx={round} ry={radius} fill="#102d34" fillOpacity=".19"/>
    <ellipse cx={face} rx={round*.67} ry={radius*.78} fill="none" stroke="white" strokeOpacity=".43" strokeWidth="1"/>
    <ellipse cx={face} rx={round*.47} ry="5.3" fill="#586b70" stroke="#d6dedd" strokeWidth=".9"/>
  </g>
}

export default function BarbellDrawing({ shape, plates=[], miniature=false }:Props) {
  const id=useId().replace(/:/g,'')
  const metal=`url(#steel${id})`
  const groups=plates.filter(plate=>Number.isFinite(plate.count) && plate.count>=1 && plate.weight>0)
    .sort((a,b)=>b.weight-a.weight)
  const count=groups.reduce((sum,plate)=>sum+Math.floor(plate.count),0)
  const compact=count>8
  // Keep each colour visible when the pair count exceeds the space on a sleeve.
  const visible=compact ? groups.slice(0,9) : groups.flatMap(plate=>Array<Plate>(Math.floor(plate.count)).fill(plate))
  const spacing=Math.min(12,62/Math.max(1,visible.length))
  const shaft=shape==='axle' ? 11 : miniature ? 6 : 5.4
  const knurled=shape==='straight'||shape==='short'||shape==='smith'||shape==='custom'

  return <svg className={miniature?'barbell-drawing barbell-miniature':'barbell-drawing'} viewBox={miniature?'0 0 360 104':'0 0 360 128'}
    width="360" height={miniature?104:128} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"
    style={{display:'block',width:'100%',height:'auto',overflow:'visible'}}>
    <defs>
      <linearGradient id={`steel${id}`} x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox">
        <stop stopColor="#56696b"/><stop offset=".22" stopColor="#c9d4d3"/><stop offset=".4" stopColor="#f0f5ef"/>
        <stop offset=".57" stopColor="#90a3a5"/><stop offset="1" stopColor="#51666a"/>
      </linearGradient>
      <radialGradient id={`floor${id}`}>
        <stop stopColor="currentColor" stopOpacity=".16"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/>
      </radialGradient>
      <pattern id={`grip${id}`} width="4" height="4" patternUnits="userSpaceOnUse">
        <path d="M-1 1L1 -1M0 4L4 0M3 5L5 3" stroke="#405355" strokeWidth="1.4"/>
      </pattern>
    </defs>
    {!miniature&&<ellipse cx="180" cy="106" rx={count?154:122} ry="7" fill={`url(#floor${id})`}/>}
    <g transform={`translate(180 ${miniature?50:58}) rotate(${miniature?0:-4}) scale(${shape==='short'?.78:1} 1)`}>
      {shape==='smith'&&[-70,70].map(x=><g key={x}>
        <rect x={x-3} y="-31" width="6" height="65" rx="2" fill="#9aabaa" stroke="#445b5b" strokeWidth="1.4"/>
        <rect x={x-8} y="-9" width="16" height="18" rx="3" fill="#556c70"/>
      </g>)}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={frame[shape]} stroke="#364b50" strokeWidth={shaft+2.5}/>
        <path d={frame[shape]} stroke={shape==='axle'?'#5c7375':'#a3b4b8'} strokeWidth={shaft}/>
        <path d={frame[shape]} stroke="#eff4ec" strokeOpacity={shape==='axle'?.5:.95} strokeWidth={miniature?1.8:1.4} transform="translate(0 -1.25)"/>
      </g>
      {knurled&&[-48,22].map(x=><rect key={x} x={x} y="-2.6" width={shape==='custom'?17:26} height="5.2"
        rx="1.2" fill={`url(#grip${id})`}/>)}
      {shape==='custom'&&<rect x="-10" y="-3.2" width="20" height="6.4" rx="1" fill="#b7844a"/>}
      {shape==='safety'&&<>
        <rect x="-25" y="-16" width="50" height="14" rx="6" fill="#3a5354" stroke="#7e9291" strokeWidth="2"/>
        {[-19,19].map(x=><rect key={x} x={x-5} y="-8" width="10" height="21" rx="4" fill="#506969" stroke="#a3b0a7" strokeWidth="1.3"/>)}
      </>}
      {[-1,1].map(side=><g key={side} transform={`scale(${side} 1)`}>
        <rect x="79" y="-6.8" width="86" height="13.6" rx="3" fill={metal} stroke="#475b60" strokeWidth="1.4"/>
        <path d="M85 -2H161" stroke="white" strokeWidth="1.4" opacity=".67"/>
        <rect x="79" y="-10" width="6" height="20" rx="2" fill={metal} stroke="#41575c" strokeWidth="1.3"/>
        {visible.map((plate,i)=><DrawPlate key={i} plate={plate} x={87+i*spacing} thickness={Math.min(spacing*.83,4+Math.sqrt(plate.weight)*1.25)}/>)}
        <rect x="160" y="-5.8" width="4.2" height="11.6" rx="1.4" fill="#52676b"/>
      </g>)}
    </g>
    {compact&&!miniature&&<text x="180" y="124" textAnchor="middle" fill="currentColor" fontSize="11.5">
      {count} discos por lado · dibujo agrupado
    </text>}
  </svg>
}
