import { describe,expect,it } from 'vitest'
import { gymInventoryValid, latestHipMark } from './gym-inventory'
import { plateWeights, platesPerSide } from './gym-tools'

const inventory=(selected:Record<number,number>={})=>Object.fromEntries(plateWeights.map(w=>[w,selected[w]??0]))
describe('pares de discos realmente disponibles',()=>{
  it('encuentra el máximo sin exceder el objetivo y minimiza el número de pares',()=>{
    const pairs=inventory({25:1,20:1,15:2,5:1,2.5:2})
    function enumerate(i:number,total:number,count:number,options:Map<number,number>) {
      if(i===plateWeights.length){options.set(total,Math.min(options.get(total)??Infinity,count));return}
      const w=plateWeights[i]
      for(let n=0;n<=pairs[w];n++)enumerate(i+1,total+2*n*w,count+n,options)
    }
    const options=new Map<number,number>()
    enumerate(0,20,0,options)
    for(let desired=20;desired<=225;desired+=1.25){
      const best=Math.max(...Array.from(options.keys()).filter(w=>w<=desired))
      const result=platesPerSide(desired,20,pairs)!
      expect(result.plates.reduce((total,p)=>total+p.count*p.weight*2,20)).toBe(best)
      expect(result.plates.reduce((n,p)=>n+p.count,0)).toBe(options.get(best))
      expect(result.plates.every(p=>p.count<=pairs[p.weight])).toBe(true)
    }
    expect(platesPerSide(80,20,inventory({25:1,15:2}))?.plates).toEqual([{weight:15,count:2}])
    expect(platesPerSide(79.999,20,inventory({25:1,15:2}))?.plates).toEqual([{weight:25,count:1}])
    expect(platesPerSide(80,20,inventory())?.plates).toEqual([])
  })
  it('distingue no limitar los discos de un inventario vacío y rechaza datos no recuperables',()=>{
    expect(gymInventoryValid({pairs:null,hipBar:null})).toBe(true)
    const val={pairs:inventory(),hipBar:{id:'smith',kg:7.5}}
    expect(gymInventoryValid(val)).toBe(true)
    expect(gymInventoryValid({...val,pairs:{}})).toBe(false)
    expect(gymInventoryValid({...val,pairs:inventory({25:1.5})})).toBe(false)
    expect(gymInventoryValid({...val,hipBar:{id:'desconocida',kg:5}})).toBe(false)
  })
  it('toma la última marca guardada anterior a hoy inclusive aunque sea menor que el récord',()=>{
    const log=(id:string,date:string,kg:number)=>({id,date,hipThrustKg:kg,hipThrustReps:8,notes:''})
    const entries={'progress:old':log('old','2026-11-01',70),'progress:new':log('new','2026-11-09',50),
      'progress:future':log('future','2027-11-09',90),progressDraft:log('draft','2026-11-12',100)}
    expect(latestHipMark(entries,'2026-11-12')).toMatchObject({id:'new',hipThrustKg:50,hipThrustReps:8})
    expect(latestHipMark({progressDraft:entries.progressDraft})).toBeUndefined()
  })
})
