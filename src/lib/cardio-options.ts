const labels: Record<string, string> = {
  Aerobics: 'Aeróbic', 'Air Bike': 'Bicicleta de aire', 'Battle Ropes': 'Cuerdas de entrenamiento',
  Boxing: 'Boxeo', Climbing: 'Escalada', Cycling: 'Ciclismo', 'Elliptical Trainer': 'Entrenador elíptico',
  HIIT: 'Intervalos de alta intensidad', Hiking: 'Senderismo', 'Jump Rope': 'Saltar a la comba',
  'Rowing Machine': 'Remo en máquina', Running: 'Correr', Skating: 'Patinaje', 'Ski Erg': 'Ergómetro de esquí',
  Skiing: 'Esquí', Snowboarding: 'Snowboard', Spinning: 'Spinning', Sprints: 'Esprints',
  'Stair Machine (Floors)': 'Escaladora por pisos', 'Stair Machine (Steps)': 'Escaladora por pasos',
  Swimming: 'Natación', Treadmill: 'Cinta de correr', Walking: 'Caminar'
}
export const cardioLabel = (activity:string) => labels[activity] ?? activity
