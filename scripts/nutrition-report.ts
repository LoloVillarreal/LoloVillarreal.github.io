import { menu } from '../src/data/nutrition'
import { dayNutrients } from '../src/lib/calculations'

console.table(menu.map(day=>{
  const n=dayNutrients(day)
  return {día:day.name,kcal:Math.round(n.kcal),proteína:+n.protein.toFixed(1),carbohidratos:+n.carbs.toFixed(1),grasas:+n.fat.toFixed(1)}
}))
