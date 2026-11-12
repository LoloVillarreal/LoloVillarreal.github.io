export const kgToLb=(kg:number)=>kg/0.45359237
export const lbToKg=(lb:number)=>lb*0.45359237
export const plateWeights = [25,20,15,10,5,2.5,1.25] as const
export function platesPerSide(total:number,bar:number,pairs?:Record<number,number>|null){
 if(!Number.isFinite(total)||!Number.isFinite(bar)||bar<0||total<bar)return null
 if(pairs)return availablePlates(total,bar,pairs)
 const wanted=(total-bar)/2.5
 let units=Math.floor(wanted+1e-10)
 const plates:{weight:number;count:number}[]=[]
 for(const weight of plateWeights){const count=Math.floor(units/(weight/1.25));if(count){plates.push({weight,count});units-=count*(weight/1.25)}}
 return {plates,remainder:Math.max(0,(total-bar-Math.floor(wanted+1e-10)*2.5)/2)}
}

// Each unit is one 1.25 kg plate on each side. Prefer the closest load below
// the target, then the fewest plates. Trying only the largest plate can miss
// an exact load when, for example, there are two 15 kg pairs and no 5 kg pair.
function availablePlates(total:number,bar:number,pairs:Record<number,number>) {
 const wanted=(total-bar)/2.5
 const quantity=plateWeights.map(weight=>Math.max(0,Math.min(99,Math.floor(pairs[weight] || 0))))
 const capacity=Math.min(Math.floor(wanted+1e-10),plateWeights.reduce((sum,weight,i)=>sum+weight/1.25*quantity[i],0))
 type Choice={count:number; weight:number; taken:number; previous:Choice|null}
 const best:Array<Choice|undefined>=new Array(capacity+1)
 best[0]={count:0,weight:0,taken:0,previous:null}
 for(const [i,weight] of plateWeights.entries()){
   let left=quantity[i]
   for(let batch=1;left>0;batch*=2){
     const taken=Math.min(left,batch),units=taken*weight/1.25
     left-=taken
     for(let amount=capacity;amount>=units;amount--){
       const previous=best[amount-units]
       if(previous && (!best[amount] || previous.count+taken<best[amount]!.count)){
         best[amount]={count:previous.count+taken,weight,taken,previous}
       }
     }
   }
 }
 let reached=capacity
 while(!best[reached])reached--
 const counts:Record<number,number>={}
 for(let node=best[reached];node?.previous;node=node.previous)counts[node.weight]=(counts[node.weight]??0)+node.taken
 return {plates:plateWeights.filter(weight=>counts[weight]).map(weight=>({weight,count:counts[weight]})),remainder:Math.max(0,(total-bar-reached*2.5)/2)}
}
