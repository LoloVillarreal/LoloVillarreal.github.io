import catalog from '../data/hevy-library.json'
import originalCatalog from '../data/hevy-catalog.json'
import { workoutDays } from '../data/training'
import type { Exercise } from '../types'
const muscles:Record<string,string>={abdominals:'Core',shoulders:'Hombros',biceps:'Bíceps',triceps:'Tríceps',forearms:'Antebrazos',quadriceps:'Cuádriceps',hamstrings:'Femoral',calves:'Gemelos',glutes:'Glúteos',abductors:'Abductores',adductors:'Aductores',lats:'Espalda',upper_back:'Espalda',traps:'Trapecios',lower_back:'Lumbar',chest:'Pecho',cardio:'Cardio',neck:'Cuello',full_body:'Cuerpo completo',other:'Otros'}
export const equipmentNames:Record<string,string>={none:'Sin material',barbell:'Barra',dumbbell:'Mancuernas',kettlebell:'Kettlebell',machine:'Máquina / polea',plate:'Disco',resistance_band:'Banda',suspension:'Suspensión',other:'Otro'}
const originals=workoutDays.flatMap(day=>day.exercises)
export const catalogById=new Map([...Object.values(originalCatalog).map(row=>({...row,type:'weight_reps',secondary_muscle_groups:[],is_custom:false})),...catalog].map(row=>[row.id,row]))
const additional:Exercise[]=catalog.filter(row=>!originals.some(item=>item.hevyId===row.id)).map(row=>{
 const timed=row.type.includes('duration'),distance=row.type==='short_distance_weight'
 return {id:`hevy-${row.id}`,hevyId:row.id,hevyName:row.title,name:row.title,muscle:muscles[row.primary_muscle_group]??'Otros',sets:timed||distance?1:2,reps:timed?[30,60]:distance?[10,20]:[8,12],unit:timed?'seconds':distance?'meters':'reps',rest:[60,90],rir:[2,3],technique:'Imagen y nombre del catálogo estándar de Hevy. Esta ficha no incluye instrucciones técnicas específicas: revisa la ejecución antes de usar un ejercicio nuevo.',progression:'Los parámetros de partida son editables y no proceden de una rutina de Hevy. Adáptalos a tu ejercicio y nivel.',alternatives:[]}
})
export const allExercises=[...originals,...additional]
export const exerciseLibrary=allExercises.filter((exercise,index)=>allExercises.findIndex(item=>item.hevyId===exercise.hevyId)===index)
export const exerciseById=new Map(allExercises.map(exercise=>[exercise.id,exercise]))
export const exerciseUnit=(exercise:Exercise)=>exercise.unit==='seconds'?'seg.':exercise.unit==='meters'?'m':'reps'
export const exerciseImage=(exercise:Exercise)=>catalogById.has(exercise.hevyId)&&!catalogById.get(exercise.hevyId)?.thumbnail_url?'./exercise-placeholder.svg':`./hevy/${exercise.hevyId}.jpg`
export const searchText=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es')
