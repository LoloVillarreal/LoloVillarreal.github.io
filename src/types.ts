export type NavSection = 'home' | 'training' | 'nutrition' | 'progress' | 'more'

export type Exercise = {
  id: string
  name: string
  hevyName: string
  hevyId: string
  muscle: string
  sets: number
  reps: [number, number]
  unit?: 'reps' | 'seconds'
  perSide?: boolean
  rest: [number, number]
  rir: [number, number]
  technique: string
  avoid?: string
  progression?: string
  alternatives: string[]
}

export type WorkoutDay = {
  day: number
  label: string
  title: string
  objective: string
  optional?: boolean
  type: 'strength' | 'cardio' | 'recovery'
  exercises: Exercise[]
}

export type SetLog = {
  set: number
  kind: 'warmup' | 'working'
  weight?: number
  reps?: number
  seconds?: number
  rir?: number
  done: boolean
}

export type WorkoutLog = {
  id: string
  date: string
  workoutDay: number
  workoutTitle: string
  exerciseId: string
  exerciseName: string
  sets: SetLog[]
  notes: string
  fatigue?: number
  discomfort?: string
  completed: boolean
}

export type CardioLog = {
  id: string
  date: string
  modality: 'Caminata' | 'Bicicleta' | 'Elíptica' | 'Carrera' | 'Otro'
  duration: number
  distance?: number
  rpe: number
  notes: string
}

export type ProgressLog = {
  id: string
  date: string
  weight?: number
  waist?: number
  hip?: number
  energy?: number
  sleep?: number
  notes: string
  photo?: string
  hipThrustKg?: number
  hipThrustReps?: number
}

export type Food = {
  id: string
  name: string
  unit: 'g' | 'unit'
  gramsPerUnit?: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  source: string
  tags?: ('vegetarian' | 'lactose-free' | 'gluten-free')[]
}

export type MealIngredient = { foodId: string; amount: number; label?: string }
export type Meal = { id: string; name: string; ingredients: MealIngredient[]; alternatives?: string[] }
export type MenuDay = { day: number; name: string; meals: Meal[] }

export type AppSettings = {
  darkMode: boolean
  theme?: 'light' | 'dark' | 'glass'
  hideSensitive: boolean
  startDate: string
  calorieTarget: number
  proteinTarget: number
  fatTarget: number
  carbTarget: number
}

export type Backup = {
  schemaVersion: 1 | 2
  exportedAt: string
  workoutLogs: WorkoutLog[]
  cardioLogs: CardioLog[]
  progressLogs: ProgressLog[]
  mealChecks: Record<string, boolean>
  settings: AppSettings
  localState?: Record<string, unknown>
}

export type ProgressDraft = { id:string; date:string; weight:string; waist:string; hip:string; hipThrustKg:string; hipThrustReps:string; energy:number|''; sleep:string; notes:string; photo:string }
export type CalculatorProfile = { age:string; height:string; weight:string; activity:number; sex:'female'|'male'; calories:string; protein:string; fat:string }
