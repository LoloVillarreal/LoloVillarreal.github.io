import { Dumbbell } from 'lucide-react'
export default function SectionSwitch({police=false,onClick}:{police?:boolean;onClick:()=>void}){
 const label=police?'Ir al entrenamiento de Alexia':'Ir al apartado Policía Nacional'
 return <button className="icon-button section-switch" aria-label={label} title={label} onClick={onClick}>{police?<Dumbbell aria-hidden="true"/>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9 5 5l7-2 7 2 2 4-3 4H6L3 9Z"/><path d="M6 13v3h12v-3M5 16c1 5 13 5 14 0H5Z"/><path d="m12 6 2 1v2l-2 2-2-2V7l2-1Z"/></svg>}</button>
}
