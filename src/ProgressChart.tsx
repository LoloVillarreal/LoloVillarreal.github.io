import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type ChartProps =
  | {kind:'weight'; points:{fecha:string; peso:number|undefined; media:number}[]}
  | {kind:'strength'; points:{fecha:string; carga:number|undefined}[]}

export default function ProgressChart({kind,points}:ChartProps) {
  return <ResponsiveContainer width="100%" height={230}>
    <LineChart data={points}>
      <CartesianGrid strokeDasharray="3 3" vertical={false}/>
      <XAxis dataKey="fecha" fontSize={11}/>
      {kind==='strength' ? <YAxis unit=" kg" width={58}/> : <YAxis domain={['dataMin - 1','dataMax + 1']} width={45}/>}
      <Tooltip/>
      <Line dataKey={kind==='strength'?'carga':'peso'} name={kind==='strength'?'Carga (kg)':'Peso (kg)'}
        stroke={kind==='strength'?'var(--olive)':'var(--coral)'} strokeWidth={kind==='strength'?3:1} dot/>
      {kind==='weight'&&<Line dataKey="media" name="Media de 3 registros (kg)" stroke="var(--olive)" strokeWidth={3}/>}
    </LineChart>
  </ResponsiveContainer>
}
