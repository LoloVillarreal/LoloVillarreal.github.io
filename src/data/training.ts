import type { Exercise, WorkoutDay } from '../types'

const ex = (value: Exercise) => value

export const workoutDays: WorkoutDay[] = [
  {
    day: 1, label: 'Lunes', title: 'Glúteos y femorales', objective: 'Estimular glúteo mayor e isquiotibiales.', type: 'strength', exercises: [
      ex({ id:'hip-thrust', name:'Hip thrust con barra', hevyName:'Hip Thrust (Barbell)', hevyId:'D57C2EC7', muscle:'Glúteos', sets:3, reps:[8,12], rest:[150,150], rir:[2,2], technique:'Espalda superior apoyada en un banco estable, abdomen firme, extensión de cadera controlada y pausa breve arriba.', avoid:'Evita hiperextender la zona lumbar.', progression:'Sube una cantidad pequeña de carga cuando completes 3 × 12 con técnica consistente y RIR 2.', alternatives:['Hip thrust en máquina'] }),
      ex({ id:'rdl', name:'Peso muerto rumano con barra', hevyName:'Romanian Deadlift (Barbell)', hevyId:'2B4B7310', muscle:'Femoral', sets:3, reps:[8,10], rest:[150,150], rir:[2,2], technique:'Rodillas ligeramente flexionadas, cadera hacia atrás, barra cerca de las piernas y espalda neutra.', avoid:'No redondees la espalda ni bajes más allá de tu movilidad.', alternatives:['Peso muerto rumano con mancuernas'] }),
      ex({ id:'bulgarian', name:'Sentadilla búlgara con mancuernas', hevyName:'Bulgarian Split Squat (Dumbbell)', hevyId:'B5D3A742', muscle:'Glúteos', sets:2, reps:[8,12], perSide:true, rest:[120,120], rir:[2,2], technique:'Apoyo estable, recorrido cómodo y rodilla alineada con el pie.', alternatives:['Zancadas hacia atrás'] }),
      ex({ id:'lying-curl', name:'Curl femoral tumbado', hevyName:'Lying Leg Curl (Machine)', hevyId:'B8127AD1', muscle:'Femoral', sets:2, reps:[10,15], rest:[90,90], rir:[1,2], technique:'Movimiento controlado manteniendo la cadera apoyada.', avoid:'No levantes la cadera para terminar la repetición.', alternatives:['Curl femoral sentado'] }),
      ex({ id:'abduction-mon', name:'Abducción de cadera en máquina', hevyName:'Hip Abduction (Machine)', hevyId:'F4B4C6EE', muscle:'Glúteos', sets:2, reps:[15,20], rest:[75,75], rir:[1,2], technique:'Mantén el tronco estable y controla la fase de retorno.', avoid:'Evita balancearte.', alternatives:['Abducción con banda'] }),
    ]
  },
  {
    day: 2, label:'Martes', title:'Tren superior y abdomen', objective:'Mantener un desarrollo equilibrado y fortalecer el core.', type:'strength', exercises:[
      ex({ id:'pulldown', name:'Jalón al pecho', hevyName:'Lat Pulldown (Cable)', hevyId:'6A6C31A5', muscle:'Espalda', sets:3, reps:[8,12], rest:[90,120], rir:[2,2], technique:'Lleva la barra hacia la parte superior del pecho sin impulsos.', alternatives:['Jalón con agarre neutro'] }),
      ex({ id:'seated-row', name:'Remo sentado en máquina', hevyName:'Seated Row (Machine)', hevyId:'1DF4A847', muscle:'Espalda', sets:3, reps:[8,12], rest:[90,120], rir:[2,2], technique:'Tira con los codos sin balancear el tronco.', alternatives:['Remo sentado en cable'] }),
      ex({ id:'chest-press', name:'Press de pecho en máquina', hevyName:'Chest Press (Machine)', hevyId:'7EB3F7C3', muscle:'Pecho', sets:3, reps:[8,12], rest:[90,120], rir:[2,2], technique:'Escápulas apoyadas, muñecas neutras y recorrido controlado.', alternatives:['Press con mancuernas'] }),
      ex({ id:'lateral-raise', name:'Elevaciones laterales con mancuernas', hevyName:'Lateral Raise (Dumbbell)', hevyId:'422B08F1', muscle:'Hombros', sets:2, reps:[12,20], rest:[60,75], rir:[1,2], technique:'Eleva sin impulso hasta un recorrido cómodo.', alternatives:['Elevación lateral en polea'] }),
      ex({ id:'cable-crunch-tue', name:'Crunch en polea', hevyName:'Cable Crunch', hevyId:'23A48484', muscle:'Core', sets:3, reps:[10,15], rest:[60,75], rir:[1,2], technique:'Flexiona el tronco de forma controlada.', avoid:'No tires solo con los brazos.', alternatives:['Crunch en máquina'] }),
      ex({ id:'plank', name:'Plancha', hevyName:'Plank', hevyId:'C6C9B8A0', muscle:'Core', sets:2, reps:[30,45], unit:'seconds', rest:[60,60], rir:[2,2], technique:'Mantén pelvis y caja torácica controladas mientras respiras con normalidad.', alternatives:['Plancha elevada'] }),
    ]
  },
  { day:3, label:'Miércoles', title:'Cardio habitual', objective:'25–45 minutos a intensidad moderada y ajustable. Sin pesas.', type:'cardio', exercises:[] },
  {
    day:4, label:'Jueves', title:'Glúteos y cuádriceps', objective:'Segundo estímulo principal de tren inferior.', type:'strength', exercises:[
      ex({ id:'leg-press', name:'Prensa de piernas', hevyName:'Leg Press (Machine)', hevyId:'C7973E0E', muscle:'Cuádriceps', sets:3, reps:[8,12], rest:[150,150], rir:[2,2], technique:'Usa un recorrido controlado con la pelvis estable.', alternatives:['Sentadilla en multipower'] }),
      ex({ id:'hip-thrust-thu', name:'Hip thrust con barra', hevyName:'Hip Thrust (Barbell)', hevyId:'D57C2EC7', muscle:'Glúteos', sets:3, reps:[10,12], rest:[150,150], rir:[2,2], technique:'Espalda superior apoyada, abdomen firme y pausa arriba.', avoid:'Evita hiperextender la zona lumbar.', progression:'Sube una cantidad pequeña cuando completes 3 × 12 con técnica consistente y RIR 2.', alternatives:['Hip thrust en máquina'] }),
      ex({ id:'reverse-lunge', name:'Zancada hacia atrás con mancuernas', hevyName:'Reverse Lunge (Dumbbell)', hevyId:'FFDA283B', muscle:'Glúteos', sets:2, reps:[10,12], perSide:true, rest:[90,120], rir:[2,2], technique:'Da un paso estable hacia atrás y controla la bajada.', alternatives:['Split squat'] }),
      ex({ id:'leg-extension', name:'Extensión de cuádriceps', hevyName:'Leg Extension (Machine)', hevyId:'75A4F6C4', muscle:'Cuádriceps', sets:2, reps:[12,15], rest:[90,90], rir:[1,2], technique:'Controla la subida y la bajada sin despegar la cadera.', alternatives:['Extensión unilateral'] }),
      ex({ id:'abduction-thu', name:'Abducción de cadera en máquina', hevyName:'Hip Abduction (Machine)', hevyId:'F4B4C6EE', muscle:'Glúteos', sets:2, reps:[15,20], rest:[75,75], rir:[1,2], technique:'Mantén el tronco estable y controla el retorno.', alternatives:['Abducción con banda'] }),
    ]
  },
  {
    day:5, label:'Viernes', title:'Glúteos complementarios y abdomen', objective:'Sesión ligera y opcional si existe fatiga acumulada.', optional:true, type:'strength', exercises:[
      ex({ id:'kickback', name:'Patada de glúteo en polea', hevyName:'Standing Cable Glute Kickbacks', hevyId:'ACB2751D', muscle:'Glúteos', sets:2, reps:[12,15], perSide:true, rest:[60,75], rir:[2,2], technique:'Mueve la cadera sin arquear la zona lumbar.', alternatives:['Patada en máquina'] }),
      ex({ id:'abduction-fri', name:'Abducción de cadera en máquina', hevyName:'Hip Abduction (Machine)', hevyId:'F4B4C6EE', muscle:'Glúteos', sets:2, reps:[15,20], rest:[60,75], rir:[1,2], technique:'Mantén el tronco estable y controla el retorno.', alternatives:['Abducción con banda'] }),
      ex({ id:'hanging-leg-raise', name:'Elevación de piernas colgada', hevyName:'Hanging Leg Raise', hevyId:'F8356514', muscle:'Core', sets:2, reps:[8,12], rest:[75,75], rir:[1,2], technique:'Eleva con el abdomen y controla la bajada.', avoid:'Evita los balanceos.', alternatives:['Elevaciones de rodillas','Crunch inverso'] }),
      ex({ id:'cable-crunch-fri', name:'Crunch en polea', hevyName:'Cable Crunch', hevyId:'23A48484', muscle:'Core', sets:2, reps:[12,15], rest:[60,75], rir:[1,2], technique:'Flexiona el tronco de forma controlada.', alternatives:['Crunch en máquina'] }),
      ex({ id:'side-plank', name:'Plancha lateral', hevyName:'Side Plank', hevyId:'E3EDA509', muscle:'Core', sets:2, reps:[20,40], unit:'seconds', perSide:true, rest:[45,60], rir:[2,2], technique:'Mantén hombro, cadera y tobillo alineados.', alternatives:['Plancha lateral con rodilla apoyada'] }),
    ]
  },
  { day:6, label:'Sábado', title:'Recuperación', objective:'Caminata o movilidad opcionales, sin objetivos rígidos.', type:'recovery', exercises:[] },
  { day:0, label:'Domingo', title:'Descanso', objective:'Prioriza descanso y recuperación.', type:'recovery', exercises:[] },
]

