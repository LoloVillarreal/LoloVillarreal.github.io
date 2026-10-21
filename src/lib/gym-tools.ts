export const kgToLb=(kg:number)=>kg/0.45359237
export const lbToKg=(lb:number)=>lb*0.45359237
export function platesPerSide(total:number,bar:number){
 if(!Number.isFinite(total)||!Number.isFinite(bar)||bar<0||total<bar)return null
 let remaining=Math.round((total-bar)*100)/200
 const plates:{weight:number;count:number}[]=[]
 for(const weight of [25,20,15,10,5,2.5,1.25]){const count=Math.floor((remaining+1e-8)/weight);if(count){plates.push({weight,count});remaining=Math.round((remaining-count*weight)*1000)/1000}}
 return {plates,remainder:remaining}
}
