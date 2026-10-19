import { foods } from '../data/nutrition'
import { workoutDays } from '../data/training'
import type { Meal, MenuDay, ProgressLog, SetLog, WorkoutLog } from '../types'

export type Nutrients = { kcal:number; protein:number; carbs:number; fat:number }
export const zeroNutrients = ():Nutrients => ({kcal:0,protein:0,carbs:0,fat:0})

export function ingredientNutrients(foodId:string, amount:number):Nutrients {
  const food = foods[foodId]
  if (!food || amount < 0) throw new Error('Alimento o cantidad no válidos')
  const grams = food.unit === 'unit' ? amount * (food.gramsPerUnit ?? 50) : amount
  const factor = grams / 100
  return { kcal:food.kcal*factor, protein:food.protein*factor, carbs:food.carbs*factor, fat:food.fat*factor }
}

const sum = (items:Nutrients[]) => items.reduce((a,n)=>({kcal:a.kcal+n.kcal,protein:a.protein+n.protein,carbs:a.carbs+n.carbs,fat:a.fat+n.fat}),zeroNutrients())
export const mealNutrients = (meal:Meal, portion=1) => sum(meal.ingredients.map(i=>ingredientNutrients(i.foodId,i.amount*portion)))
export const dayNutrients = (day:MenuDay, portion=1) => sum(day.meals.map(m=>mealNutrients(m,portion)))
export const macroCalories = (protein:number, carbs:number, fat:number) => protein*4 + carbs*4 + fat*9

export function bmi(weightKg:number,heightCm:number) {
  if (weightKg <= 0 || heightCm <= 0) throw new Error('Datos no válidos')
  return weightKg / ((heightCm/100) ** 2)
}

export function mifflin({weightKg,heightCm,age,sex}:{weightKg:number;heightCm:number;age:number;sex:'female'|'male'}) {
  if ([weightKg,heightCm,age].some(x=>x<=0)) throw new Error('Datos no válidos')
  return 10*weightKg + 6.25*heightCm - 5*age + (sex === 'female' ? -161 : 5)
}

export function maintenanceRange(bmr:number,activity:number) {
  const center=bmr*activity
  return { center, low:center*.9, high:center*1.1 }
}

export function carbsForCalories(calories:number,protein:number,fat:number) {
  const remaining=calories-protein*4-fat*9
  return Math.max(0,remaining/4)
}

export function movingAverage(logs:ProgressLog[], window=3) {
  const weighted=logs.filter(x=>typeof x.weight==='number').sort((a,b)=>a.date.localeCompare(b.date))
  return weighted.map((item,index)=>{
    const values=weighted.slice(Math.max(0,index-window+1),index+1).map(x=>x.weight as number)
    return {...item,average:values.reduce((a,b)=>a+b,0)/values.length}
  })
}

export function workingVolume(sets:SetLog[]) {
  return sets.filter(s=>s.kind==='working'&&s.done).reduce((sum,s)=>sum+(s.weight??0)*(s.reps??0),0)
}

export function progressionSuggestion(logs:WorkoutLog[], exerciseId:string, repMax:number, targetRir:number) {
  const last=logs.filter(l=>l.exerciseId===exerciseId&&l.completed).sort((a,b)=>b.date.localeCompare(a.date))[0]
  if (!last) return 'Registra una primera sesión para obtener una sugerencia.'
  const sets=last.sets.filter(s=>s.kind==='working'&&s.done)
  if (!sets.length) return 'Completa las series efectivas para obtener una sugerencia.'
  const met=sets.every(s=>(s.reps??0)>=repMax && Math.abs((s.rir??targetRir)-targetRir)<=1)
  return met ? 'Rango alto completado: puedes probar la subida mínima de carga disponible manteniendo la técnica.' : 'Mantén la carga e intenta sumar alguna repetición con el RIR previsto.'
}

export function weeklyAdherence(logs:WorkoutLog[], mondayISO:string) {
  const start=new Date(`${mondayISO}T12:00:00`); const end=new Date(start); end.setDate(end.getDate()+7)
  const inWeek=logs.filter(l=>l.completed&&new Date(`${l.date}T12:00:00`)>=start&&new Date(`${l.date}T12:00:00`)<end)
  const groups=inWeek.reduce<Record<string,Set<string>>>((acc,l)=>{const key=`${l.date}-${l.workoutDay}`;(acc[key]??=new Set()).add(l.exerciseId);return acc},{})
  const completed=Object.entries(groups).filter(([key,ids])=>{const parts=key.split('-');const day=Number(parts[parts.length-1]);const required=workoutDays.find(x=>x.day===day)?.exercises.length??Infinity;return ids.size>=required}).length
  return Math.min(100,Math.round(completed/4*100))
}
