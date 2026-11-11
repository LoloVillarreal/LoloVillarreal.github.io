type Guide = {
  name: string
  id?: string
  instruction: string
  source: string
}

const hevy = 'https://www.hevyapp.com/exercises/'
const strengthLog = 'https://www.strengthlog.com/'

export const exerciseGuides: Guide[] = [
  {name:'Hip thrust en máquina', id:'68CE0B9B', instruction:'Ajusta el apoyo a la cadera, apoya la espalda y planta ambos pies. Extiende la cadera hasta alinear el tronco y los muslos. Haz una pausa y baja con control.', source:hevy+'how-to-hip-thrust/'},
  {name:'Peso muerto rumano con mancuernas', id:'72CFFAD5', instruction:'Sujeta las mancuernas delante de los muslos. Lleva la cadera atrás con las rodillas ligeramente flexionadas y las pesas cerca de las piernas. Extiende la cadera para volver de pie.', source:strengthLog+'romanian-deadlift/'},
  {name:'Zancadas hacia atrás', id:'C284D923', instruction:'Desde pie, da un paso atrás y flexiona ambas rodillas. Empuja el suelo con el pie delantero para volver a la posición inicial. Alterna los lados.', source:hevy+'reverse-lunge/'},
  {name:'Curl femoral sentado', id:'11A123F3', instruction:'Alinea las rodillas con el eje y ajusta el rodillo detrás de los tobillos. Flexiona las rodillas sin levantar la cadera del asiento y controla el regreso.', source:strengthLog+'seated-leg-curl/'},
  {name:'Abducción con banda', instruction:'Con la banda en el tobillo y un apoyo firme, separa la pierna hacia un lado manteniendo la pelvis nivelada. Vuelve despacio y cambia de pierna.', source:'https://www.mayoclinic.org/healthy-lifestyle/fitness/multimedia/standing-hip-abduction/vid-20084670'},
  {name:'Jalón con agarre neutro', instruction:'Sujeta el agarre con las palmas enfrentadas y estabiliza los muslos bajo el apoyo. Lleva los codos hacia abajo y el agarre hacia el pecho. Regresa despacio.', source:strengthLog+'neutral-close-grip-lat-pulldown/'},
  {name:'Remo sentado en cable', id:'0393F233', instruction:'Sujeta el agarre en V con los pies apoyados. Lleva los codos atrás y el agarre hacia el abdomen. Extiende los brazos de nuevo manteniendo el tronco estable.', source:strengthLog+'cable-close-grip-seated-row/'},
  {name:'Press con mancuernas', id:'3601968B', instruction:'Túmbate en un banco plano con los pies apoyados. Desde los lados del pecho, empuja las mancuernas hacia arriba con las muñecas alineadas. Baja despacio hasta una profundidad cómoda.', source:hevy+'bench-press-dumbbell/'},
  {name:'Elevación lateral en polea', id:'BE289E45', instruction:'De lado a una polea baja, toma el agarre con la mano más alejada. Levanta el brazo hacia fuera con el codo ligeramente flexionado y baja sin balancear el tronco.', source:strengthLog+'cable-lateral-raise/'},
  {name:'Crunch en máquina', id:'EB43ADD4', instruction:'Ajusta el asiento y el apoyo del pecho según el modelo. Acerca las costillas a la pelvis flexionando el tronco. Vuelve despacio y conserva los pies apoyados.', source:strengthLog+'machine-crunch/'},
  {name:'Plancha elevada', instruction:'Coloca las manos sobre un banco estable y camina hacia atrás hasta alinear hombros, cadera y tobillos. Mantén el abdomen activo mientras respiras. Acerca los pies para salir.', source:'https://www.nasm.org/resource-center/blog/training/the-plank-coaching-progressions-and-variations-for-every-client'},
  {name:'Sentadilla en multipower', id:'DDCC3821', instruction:'Ajusta los topes y apoya la barra sobre la parte alta de la espalda. Flexiona caderas y rodillas manteniendo los pies apoyados. Extiende las piernas y vuelve a asegurar la barra al acabar.', source:strengthLog+'smith-machine-squat/'},
  {name:'Split squat', id:'20C1A3CB', instruction:'Sujeta una mancuerna a cada lado y separa los pies en posición de zancada. Baja la rodilla trasera hacia el suelo y empuja con la pierna delantera. Mantén la posición de los pies durante la serie.', source:hevy+'dumbbell-split-squat/'},
  {name:'Extensión unilateral', id:'629AE73D', instruction:'Ajusta el asiento y alinea la rodilla con el eje. Con una pierna bajo el rodillo, extiende la rodilla y baja lentamente. Repite con la otra pierna.', source:strengthLog+'one-legged-leg-extension/'},
  {name:'Patada en máquina', id:'CBA02382', instruction:'Apoya el tronco en el soporte y coloca el pie en la plataforma. Empuja hacia atrás extendiendo la cadera. Mantén la pelvis orientada al frente al volver.', source:strengthLog+'machine-glute-kickbacks/'},
  {name:'Elevaciones de rodillas', id:'08590920', instruction:'Cuélgate de la barra con el cuerpo quieto. Flexiona las rodillas y acércalas hacia el abdomen. Baja con control antes de repetir.', source:strengthLog+'hanging-knee-raise/'},
  {name:'Crunch inverso', id:'7952B5CD', instruction:'Túmbate boca arriba con las rodillas flexionadas. Acerca la pelvis a las costillas elevándola ligeramente del suelo. Baja despacio sin lanzar las piernas.', source:'https://www.acefitness.org/resources/everyone/blog/5250/4-core-movements-for-beginners/'},
  {name:'Plancha lateral con rodilla apoyada', instruction:'De lado, apoya el antebrazo debajo del hombro y flexiona la rodilla inferior. Eleva la pelvis hasta alinear hombro y cadera. Baja despacio y cambia de lado.', source:'https://www.acefitness.org/resources/everyone/exercise-library/99/side-plank-modified/'},
  {name:'Rueda abdominal', id:'99D5F10E', instruction:'Desde las rodillas, sujeta la rueda bajo los hombros. Hazla rodar hacia delante hasta donde puedas controlar el tronco. Regresa sin hundir la espalda.', source:strengthLog+'ab-exercises/'},
  {name:'Extensión de espalda en banco', id:'4F5866F8', instruction:'Ajusta la almohadilla debajo de la cadera y fija los pies. Inclínate desde la cadera y vuelve hasta alinear el tronco con las piernas.', source:strengthLog+'back-extension/'},
  {name:'Bicho muerto', id:'D8911FC4', instruction:'Túmbate boca arriba con brazos y piernas elevados y las rodillas flexionadas. Alarga un brazo y la pierna contraria manteniendo estable el tronco. Recupera la posición y alterna.', source:strengthLog+'dead-bugs/'},
  {name:'Subida al banco', id:'128A2381', instruction:'Apoya un pie entero en una plataforma estable. Empuja con esa pierna para subir y desciende con control por el mismo lado. Cambia de pierna.', source:strengthLog+'step-up/'},
]

export const guideById = new Map(exerciseGuides.filter(g => g.id).map(g => [g.id!, g]))
export const guideByName = new Map(exerciseGuides.map(g => [g.name, g]))
