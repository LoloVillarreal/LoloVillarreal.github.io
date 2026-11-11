import type { BarShape } from '../BarbellDrawing'

type Barbell = {
  id: string
  name: string
  shape: BarShape
  kg: number | null
}

// Las masas de barras especiales corresponden al modelo citado. La etiqueta del equipo tiene prioridad.
export const barbells: readonly Barbell[] = [
  // IWF, barras de competición: https://iwf.sport/weightlifting_/equipment/
  { id: 'olympic-20', name: 'Olímpica 20 kg', shape: 'straight', kg: 20 },
  { id: 'olympic-15', name: 'Olímpica 15 kg', shape: 'straight', kg: 15 },
  // Eleiko Curl Bar: https://eleiko.com/en/equipment/bars/specialty/3085980-eleiko-curl-bar-50-mm-12-kg
  { id: 'ez', name: 'Curva Z', shape: 'ez', kg: 12 },
  // Mirafit Olympic Trap Bar: https://mirafit.co.uk/weights-and-bars/bars/trap-bars.html
  { id: 'trap', name: 'Hexagonal', shape: 'trap', kg: 25 },
  // La resistencia inicial depende de la máquina: https://www.lifefitness.com/en-eu/catalog/strength-training/benches/smith-machine
  { id: 'smith', name: 'Multipower / Smith', shape: 'smith', kg: null },
  // Mirafit de 120 cm, peso aproximado: https://mirafit.co.uk/mirafit-2-olympic-barbell-weight-bar-4ft-5ft-6ft-7ft.html
  { id: 'short', name: 'Recta corta', shape: 'short', kg: 8.4 },
  // Eleiko Technique Bar: https://eleiko.com/en/stories/multi-purpose-bars
  { id: 'technique', name: 'De técnica', shape: 'straight', kg: 10 },
  // Eleiko IPF Powerlifting Competition Bar: https://education.eleiko.com/en/pc/barbells/1
  { id: 'power', name: 'Powerlifting', shape: 'straight', kg: 20 },
  // Strength Shop Bastard Deadlift Bar: https://strengthshop.eu/products/bastard-deadlift-bar
  { id: 'deadlift', name: 'De peso muerto', shape: 'straight', kg: 20 },
  // Eleiko Öppen, 3085748-03: https://media.eleiko.com/admin/download-product-sheet.aspx?articlecode=3085748-03&language=en-gb
  { id: 'open-trap', name: 'Hexagonal abierta', shape: 'open-trap', kg: 25 },
  // Strength Shop Olympic Tricep Bar: https://strengthshop.eu/products/olympic-tricep-bar-black-zinc-plated
  { id: 'triceps', name: 'De tríceps', shape: 'triceps', kg: 9 },
  // Strength Shop Olympic Swiss Bar: https://strengthshop.eu/products/olympic-swiss-bar
  { id: 'multi', name: 'Suiza multiagarre', shape: 'multi', kg: 15.5 },
  // Strength Shop Riot: https://strengthshop.eu/blogs/news/the-safety-squat-bar-a-bestseller-for-a-reason
  { id: 'safety', name: 'Safety de sentadilla', shape: 'safety', kg: 20.9 },
  // Strength Shop Olympic Cambered Bar: https://strengthshop.eu/products/olympic-cambered-bar-25kg
  { id: 'cambered', name: 'Curvada de sentadilla', shape: 'cambered', kg: 25 },
  // Strength Shop Axle Bar: https://strengthshop.eu/blogs/news/axle-bar-training-grip-strength-thick-bar-work-strongman-practice
  { id: 'axle', name: 'Axle de agarre grueso', shape: 'axle', kg: 20 },
  { id: 'custom', name: 'Otra barra', shape: 'custom', kg: null },
]
