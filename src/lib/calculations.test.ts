import { describe, expect, it } from 'vitest'
import { menu } from '../data/nutrition'
import { bmi, carbsForCalories, dayNutrients, macroCalories, mealNutrients, mifflin } from './calculations'

describe('cálculos corporales',()=>{
  it('calcula IMC con altura en centímetros',()=>expect(bmi(54.5,158)).toBeCloseTo(21.83,2))
  it('calcula Mifflin-St Jeor para mujer',()=>expect(mifflin({weightKg:54.5,heightCm:158,age:24,sex:'female'})).toBeCloseTo(1251.5,1))
  it('rechaza valores imposibles',()=>expect(()=>bmi(-1,158)).toThrow())
})

describe('nutrición',()=>{
  it('suma ingredientes y comidas de forma determinista',()=>{
    const day=menu[0], meals=day.meals.map(m=>mealNutrients(m)), total=dayNutrients(day)
    expect(total.kcal).toBeCloseTo(meals.reduce((s,m)=>s+m.kcal,0),6)
    expect(total.protein).toBeGreaterThan(90)
    expect(total.kcal).toBeGreaterThan(1500)
  })
  it('escala las porciones',()=>expect(dayNutrients(menu[2],1.25).kcal).toBeCloseTo(dayNutrients(menu[2]).kcal*1.25,6))
  it('mantiene consistente la calculadora de macros',()=>{
    const carbs=carbsForCalories(1900,110,60)
    expect(macroCalories(110,carbs,60)).toBe(1900)
  })
})
