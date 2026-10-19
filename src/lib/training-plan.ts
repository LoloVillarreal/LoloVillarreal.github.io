import { workoutDays } from '../data/training'
import { parseDate, validDate } from './dates'
import type { Exercise, WorkoutDay } from '../types'

export type PlannedExercise={exerciseId:string;sets:number;reps:[number,number];rest:number}
export type TrainingPlan={title:string;type:WorkoutDay['type'];exercises:PlannedExercise[];notes:string;cardio:{activity:string;minutes:number}}
const exercises=workoutDays.flatMap(day=>day.exercises)
export const exerciseLibrary=exercises.filter((exercise,index)=>exercises.findIndex(item=>item.hevyId===exercise.hevyId)===index)
export const cardioActivities=['Caminata','Bicicleta','Elíptica','Otro']
export const plannedExercise=(exercise:Exercise):PlannedExercise=>({exerciseId:exercise.id,sets:exercise.sets,reps:[...exercise.reps],rest:exercise.rest[1]})
export function planFromRoutine(day:WorkoutDay):TrainingPlan{
  return {title:day.title,type:day.type,exercises:day.exercises.map(plannedExercise),notes:'',cardio:{activity:'Caminata',minutes:35}}
}
export function trainingPlanValid(value:unknown):value is TrainingPlan{
  if(!value||typeof value!=='object')return false
  const plan=value as TrainingPlan
  const integer=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isInteger(n)&&n>=min&&n<=max
  if(Object.keys(plan).some(key=>!['title','type','exercises','notes','cardio'].includes(key)))return false
  if(typeof plan.title!=='string'||!plan.title.trim()||plan.title.length>100||!['strength','cardio','recovery'].includes(plan.type)||typeof plan.notes!=='string'||plan.notes.length>2000||!Array.isArray(plan.exercises)||plan.exercises.length>30)return false
  if(!plan.cardio||!cardioActivities.includes(plan.cardio.activity)||!integer(plan.cardio.minutes,1,180))return false
  if(Object.keys(plan.cardio).some(key=>!['activity','minutes'].includes(key)))return false
  const ids:string[]=[]
  for(const item of plan.exercises){
    if(!item||typeof item!=='object')return false
    if(Object.keys(item).some(key=>!['exerciseId','sets','reps','rest'].includes(key)))return false
    const exercise=exercises.find(exercise=>exercise.id===item.exerciseId)
    if(!exercise||ids.includes(exercise.hevyId)||!integer(item.sets,1,20)||!Array.isArray(item.reps)||item.reps.length!==2||!item.reps.every(n=>integer(n,1,999))||item.reps[0]>item.reps[1]||!integer(item.rest,0,900))return false
    ids.push(exercise.hevyId)
  }
  return plan.type==='strength'||plan.exercises.length===0
}
export function trainingEntryValid(key:string,value:unknown):value is TrainingPlan{
  const date=key.slice('training:'.length)
  return key.startsWith('training:')&&validDate(date)&&trainingPlanValid(value)&&(parseDate(date).getDay()!==3||value.type==='cardio')
}
export function workoutForDate(date:string,plan?:TrainingPlan):WorkoutDay{
  const base=workoutDays.find(day=>day.day===parseDate(date).getDay())!
  if(!trainingEntryValid(`training:${date}`,plan))return base
  return {...base,title:plan.title,type:plan.type,optional:base.day===5,objective:plan.notes||(plan.type==='strength'?'Tu selección de ejercicios para hoy.':plan.type==='cardio'?'Actividad cardiovascular a tu ritmo.':'Descanso y recuperación.'),exercises:plan.exercises.map(item=>({...exercises.find(exercise=>exercise.id===item.exerciseId)!,sets:item.sets,reps:item.reps,rest:[item.rest,item.rest]}))}
}