export const twelveWeekPlan = [
  { weeks:'1–2', name:'Aterrizaje', guidance:'Usa el extremo conservador del esfuerzo y deja 2–3 RIR mientras afinas la técnica.' },
  { weeks:'3–4', name:'Base', guidance:'Suma repeticiones dentro del rango sin forzar el fallo.' },
  { weeks:'5–7', name:'Progresión', guidance:'Cuando completes el rango alto con el RIR previsto, sube la carga mínima disponible.' },
  { weeks:'8', name:'Descarga opcional', guidance:'Si la fatiga es alta, reduce 30–40 % las series o la carga durante una semana.' },
  { weeks:'9–11', name:'Consolidación', guidance:'Retoma desde una carga manejable y vuelve a progresar con calma.' },
  { weeks:'12', name:'Revisión', guidance:'Consolida marcas, revisa molestias y compara tendencia, no un único día.' },
]

export const hevyExport = () => ({
  schema: 'glute-core/hevy-compatible-v1',
  warning: 'Archivo de compatibilidad manual. No implica sincronización ni uso de una API de Hevy.',
  workouts: workoutDays.filter(d => d.type === 'strength').map(day => ({
    title: `${day.label} — ${day.title}`,
    exercises: day.exercises.map(e => ({ template_id: e.hevyId, exercise_name: e.hevyName, sets: e.sets, rep_range: e.reps, rest_seconds: e.rest[1], rir: e.rir[1] }))
  }))
})
