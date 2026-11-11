import { guideById, guideByName } from './exercise-guides'
import catalog from '../data/hevy-library.json'
import originalCatalog from '../data/hevy-catalog.json'
import { workoutDays } from '../data/training'
import type { Exercise } from '../types'
export const muscleNames:Record<string,string>={abdominals:'Core',shoulders:'Hombros',biceps:'Bíceps',triceps:'Tríceps',forearms:'Antebrazos',quadriceps:'Cuádriceps',hamstrings:'Femoral',calves:'Gemelos',glutes:'Glúteos',abductors:'Abductores',adductors:'Aductores',lats:'Espalda',upper_back:'Espalda',traps:'Trapecios',lower_back:'Lumbar',chest:'Pecho',cardio:'Cardio',neck:'Cuello',full_body:'Cuerpo completo',other:'Otros'}
export const equipmentNames:Record<string,string>={none:'Sin material',barbell:'Barra',dumbbell:'Mancuernas',kettlebell:'Kettlebell',machine:'Máquina / polea',plate:'Disco',resistance_band:'Banda',suspension:'Suspensión',other:'Otro'}
const originals=workoutDays.flatMap(day=>day.exercises)
export const catalogById=new Map([...Object.values(originalCatalog).map(row=>({...row,type:'weight_reps',secondary_muscle_groups:[],is_custom:false})),...catalog].map(row=>[row.id,row]))
const additional:Exercise[]=catalog.filter(row=>!originals.some(item=>item.hevyId===row.id)).map(row=>{
 const timed=row.type.includes('duration'),distance=row.type==='short_distance_weight'
 return {id:`hevy-${row.id}`,hevyId:row.id,hevyName:row.title,name:guideById.get(row.id)?.name??row.title,muscle:muscleNames[row.primary_muscle_group]??'Otros',sets:timed||distance?1:2,reps:timed?[30,60]:distance?[10,20]:[8,12],unit:timed?'seconds':distance?'meters':'reps',rest:[60,90],rir:[2,3],technique:'Imagen y nombre del catálogo estándar de Hevy. Esta ficha no incluye instrucciones técnicas específicas: revisa la ejecución antes de usar un ejercicio nuevo.',progression:'Los parámetros de partida son editables y no proceden de una rutina de Hevy. Adáptalos a tu ejercicio y nivel.',alternatives:[]}
})
export const allExercises=[...originals,...additional]
export const exerciseLibrary=allExercises.filter((exercise,index)=>allExercises.findIndex(item=>item.hevyId===exercise.hevyId)===index)
export const exerciseById=new Map(allExercises.map(exercise=>[exercise.id,exercise]))
export const exerciseUnit=(exercise:Exercise)=>exercise.unit==='seconds'?'seg.':exercise.unit==='meters'?'m':'reps'
export const exerciseImage=(exercise:Exercise)=>catalogById.has(exercise.hevyId)&&!catalogById.get(exercise.hevyId)?.thumbnail_url?'./exercise-placeholder.svg':`./hevy/${exercise.hevyId}.jpg`
export const searchText=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es')

const exerciseByHevyId = new Map(exerciseLibrary.map(exercise => [exercise.hevyId, exercise]))
export function alternativeExercise(name:string) {
  const id = guideByName.get(name)?.id
  return id ? exerciseByHevyId.get(id) : undefined
}

const movementAliases: [RegExp, string][] = [
  [/squat/i, 'sentadilla'], [/deadlift/i, 'peso muerto'],
  [/lunge/i, 'zancada desplante'], [/hip thrust/i, 'empuje de cadera glúteos'], [/glute bridge/i, 'puente de glúteos'],
  [/bench press|chest press/i, 'press de banca pecho'], [/shoulder press|overhead press/i, 'press militar hombros'],
  [/leg press/i, 'prensa de piernas'], [/leg curl/i, 'curl femoral isquiotibiales'],
  [/leg extension/i, 'extensión de cuádriceps'], [/lateral raise/i, 'elevación lateral'],
  [/pulldown/i, 'jalón polea espalda'], [/row( |$)/i, 'remo'], [/pull[ -]?up|chin[ -]?up/i, 'dominada'],
  [/bicep curl|hammer curl|preacher curl/i, 'curl bíceps'], [/triceps/i, 'tríceps'],
  [/push[ -]?up/i, 'flexiones de brazos'], [/plank/i, 'plancha'], [/crunch/i, 'abdominales'],
  [/calf raise/i, 'elevación de talones gemelos'], [/kickback.*(glute)|glute kickback/i, 'patada de glúteo'],
]

const searchIndex = new Map(exerciseLibrary.map(exercise => {
  const equipment = catalogById.get(exercise.hevyId)?.equipment ?? ''
  const aliases = movementAliases.filter(([pattern]) => pattern.test(exercise.hevyName)).map(([,alias]) => alias)
  const description = [exercise.name, exercise.hevyName, exercise.muscle, equipmentNames[equipment],
    guideById.get(exercise.hevyId)?.name, ...aliases].filter(Boolean).join(' ')
  return [exercise.hevyId, searchText(description)]
}))

export function matchesExercise(exercise:Exercise, query:string) {
  const words = searchText(query).trim().split(/\s+/)
  const description = searchIndex.get(exercise.hevyId) ?? ''
  return words.every(word => description.includes(word))
}
